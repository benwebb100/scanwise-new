import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional
import logging

load_dotenv()

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.anon_key = os.getenv("SUPABASE_ANON_KEY")
        
        if not self.url or not self.anon_key:
            raise ValueError("Supabase URL and Anon Key must be set in environment variables")
        
        # Use anon key - Supabase will handle auth via JWT
        self.client: Client = create_client(self.url, self.anon_key)
    
    def _create_authenticated_client(self, access_token: str) -> Client:
        """Create a Supabase client with custom auth headers"""
        from supabase.lib.client_options import ClientOptions
        
        options = ClientOptions()
        options.headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        return create_client(self.url, self.anon_key, options)
    
    async def upload_image(self, file_data: bytes, file_path: str, access_token: str, bucket: str = "xray-images") -> Optional[str]:
        """Upload image to Supabase Storage and return public URL"""
        try:
            # Create authenticated client with proper headers
            auth_client = self._create_authenticated_client(access_token)
            
            # Upload file to storage using authenticated client
            response = auth_client.storage.from_(bucket).upload(
                file_path,
                file_data,
                file_options={"content-type": "image/jpeg", "upsert": "true"}
            )
            
            # Get public URL (can use regular client for this)
            public_url = self.client.storage.from_(bucket).get_public_url(file_path)
            
            logger.info(f"Successfully uploaded image: {file_path}")
            return public_url
            
        except Exception as e:
            logger.error(f"Error uploading image: {str(e)}")
            return None
    
    async def save_diagnosis(self, diagnosis_data: dict, access_token: str) -> dict:
        """Save diagnosis data to Supabase database with user's token"""
        try:
            # Create authenticated client with proper headers
            auth_client = self._create_authenticated_client(access_token)
            
            # Insert data - Supabase RLS will automatically handle user_id
            response = auth_client.table('patient_diagnosis').insert({
                'patient_name': diagnosis_data['patient_name'],
                'image_url': diagnosis_data['image_url'],
                'annotated_image_url': diagnosis_data['annotated_image_url'],
                'summary': diagnosis_data['summary'],
                'ai_notes': diagnosis_data['ai_notes'],
                'treatment_stages': diagnosis_data['treatment_stages']  # JSONB field
            }).execute()
            
            logger.info(f"Successfully saved diagnosis for patient: {diagnosis_data['patient_name']}")
            return response.data[0] if response.data else {}
            
        except Exception as e:
            logger.error(f"Error saving diagnosis: {str(e)}")
            raise

# Create singleton instance
supabase_service = SupabaseService()