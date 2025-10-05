import os
import logging
import json
import base64
from typing import Optional, Dict, Any

import stripe
import jwt

from services.supabase import supabase_service

logger = logging.getLogger(__name__)

class StripeService:
    def __init__(self) -> None:
        self.secret_key = os.getenv("STRIPE_SECRET_KEY")
        if not self.secret_key:
            raise ValueError("STRIPE_SECRET_KEY must be set")
        stripe.api_key = self.secret_key

        self.price_monthly = os.getenv("STRIPE_PRICE_ID_MONTHLY")  # optional
        self.price_yearly = os.getenv("STRIPE_PRICE_ID_YEARLY")    # optional
        self.product_id = os.getenv("STRIPE_PRODUCT_ID")           # optional, we'll fetch a price if set
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    def _get_user_id_from_token(self, access_token: str) -> Optional[str]:
        try:
            decoded = jwt.decode(access_token, options={"verify_signature": False})
            return decoded.get("sub")
        except Exception as e:
            logger.error(f"Failed to decode JWT for user id: {e}")
            return None

    def _resolve_price_id(self, interval: str) -> Optional[str]:
        # Prefer explicit env price ids
        if interval == "monthly" and self.price_monthly:
            return self.price_monthly
        if interval == "yearly" and self.price_yearly:
            return self.price_yearly

        # Fallback: fetch first active recurring price for the configured product
        if self.product_id:
            prices = stripe.Price.list(product=self.product_id, active=True, expand=["data.product"], limit=100)
            # Try to match requested interval first
            for p in prices.data:
                if p.get("recurring") and p["recurring"].get("interval") == ("month" if interval == "monthly" else "year"):
                    return p.id
            # Otherwise any recurring price
            for p in prices.data:
                if p.get("recurring"):
                    return p.id
        return None

    def create_checkout_session(self, access_token: str, interval: str = "monthly") -> str:
        user_id = self._get_user_id_from_token(access_token)
        if not user_id:
            raise ValueError("Unable to resolve user id from token")

        price_id = self._resolve_price_id(interval)
        if not price_id:
            raise ValueError("Stripe price id not configured. Provide STRIPE_PRICE_ID_MONTHLY/STRIPE_PRICE_ID_YEARLY or STRIPE_PRODUCT_ID with active recurring prices.")

        session = stripe.checkout.Session.create(
            mode="subscription",
            success_url=f"{self.frontend_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{self.frontend_url}/billing/canceled",
            line_items=[{"price": price_id, "quantity": 1}],
            metadata={"user_id": user_id},
            subscription_data={"metadata": {"user_id": user_id}},
            allow_promotion_codes=True,
        )
        return session.url

    def create_registration_checkout(self, user_data: dict, interval: str = "monthly") -> str:
        """Create checkout session for new user registration (before account creation)"""
        price_id = self._resolve_price_id(interval)
        if not price_id:
            raise ValueError("Stripe price id not configured. Provide STRIPE_PRICE_ID_MONTHLY/STRIPE_PRICE_ID_YEARLY or STRIPE_PRODUCT_ID with active recurring prices.")

        # Store user data in metadata to be processed after payment
        session = stripe.checkout.Session.create(
            mode="subscription",
            success_url=f"{self.frontend_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{self.frontend_url}/billing/canceled",
            line_items=[{"price": price_id, "quantity": 1}],
            metadata={
                "registration_pending": "true",
                "registration_id": user_data.get('registration_id', ''),
                "user_email": user_data.get('email', ''),
                "user_name": user_data.get('name', ''),
                "clinic_name": user_data.get('clinicName', ''),
                "clinic_website": user_data.get('clinicWebsite', ''),
                "country": user_data.get('country', '')
            },
            subscription_data={"metadata": {
                "registration_pending": "true",
                "registration_id": user_data.get('registration_id', ''),
                "user_email": user_data.get('email', ''),
                "user_name": user_data.get('name', ''),
                "clinic_name": user_data.get('clinicName', ''),
                "clinic_website": user_data.get('clinicWebsite', ''),
                "country": user_data.get('country', '')
            }},
            allow_promotion_codes=True,
        )
        return session.url

    def create_billing_portal(self, customer_id: str) -> str:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{self.frontend_url}/settings",
        )
        return session.url

    def create_registration_checkout_session(self, user_data: Dict[str, Any], interval: str = "monthly") -> str:
        """Create a checkout session for new user registration (payment first)"""
        price_id = self._resolve_price_id(interval)
        if not price_id:
            raise ValueError("Stripe price id not configured. Provide STRIPE_PRICE_ID_MONTHLY/STRIPE_PRICE_ID_YEARLY or STRIPE_PRODUCT_ID with active recurring prices.")

        # Encode user data in base64 to store in metadata
        user_data_encoded = base64.b64encode(json.dumps(user_data).encode()).decode()
        
        session = stripe.checkout.Session.create(
            mode="subscription",
            success_url=f"{self.frontend_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{self.frontend_url}/billing/canceled",
            line_items=[{"price": price_id, "quantity": 1}],
            metadata={
                "registration_data": user_data_encoded,
                "is_registration": "true"
            },
            subscription_data={
                "metadata": {
                    "registration_data": user_data_encoded,
                    "is_registration": "true"
                }
            },
            allow_promotion_codes=True,
        )
        return session.url

    def verify_payment_session(self, session_id: str, access_token: str) -> dict:
        """Verify that a payment session was completed successfully"""
        try:
            # Get user ID from token
            user_id = self._get_user_id_from_token(access_token)
            if not user_id:
                return {"success": False, "error": "Invalid token"}

            # Retrieve the session from Stripe
            session = stripe.checkout.Session.retrieve(session_id)
            
            # Check if the session belongs to this user
            session_user_id = session.metadata.get('user_id')
            if session_user_id != user_id:
                return {"success": False, "error": "Session does not belong to user"}
            
            # Check if payment was successful
            if session.payment_status == 'paid':
                # Check if subscription was created
                if session.subscription:
                    subscription = stripe.Subscription.retrieve(session.subscription)
                    return {
                        "success": True,
                        "session": {
                            "id": session.id,
                            "payment_status": session.payment_status,
                            "subscription_id": session.subscription,
                            "subscription_status": subscription.status,
                            "customer_id": session.customer
                        }
                    }
                else:
                    return {"success": False, "error": "No subscription created"}
            else:
                return {"success": False, "error": f"Payment not completed: {session.payment_status}"}
                
        except stripe.error.StripeError as e:
            logger.error(f"Stripe API error during verification: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error during payment verification: {e}")
            return {"success": False, "error": "Verification failed"}

    def _handle_registration_webhook(self, session_data: Dict[str, Any]) -> Optional[str]:
        """Handle registration webhook - create user account after successful payment"""
        try:
            metadata = session_data.get("metadata", {})
            registration_data_encoded = metadata.get("registration_data")
            
            if not registration_data_encoded:
                logger.error("No registration data found in session metadata")
                return None
            
            # Decode user data
            user_data = json.loads(base64.b64decode(registration_data_encoded).decode())
            
            # Create user account with Supabase
            auth_client = supabase_service.client
            
            # Sign up the user
            signup_response = auth_client.auth.sign_up({
                "email": user_data.get("email"),
                "password": user_data.get("password"),
                "options": {
                    "data": {
                        "name": user_data.get("name"),
                        "clinic_name": user_data.get("clinicName"),
                        "clinic_website": user_data.get("clinicWebsite", ""),
                        "country": user_data.get("country"),
                    }
                }
            })
            
            if signup_response.user:
                user_id = signup_response.user.id
                logger.info(f"Successfully created user account {user_id} after payment")
                
                # Optionally save clinic branding
                try:
                    # This could be called via API if needed
                    pass
                except Exception as e:
                    logger.warning(f"Failed to save clinic branding for {user_id}: {e}")
                
                return user_id
            else:
                logger.error(f"Failed to create user account: {signup_response}")
                return None
                
        except Exception as e:
            logger.error(f"Error handling registration webhook: {e}")
            return None

    def handle_webhook(self, payload: bytes, sig_header: str) -> str:
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        event = None

        try:
            if webhook_secret:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, webhook_secret
                )
            else:
                event = json.loads(payload.decode("utf-8"))
        except Exception as e:
            logger.error(f"Webhook verification failed: {e}")
            raise

        event_type = event.get("type")
        data_object = event.get("data", {}).get("object", {})

        if event_type in ("checkout.session.completed", "customer.subscription.updated", "customer.subscription.deleted"):
            try:
                if event_type == "checkout.session.completed":
                    metadata = data_object.get("metadata", {}) or {}
                    customer_id = data_object.get("customer")
                    status = "active"
                    
                    # Check if this is a registration session
                    if metadata.get("is_registration") == "true":
                        # Handle new user registration
                        user_id = self._handle_registration_webhook(data_object)
                    else:
                        # Handle existing user subscription
                        user_id = metadata.get("user_id")
                else:
                    user_id = (data_object.get("metadata") or {}).get("user_id")
                    customer_id = data_object.get("customer")
                    status = data_object.get("status", "active")

                if not user_id:
                    user_id = (data_object.get("metadata") or {}).get("userId")

                if user_id:
                    auth_client = supabase_service.client
                    auth_client.table("subscriptions").upsert({
                        "user_id": user_id,
                        "stripe_customer_id": customer_id,
                        "status": status
                    }, on_conflict="user_id").execute()
                    plan = "pro" if status in ("active", "trialing") else "free"
                    auth_client.table("profiles").upsert({
                        "user_id": user_id,
                        "plan": plan,
                        "status": status
                    }, on_conflict="user_id").execute()
            except Exception as e:
                logger.error(f"Failed to persist subscription state: {e}")
                raise

        return "ok"

# Initialize service lazily to avoid import-time errors
_stripe_service = None

def get_stripe_service():
    global _stripe_service
    if _stripe_service is None:
        try:
            _stripe_service = StripeService()
        except Exception as e:
            logger.error(f"Failed to initialize Stripe service: {e}")
            return None
    return _stripe_service

# For backward compatibility
stripe_service = get_stripe_service()

