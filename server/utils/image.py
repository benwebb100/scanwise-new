import httpx
import logging
from typing import Optional
from datetime import datetime
import os

logger = logging.getLogger(__name__)

async def download_image(image_url: str) -> Optional[bytes]:
    """Download image from URL"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(image_url)
            response.raise_for_status()
            logger.info(f"Successfully downloaded image from {image_url}")
            return response.content
    except Exception as e:
        logger.error(f"Error downloading image: {str(e)}")
        return None

def generate_annotated_filename(original_url: str, patient_name: str) -> str:
    """Generate a unique filename for the annotated image"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    patient_safe = patient_name.replace(" ", "_").lower()
    
    # Extract original filename if possible
    original_name = original_url.split("/")[-1].split("?")[0]
    base_name = os.path.splitext(original_name)[0]
    
    return f"{patient_safe}_{base_name}_{timestamp}.jpg"

def extract_tooth_number_from_detection(detection: dict) -> Optional[str]:
    """
    Extract tooth number from Roboflow detection based on position
    This is a simplified version - you might need to adjust based on your model
    """
    # This would need to be customized based on how your Roboflow model
    # identifies tooth positions. For now, returning None
    return None