import os
import logging
import requests
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class ElevenLabsService:
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY", "sk_4b0c1cdda509a9111559bd0129d5571c8f81cc21c8ee604a")
        self.voice_id = os.getenv("ELEVENLABS_VOICE_ID", "EkK5I93UQWFDigLMpZcX")
        self.api_url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}"
        
    async def generate_voice(self, text: str) -> Optional[bytes]:
        """Generate voice audio from text using ElevenLabs"""
        try:
            headers = {
                "Content-Type": "application/json",
                "xi-api-key": self.api_key
            }
            
            payload = {
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            }
            
            logger.info("Calling ElevenLabs API...")
            response = requests.post(self.api_url, json=payload, headers=headers)
            response.raise_for_status()
            
            logger.info("Successfully generated voice audio")
            return response.content
            
        except Exception as e:
            logger.error(f"Error generating voice: {str(e)}")
            raise

# Create singleton instance
elevenlabs_service = ElevenLabsService()