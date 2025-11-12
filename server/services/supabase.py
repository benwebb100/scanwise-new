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
            
            # Prepare the data to insert, including all available fields
            insert_data = {
                'patient_name': diagnosis_data['patient_name'],
                'image_url': diagnosis_data['image_url'],
                'annotated_image_url': diagnosis_data['annotated_image_url'],
                'summary': diagnosis_data['summary'],
                'ai_notes': diagnosis_data['ai_notes'],
                'treatment_stages': diagnosis_data['treatment_stages']
            }
            
            # Add optional fields if they exist
            if 'report_html' in diagnosis_data:
                insert_data['report_html'] = diagnosis_data['report_html']
            if 'video_url' in diagnosis_data:
                insert_data['video_url'] = diagnosis_data['video_url']
            if 'video_script' in diagnosis_data:
                insert_data['video_script'] = diagnosis_data['video_script']
            if 'video_generated_at' in diagnosis_data:
                insert_data['video_generated_at'] = diagnosis_data['video_generated_at']
            if 'video_generation_failed' in diagnosis_data:
                insert_data['video_generation_failed'] = diagnosis_data['video_generation_failed']
            if 'video_error' in diagnosis_data:
                insert_data['video_error'] = diagnosis_data['video_error']
            if 'is_xray_based' in diagnosis_data:
                insert_data['is_xray_based'] = diagnosis_data.get('is_xray_based', True)
            
            response = auth_client.table('patient_diagnosis').insert(insert_data).execute()
            logger.info(f"Successfully saved diagnosis for patient: {diagnosis_data['patient_name']}")
            return response.data[0] if response.data else {}
        except Exception as e:
            logger.error(f"Error saving diagnosis: {str(e)}")
            raise
    
    async def update_diagnosis(self, diagnosis_id: str, update_data: dict, access_token: str) -> dict:
        """Update an existing diagnosis record"""
        try:
            auth_client = self._create_authenticated_client(access_token)
            
            response = auth_client.table('patient_diagnosis').update(update_data).eq('id', diagnosis_id).execute()
            logger.info(f"Successfully updated diagnosis {diagnosis_id} with fields: {list(update_data.keys())}")
            return response.data[0] if response.data else {}
        except Exception as e:
            logger.error(f"Error updating diagnosis {diagnosis_id}: {str(e)}")
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

    # NEW FUNCTIONS FROM THE NEW FILE
    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user data by user ID from Supabase auth"""
        try:
            # Use service client for admin operations
            client = self.get_service_client()
            if not client:
                logger.error("No service client available for user lookup")
                return None
            
            # Get user from auth.users table
            response = client.auth.admin.get_user_by_id(user_id)
            
            if response.user:
                # Extract relevant user data
                user_data = {
                    'id': response.user.id,
                    'email': response.user.email,
                    'clinic_name': response.user.user_metadata.get('clinic_name') if response.user.user_metadata else None,
                    'name': response.user.user_metadata.get('name') if response.user.user_metadata else None,
                    'country': response.user.user_metadata.get('country') if response.user.user_metadata else None
                }
                return user_data
            else:
                logger.warning(f"User not found: {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting user by ID {user_id}: {str(e)}")
            return None

    async def save_clinic_branding(self, branding_data: dict) -> bool:
        """Save clinic branding information to the clinic_branding table"""
        try:
            logger.info(f"🔍 Attempting to save clinic branding: {branding_data}")
            
            client = self.get_service_client()
            if not client:
                logger.error("❌ No service client available for clinic branding")
                return False
            
            logger.info("✅ Service client obtained, inserting into clinic_branding table...")
            
            # Insert into clinic_branding table
            response = client.table('clinic_branding').insert(branding_data).execute()
            
            logger.info(f"📊 Insert response: {response}")
            logger.info(f"📊 Response data: {response.data}")
            logger.info(f"📊 Response error: {getattr(response, 'error', None)}")
            
            if response.data:
                logger.info(f"✅ Clinic branding saved successfully for user: {branding_data.get('user_id')}")
                return True
            else:
                logger.error("❌ Failed to save clinic branding - no data returned")
                return False
                
        except Exception as e:
            logger.error(f"💥 Error saving clinic branding: {str(e)}")
            import traceback
            logger.error(f"📍 Traceback: {traceback.format_exc()}")
            return False

    async def get_clinic_branding_by_user_id(self, user_id: str) -> Optional[dict]:
        """Get clinic branding information for a specific user"""
        try:
            logger.info(f"🔍 Fetching clinic branding for user: {user_id}")
            
            client = self.get_service_client()
            if not client:
                logger.error("❌ No service client available for clinic branding retrieval")
                return None
            
            logger.info("✅ Service client obtained, querying clinic_branding table...")
            
            # Query clinic_branding table by user_id
            response = client.table('clinic_branding').select('*').eq('user_id', user_id).execute()
            
            logger.info(f"📊 Query response: {response}")
            logger.info(f"📊 Response data: {response.data}")
            logger.info(f"📊 Response error: {getattr(response, 'error', None)}")
            
            if response.data and len(response.data) > 0:
                clinic_branding = response.data[0]
                logger.info(f"✅ Clinic branding retrieved successfully for user: {user_id}")
                logger.info(f"🏥 Clinic name: {clinic_branding.get('clinic_name')}")
                return clinic_branding
            else:
                logger.warning(f"⚠️ No clinic branding found for user: {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"💥 Error retrieving clinic branding: {str(e)}")
            import traceback
            logger.error(f"📍 Traceback: {traceback.format_exc()}")
            return None

    async def create_user_account(self, user_data: dict, password: str) -> Optional[dict]:
        """Create a new user account in Supabase auth"""
        try:
            client = self.get_service_client()
            if not client:
                logger.error("No service client available for user creation")
                return None
            
            # Create user with admin privileges
            response = client.auth.admin.create_user({
                'email': user_data['email'],
                'password': password,
                'email_confirm': True,  # Auto-confirm email
                'user_metadata': {
                    'name': user_data.get('name'),
                    'clinic_name': user_data.get('clinicName'),  # Frontend sends 'clinicName'
                    'clinic_website': user_data.get('clinicWebsite'),  # Frontend sends 'clinicWebsite'
                    'country': user_data.get('country')
                }
            })
            
            if response.user:
                logger.info(f"Successfully created user account: {user_data['email']}")
                return {
                    'id': response.user.id,
                    'email': response.user.email,
                    'clinic_name': user_data.get('clinic_name'),
                    'name': user_data.get('name')
                }
            else:
                logger.error("Failed to create user account")
                return None
                
        except Exception as e:
            logger.error(f"Error creating user account: {str(e)}")
            return None
        
    # Add these methods to your SupabaseService class
    async def get_treatment_settings(self, access_token: str) -> Optional[dict]:
        """Get treatment settings for the authenticated clinic"""
        try:
            auth_client = self._create_authenticated_client(access_token)
            
            # Query using the authenticated client - RLS will handle user filtering
            response = auth_client.table('clinic_pricing').select("*").execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error getting treatment settings: {str(e)}")
            raise

    # async def save_treatment_settings(self, treatment_data: dict, access_token: str) -> dict:
    #     """Save treatment settings for the authenticated clinic"""
    #     try:
    #         # Add debugging
    #         import jwt
    #         decoded = jwt.decode(access_token, options={"verify_signature": False})
    #         user_id = decoded.get('sub')
            
    #         logger.info(f"Token decoded, user_id: {user_id}")
    #         logger.info(f"Token claims: {decoded}")
            
    #         # Try using authenticated client first
    #         auth_client = self._create_authenticated_client(access_token)

    #         # Test if we can read with this user
    #         test_read = auth_client.table('clinic_pricing').select("*").eq('user_id', user_id).execute()
    #         logger.info(f"Test read successful: {len(test_read.data)} records found")
            
    #         # Check if record exists for this user
    #         existing = auth_client.table('clinic_pricing').select("id").execute()
            
    #         from datetime import datetime
    #         current_time = datetime.utcnow().isoformat()
            
    #         if existing.data and len(existing.data) > 0:
    #             # Update existing record
    #             response = auth_client.table('clinic_pricing').update({
    #                 'treatment_settings': treatment_data,
    #                 'updated_at': current_time
    #             }).execute()
    #             logger.info("Successfully updated treatment settings")
    #         else:
    #             # Create new record
    #             response = auth_client.table('clinic_pricing').insert({
    #                 'treatment_settings': treatment_data,
    #                 'pricing_data': {},  # Legacy field
    #                 'created_at': current_time,
    #                 'updated_at': current_time
    #             }).execute()
    #             logger.info("Successfully created treatment settings")
            
    #         return response.data[0] if response.data else {}
            
    #     except Exception as e:
    #         logger.error(f"Error saving treatment settings: {str(e)}")
    #         raise

    async def save_treatment_settings(self, treatment_data: dict, access_token: str) -> dict:
        """Save treatment settings for the authenticated clinic"""
        try:
            import jwt
            decoded = jwt.decode(access_token, options={"verify_signature": False})
            user_id = decoded.get('sub')
            
            if not user_id:
                raise Exception("Invalid token: no user ID found")
            
            # Use service client to bypass RLS
            client = self.get_service_client()
            
            # Check if record exists
            existing = client.table('clinic_pricing').select("id").eq('user_id', user_id).execute()
            
            from datetime import datetime
            current_time = datetime.utcnow().isoformat()
            
            if existing.data and len(existing.data) > 0:
                # Update existing record
                response = client.table('clinic_pricing').update({
                    'treatment_settings': treatment_data,
                    'updated_at': current_time
                }).eq('user_id', user_id).execute()
                logger.info("Successfully updated treatment settings")
            else:
                # Create new record using service client
                response = client.table('clinic_pricing').insert({
                    'user_id': user_id,
                    'treatment_settings': treatment_data,
                    'pricing_data': {},
                    'created_at': current_time,
                    'updated_at': current_time
                }).execute()
                logger.info("Successfully created treatment settings")
            
            return response.data[0] if response.data else {}
            
        except Exception as e:
            logger.error(f"Error saving treatment settings: {str(e)}")
            raise

    async def clear_treatment_settings(self, access_token: str) -> bool:
        """Clear all treatment customizations (reset to defaults)"""
        try:
            auth_client = self._create_authenticated_client(access_token)
            
            from datetime import datetime
            # Update to empty JSON
            response = auth_client.table('clinic_pricing').update({
                'treatment_settings': {},
                'updated_at': datetime.utcnow().isoformat()
            }).execute()
            
            if response.data:
                logger.info("Successfully cleared treatment settings")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error clearing treatment settings: {str(e)}")
            raise

    async def get_dental_treatments(self) -> list:
        """Get all dental treatments from master table (read-only defaults)"""
        try:
            # Use regular client for public read operations
            response = self.client.table('dental_treatments')\
                .select("*")\
                .eq('is_active', True)\
                .order('category')\
                .order('name')\
                .execute()
            
            if response.data:
                return [{
                    "code": treatment['code'],
                    "name": treatment['name'],
                    "category": treatment['category'],
                    "default_duration": treatment['default_duration'],
                    "default_price": float(treatment['default_price']),
                    "description": treatment.get('description', '')
                } for treatment in response.data]
            return []
            
        except Exception as e:
            logger.error(f"Error fetching dental treatments: {str(e)}")
            raise

    async def get_dental_conditions(self) -> list:
        """Get all dental conditions from master table (read-only defaults)"""
        try:
            # Use regular client for public read operations
            response = self.client.table('dental_conditions')\
                .select("*")\
                .eq('is_active', True)\
                .order('name')\
                .execute()
            
            if response.data:
                return [{
                    "code": condition['code'],
                    "name": condition['name'],
                    "severity_levels": condition.get('severity_levels', []),
                    "description": condition.get('description', '')
                } for condition in response.data]
            return []
            
        except Exception as e:
            logger.error(f"Error fetching dental conditions: {str(e)}")
            raise

    def get_supabase_service():
        """Get the global Supabase service instance"""
        return supabase_service

supabase_service = SupabaseService()