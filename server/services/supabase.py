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
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY")  # optional, server-side only
        
        if not self.url or not self.anon_key:
            raise ValueError("Supabase URL and Anon Key must be set in environment variables")
        
        self.client: Client = create_client(self.url, self.anon_key)
        self.service_client: Optional[Client] = None
        if self.service_key:
            try:
                self.service_client = create_client(self.url, self.service_key)
            except Exception as e:
                logger.warning(f"Failed to initialize service client: {e}")
    
    def get_service_client(self) -> Client:
        """Prefer service client if available; otherwise fall back to anon client."""
        return self.service_client or self.client
    
    def _create_authenticated_client(self, access_token: str) -> Client:
        from supabase.lib.client_options import ClientOptions
        
        options = ClientOptions()
        options.headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        return create_client(self.url, self.anon_key, options)
    
    def ensure_schema(self) -> None:
        try:
            try:
                self.client.table("profiles").select("*").limit(1).execute()
            except Exception:
                self.get_service_client().rpc("execute_sql", {"sql": """
                create table if not exists public.profiles (
                  user_id uuid primary key references auth.users(id) on delete cascade,
                  plan text default 'free',
                  status text default 'free',
                  created_at timestamp with time zone default now()
                );
                """}).execute()
            try:
                self.client.table("subscriptions").select("*").limit(1).execute()
            except Exception:
                self.get_service_client().rpc("execute_sql", {"sql": """
                create table if not exists public.subscriptions (
                  user_id uuid primary key references auth.users(id) on delete cascade,
                  stripe_customer_id text,
                  status text,
                  current_period_end timestamp with time zone,
                  created_at timestamp with time zone default now()
                );
                """}).execute()
        except Exception as e:
            logger.info(f"ensure_schema skipped or failed (expected on limited keys): {e}")
    
    async def upload_image(self, file_data: bytes, file_path: str, access_token: str, bucket: str = "xray-images") -> Optional[str]:
        try:
            auth_client = self._create_authenticated_client(access_token)
            response = auth_client.storage.from_(bucket).upload(
                file_path,
                file_data,
                file_options={"content-type": "image/jpeg", "upsert": "true"}
            )
            public_url = self.client.storage.from_(bucket).get_public_url(file_path)
            logger.info(f"Successfully uploaded image: {file_path}")
            return public_url
        except Exception as e:
            logger.error(f"Error uploading image: {str(e)}")
            return None
    
    async def save_diagnosis(self, diagnosis_data: dict, access_token: str) -> dict:
        try:
            
            
            auth_client = self._create_authenticated_client(access_token)
            response = auth_client.table('patient_diagnosis').insert({
                'patient_name': diagnosis_data['patient_name'],
                'image_url': diagnosis_data['image_url'],
                'annotated_image_url': diagnosis_data['annotated_image_url'],
                'summary': diagnosis_data['summary'],
                'ai_notes': diagnosis_data['ai_notes'],
                'treatment_stages': diagnosis_data['treatment_stages'],
                'report_html': diagnosis_data.get('report_html', '')  # Add the missing report_html field
            }).execute()

            logger.info(f"Successfully saved diagnosis for patient: {diagnosis_data['patient_name']}")
            return response.data[0] if response.data else {}
        except Exception as e:

            logger.error(f"Error saving diagnosis: {str(e)}")
            raise
    
    async def upload_video(self, file_data: bytes, file_path: str, access_token: str, bucket: str = "patient-videos") -> Optional[str]:
        try:
            try:
                self.get_service_client().storage.create_bucket(bucket, {"public": True})
            except:
                pass
            auth_client = self._create_authenticated_client(access_token)
            response = auth_client.storage.from_(bucket).upload(
                file_path,
                file_data,
                file_options={"content-type": "video/mp4", "upsert": "true"}
            )
            public_url = self.client.storage.from_(bucket).get_public_url(file_path)
            logger.info(f"Successfully uploaded video: {file_path}")
            return public_url
        except Exception as e:
            logger.error(f"Error uploading video: {str(e)}")
            return None

    async def upload_pdf(self, file_data: bytes, file_path: str, access_token: str, bucket: str = "patient-reports") -> Optional[str]:
        try:
            try:
                self.get_service_client().storage.create_bucket(bucket, {"public": True})
            except:
                pass
            auth_client = self._create_authenticated_client(access_token)
            response = auth_client.storage.from_(bucket).upload(
                file_path,
                file_data,
                file_options={"content-type": "application/pdf", "upsert": "true"}
            )
            public_url = self.client.storage.from_(bucket).get_public_url(file_path)
            logger.info(f"Successfully uploaded PDF report: {file_path}")
            return public_url
        except Exception as e:
            logger.error(f"Error uploading PDF report: {str(e)}")
            return None

supabase_service = SupabaseService()