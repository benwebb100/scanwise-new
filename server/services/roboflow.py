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
        self.project_id = os.getenv("ROBOFLOW_PROJECT_ID")
        self.model_version = os.getenv("ROBOFLOW_MODEL_VERSION")
        
        if not all([self.api_key, self.project_id, self.model_version]):
            raise ValueError("Roboflow API key, project ID, and model version must be set")
        
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
                        "stroke": "2"
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

# Create singleton instance
roboflow_service = RoboflowService()