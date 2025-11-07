# get_token_for_postman.py
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_ANON_KEY")
)

# Sign in
auth_response = supabase.auth.sign_in_with_password({
    "email": "test@example.com",
    "password": "TestPassword123!"
})

print("\n=== COPY THIS TOKEN TO POSTMAN ===")
print(auth_response.session.access_token)
print("\n=== USER ID ===")
print(auth_response.user.id)