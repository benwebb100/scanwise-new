import boto3
import os
import logging
from typing import Optional, List, Dict, Any
from botocore.exceptions import ClientError, NoCredentialsError
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        """Initialize S3 service with AWS credentials"""
        self.access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.region = os.getenv('AWS_REGION', 'ap-southeast-2')
        self.bucket_name = os.getenv('AWS_S3_BUCKET', 'scanwise-xrays')
        
        # Validate credentials
        if not self.access_key or not self.secret_key:
            raise ValueError("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set in environment variables")
        
        # Initialize S3 client
        try:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region
            )
            logger.info(f"S3 service initialized successfully for bucket: {self.bucket_name}")
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize S3 service: {str(e)}")
            raise
    
    def create_clinic_folder(self, clinic_name: str, clinic_id: str) -> Dict[str, Any]:
        """
        Create a new clinic folder in S3 when a clinic signs up
        
        Args:
            clinic_name: Human-readable clinic name
            clinic_id: Unique clinic identifier
            
        Returns:
            Dict with success status and folder details
        """
        try:
            # Create a safe folder name (replace spaces with hyphens, lowercase)
            safe_clinic_name = clinic_name.lower().replace(' ', '-').replace('_', '-')
            folder_key = f"clinics/{safe_clinic_name}-{clinic_id}/"
            
            # Create an empty object to establish the folder
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=folder_key,
                Body='',
                ContentType='application/x-directory'
            )
            
            # Create metadata file for the clinic
            metadata = {
                'clinic_name': clinic_name,
                'clinic_id': clinic_id,
                'created_at': datetime.utcnow().isoformat(),
                'status': 'pending_setup',
                'imaging_provider': None,
                'setup_completed': False,
                'last_scan': None
            }
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=f"{folder_key}clinic-metadata.json",
                Body=json.dumps(metadata, indent=2),
                ContentType='application/json'
            )
            
            logger.info(f"Successfully created clinic folder: {folder_key}")
            
            return {
                'success': True,
                'folder_key': folder_key,
                'clinic_name': clinic_name,
                'clinic_id': clinic_id,
                'status': 'pending_setup'
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            logger.error(f"S3 error creating clinic folder: {error_code} - {error_message}")
            return {
                'success': False,
                'error': f"S3 error: {error_code}",
                'message': error_message
            }
        except Exception as e:
            logger.error(f"Unexpected error creating clinic folder: {str(e)}")
            return {
                'success': False,
                'error': 'Unexpected error',
                'message': str(e)
            }
    
    def list_clinic_folders(self) -> List[Dict[str, Any]]:
        """
        List all clinic folders and their metadata
        
        Returns:
            List of clinic information
        """
        try:
            clinics = []
            
            # List objects with clinics/ prefix
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix='clinics/',
                Delimiter='/'
            )
            
            # Process each clinic folder
            for prefix in response.get('CommonPrefixes', []):
                folder_key = prefix['Prefix']
                clinic_name = folder_key.replace('clinics/', '').replace('/', '')
                
                # Get clinic metadata
                try:
                    metadata_response = self.s3_client.get_object(
                        Bucket=self.bucket_name,
                        Key=f"{folder_key}clinic-metadata.json"
                    )
                    metadata = json.loads(metadata_response['Body'].read().decode('utf-8'))
                    clinics.append(metadata)
                except ClientError:
                    # If metadata file doesn't exist, create basic info
                    clinics.append({
                        'clinic_name': clinic_name,
                        'clinic_id': clinic_name.split('-')[-1] if '-' in clinic_name else 'unknown',
                        'status': 'unknown',
                        'setup_completed': False
                    })
            
            return clinics
            
        except Exception as e:
            logger.error(f"Error listing clinic folders: {str(e)}")
            return []
    
    def get_clinic_status(self, clinic_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the current status of a specific clinic
        
        Args:
            clinic_id: Unique clinic identifier
            
        Returns:
            Clinic metadata or None if not found
        """
        try:
            # Find the clinic folder
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix='clinics/',
                Delimiter='/'
            )
            
            for prefix in response.get('CommonPrefixes', []):
                folder_key = prefix['Prefix']
                if clinic_id in folder_key:
                    # Get clinic metadata
                    metadata_response = self.s3_client.get_object(
                        Bucket=self.bucket_name,
                        Key=f"{folder_key}clinic-metadata.json"
                    )
                    return json.loads(metadata_response['Body'].read().decode('utf-8'))
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting clinic status: {str(e)}")
            return None
    
    def update_clinic_status(self, clinic_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update clinic status (e.g., mark as setup completed)
        
        Args:
            clinic_id: Unique clinic identifier
            updates: Dictionary of fields to update
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Find the clinic folder
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix='clinics/',
                Delimiter='/'
            )
            
            for prefix in response.get('CommonPrefixes', []):
                folder_key = prefix['Prefix']
                if clinic_id in folder_key:
                    # Get current metadata
                    metadata_response = self.s3_client.get_object(
                        Bucket=self.bucket_name,
                        Key=f"{folder_key}clinic-metadata.json"
                    )
                    metadata = json.loads(metadata_response['Body'].read().decode('utf-8'))
                    
                    # Update metadata
                    metadata.update(updates)
                    metadata['updated_at'] = datetime.utcnow().isoformat()
                    
                    # Save updated metadata
                    self.s3_client.put_object(
                        Bucket=self.bucket_name,
                        Key=f"{folder_key}clinic-metadata.json",
                        Body=json.dumps(metadata, indent=2),
                        ContentType='application/json'
                    )
                    
                    logger.info(f"Updated clinic {clinic_id} status: {updates}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error updating clinic status: {str(e)}")
            return False
    
    def list_dicom_files(self, clinic_id: str) -> List[Dict[str, Any]]:
        """
        List DICOM files for a specific clinic
        
        Args:
            clinic_id: Unique clinic identifier
            
        Returns:
            List of DICOM file information
        """
        try:
            # Find the clinic folder
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix='clinics/',
                Delimiter='/'
            )
            
            for prefix in response.get('CommonPrefixes', []):
                folder_key = prefix['Prefix']
                if clinic_id in folder_key:
                    # List all objects in the clinic folder
                    objects_response = self.s3_client.list_objects_v2(
                        Bucket=self.bucket_name,
                        Prefix=folder_key
                    )
                    
                    dicom_files = []
                    for obj in objects_response.get('Contents', []):
                        if obj['Key'].endswith('.dcm') or 'dicom' in obj['Key'].lower():
                            dicom_files.append({
                                'key': obj['Key'],
                                'size': obj['Size'],
                                'last_modified': obj['LastModified'].isoformat(),
                                'url': f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{obj['Key']}"
                            })
                    
                    return dicom_files
            
            return []
            
        except Exception as e:
            logger.error(f"Error listing DICOM files: {str(e)}")
            return []
    
    def test_connection(self) -> bool:
        """
        Test S3 connection and bucket access
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            # Try to list objects in the bucket
            self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                MaxKeys=1
            )
            logger.info("S3 connection test successful")
            return True
        except Exception as e:
            logger.error(f"S3 connection test failed: {str(e)}")
            return False

# Initialize service lazily to avoid import-time errors
_s3_service = None

def get_s3_service():
    global _s3_service
    if _s3_service is None:
        try:
            _s3_service = S3Service()
        except Exception as e:
            logger.error(f"Failed to initialize S3 service: {e}")
            return None
    return _s3_service

# For backward compatibility - don't initialize at import time
s3_service = None
