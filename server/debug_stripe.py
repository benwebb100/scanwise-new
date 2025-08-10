#!/usr/bin/env python3
"""
Quick script to test Stripe configuration and see what URLs are being generated
"""
import os
from dotenv import load_dotenv
import stripe

load_dotenv()

# Check environment variables
print("🔍 STRIPE CONFIGURATION CHECK")
print("=" * 50)

stripe_key = os.getenv("STRIPE_SECRET_KEY")
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
price_monthly = os.getenv("STRIPE_PRICE_ID_MONTHLY")
price_yearly = os.getenv("STRIPE_PRICE_ID_YEARLY")
product_id = os.getenv("STRIPE_PRODUCT_ID")

print(f"✅ STRIPE_SECRET_KEY: {'SET' if stripe_key else '❌ MISSING'}")
print(f"🌐 FRONTEND_URL: {frontend_url}")
print(f"💰 STRIPE_PRICE_ID_MONTHLY: {price_monthly or '❌ MISSING'}")
print(f"💰 STRIPE_PRICE_ID_YEARLY: {price_yearly or '❌ MISSING'}")
print(f"📦 STRIPE_PRODUCT_ID: {product_id or '❌ MISSING'}")

print("\n" + "=" * 50)

if stripe_key:
    stripe.api_key = stripe_key
    print("🧪 TESTING STRIPE CONNECTION...")
    
    try:
        # Test API connection
        account = stripe.Account.retrieve()
        print(f"✅ Connected to Stripe account: {account.display_name}")
        
        # Test what checkout URLs would be generated
        print(f"\n📍 REDIRECT URLS THAT WOULD BE USED:")
        print(f"   Success: {frontend_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}")
        print(f"   Cancel:  {frontend_url}/billing/canceled")
        
        # Check if prices exist
        if price_monthly:
            try:
                price = stripe.Price.retrieve(price_monthly)
                print(f"✅ Monthly price exists: {price.unit_amount/100} {price.currency}")
            except Exception as e:
                print(f"❌ Monthly price error: {e}")
        
        if product_id:
            try:
                prices = stripe.Price.list(product=product_id, active=True)
                print(f"✅ Found {len(prices.data)} active prices for product {product_id}")
                for p in prices.data:
                    interval = p.recurring.interval if p.recurring else "one-time"
                    print(f"   - {p.id}: {p.unit_amount/100} {p.currency} ({interval})")
            except Exception as e:
                print(f"❌ Product prices error: {e}")
                
    except Exception as e:
        print(f"❌ Stripe connection failed: {e}")
else:
    print("❌ Cannot test - STRIPE_SECRET_KEY not set")

print("\n" + "=" * 50)
print("🔧 TO FIX REDIRECT ISSUES:")
print("   1. Set FRONTEND_URL to your actual domain")
print("   2. Ensure STRIPE_PRICE_ID_MONTHLY is set")
print("   3. Test payment flow again")
