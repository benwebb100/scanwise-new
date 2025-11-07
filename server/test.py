# test_api.py
import requests
import json
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

# Step 1: Sign in to get token
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_ANON_KEY")
)

print("1. Signing in...")
auth_response = supabase.auth.sign_in_with_password({
    "email": "test@example.com",
    "password": "TestPassword123!"
})

token = auth_response.session.access_token
print(f"✓ Got token: {token[:20]}...")

# Step 2: Test analyze endpoint
api_url = "http://localhost:8000/api/v1/analyze-xray"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Replace with your actual image URL from Supabase Storage
image_url = f"{os.getenv('SUPABASE_URL')}/storage/v1/object/public/xray-images/test_xray.jpg"

payload = {
    "patient_name": "John Doe",
    "image_url": image_url,
    "findings": [
        {"tooth": "16", "condition": "Caries", "treatment": "Filling"},
        {"tooth": "46", "condition": "Root Piece", "treatment": "Extraction"}
    ]
}

print("\n2. Calling analyze endpoint...")
response = requests.post(api_url, json=payload, headers=headers)

if response.status_code == 200:
    result = response.json()
    print("\n✓ Analysis successful!")
    print(json.dumps(result, indent=2))
else:
    print(f"\n✗ Error: {response.status_code}")
    print(response.text)