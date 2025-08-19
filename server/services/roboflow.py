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
        Requires env ROBOFLOW_SEG_PROJECT_ID and ROBOFLOW_SEG_MODEL_VERSION to be set.
        Returns JSON predictions or None on failure.
        """
        if not all([self.seg_project_id, self.seg_model_version]):
            logger.warning("Teeth segmentation model not configured (ROBOFLOW_SEG_PROJECT_ID/ROBOFLOW_SEG_MODEL_VERSION).")
            return None
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
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
            return None
        except Exception as e:
            logger.error(f"Error in Roboflow teeth segmentation: {str(e)}")
            return None

# Create singleton instance
roboflow_service = RoboflowService()