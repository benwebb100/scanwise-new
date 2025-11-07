import os
import httpx
import logging
from typing import Dict, Tuple, Optional
from dotenv import load_dotenv
import base64

load_dotenv()

logger = logging.getLogger(__name__)

class RoboflowService:
    def __init__(self):
        self.api_key = os.getenv("ROBOFLOW_API_KEY")
        # Condition detection model (existing)
        self.project_id = os.getenv("ROBOFLOW_PROJECT_ID")
        self.model_version = os.getenv("ROBOFLOW_MODEL_VERSION")

        # Teeth segmentation model (new)
        self.seg_project_id = os.getenv("ROBOFLOW_SEG_PROJECT_ID") or os.getenv("ROBOFLOW_TEETH_SEG_PROJECT_ID")
        self.seg_model_version = os.getenv("ROBOFLOW_SEG_MODEL_VERSION") or os.getenv("ROBOFLOW_TEETH_SEG_MODEL_VERSION")

        if not self.api_key:
            raise ValueError("Roboflow API key must be set")

        if not all([self.project_id, self.model_version]):
            raise ValueError("Roboflow condition detection model ID and version must be set")

        self.base_url = f"https://detect.roboflow.com/{self.project_id}/{self.model_version}"
    
    async def detect_conditions(self, image_url: str) -> Tuple[Optional[Dict], Optional[bytes]]:
        """
        Send image to Roboflow for detection
        Returns: (json_predictions, annotated_image_bytes)
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Get JSON predictions
                json_response = await client.post(
                    f"{self.base_url}",
                    params={
                        "api_key": self.api_key,
                        "image": image_url,
                        "format": "json"
                    }
                )
                json_response.raise_for_status()
                predictions = json_response.json()
                
                # Get annotated image
                image_response = await client.post(
                    f"{self.base_url}",
                    params={
                        "api_key": self.api_key,
                        "image": image_url,
                        "format": "image",
                        # "labels": "true",
                        "stroke": "6",
                        "overlap": "50"
                    }
                )
                image_response.raise_for_status()
                annotated_image = image_response.content
                
                logger.info(f"Successfully processed image with Roboflow. Found {len(predictions.get('predictions', []))} detections")
                return predictions, annotated_image
                
        except httpx.HTTPError as e:
            logger.error(f"HTTP error occurred while calling Roboflow: {str(e)}")
            return None, None
        except Exception as e:
            logger.error(f"Error in Roboflow detection: {str(e)}")
            return None, None
        
    async def segment_teeth(self, image_url: str) -> Optional[Dict]:
        """
        Call a separate Roboflow model for teeth segmentation to obtain per‑tooth polygons/bboxes.
        Handles both regular URLs and base64 data URIs.
        Returns JSON predictions or None on failure.
        """
        if not all([self.seg_project_id, self.seg_model_version]):
            logger.warning("Teeth segmentation model not configured (ROBOFLOW_SEG_PROJECT_ID/ROBOFLOW_SEG_MODEL_VERSION).")
            return None
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Check if image_url is a base64 data URI
                if image_url.startswith('data:image'):
                    logger.info("Sending base64 image to Roboflow segmentation (via request body)")
                    
                    # Extract base64 data (remove "data:image/png;base64," prefix)
                    try:
                        # Split on comma and get the actual base64 data
                        base64_data = image_url.split(',', 1)[1]
                        
                        # Clean the base64 string (remove any whitespace/newlines that might have been added)
                        base64_data = base64_data.replace('\n', '').replace('\r', '').replace(' ', '').strip()
                        
                        logger.info(f"Base64 data length: {len(base64_data)} characters")
                        
                    except IndexError:
                        logger.error("Invalid base64 data URI format")
                        return None
                    
                    # Roboflow expects base64 as the "image" field directly in params with a special format
                    # Try sending it as form data instead of JSON
                    seg_response = await client.post(
                        f"https://detect.roboflow.com/{self.seg_project_id}/{self.seg_model_version}",
                        params={
                            "api_key": self.api_key,
                        },
                        data={
                            "image": base64_data  # Send as form data, not JSON
                        }
                    )
                else:
                    # Regular URL - use query parameter method
                    logger.info(f"Sending URL to Roboflow segmentation (via query param): {image_url[:100]}...")
                    
                    seg_response = await client.post(
                        f"https://detect.roboflow.com/{self.seg_project_id}/{self.seg_model_version}",
                        params={
                            "api_key": self.api_key,
                            "image": image_url,
                            "format": "json",
                        },
                    )
                
                seg_response.raise_for_status()
                predictions = seg_response.json()
                
                logger.info(
                    f"Successfully processed image with Roboflow Teeth Segmentation. Found {len(predictions.get('predictions', []))} segments"
                )
                return predictions
                
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during Roboflow teeth segmentation: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response body: {e.response.text[:500]}")
            return None
        except Exception as e:
            logger.error(f"Error in Roboflow teeth segmentation: {str(e)}")
            return None

# Create singleton instance
# Initialize service lazily to avoid import-time errors
_roboflow_service = None

def get_roboflow_service():
    global _roboflow_service
    if _roboflow_service is None:
        try:
            _roboflow_service = RoboflowService()
        except Exception as e:
            logger.error(f"Failed to initialize Roboflow service: {e}")
            return None
    return _roboflow_service

# For backward compatibility
roboflow_service = get_roboflow_service()