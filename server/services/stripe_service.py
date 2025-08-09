import os
import logging
import json
from typing import Optional

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

    def create_billing_portal(self, customer_id: str) -> str:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{self.frontend_url}/settings",
        )
        return session.url

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
                    user_id = metadata.get("user_id")
                    customer_id = data_object.get("customer")
                    status = "active"
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

stripe_service = StripeService()

