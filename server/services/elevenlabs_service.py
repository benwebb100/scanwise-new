import os
import logging
import requests
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class ElevenLabsService:
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        # Default English voice
        self.default_voice_id = os.getenv("ELEVENLABS_VOICE_ID", "EkK5I93UQWFDigLMpZcX")
        # Bulgarian voice
        self.bulgarian_voice_id = "13Cuh3NuYvWOVQtLbRN8"
        
        # Check if API key is configured
        if not self.api_key:
            logger.warning("ELEVENLABS_API_KEY not configured. Video generation will use text-to-speech fallback.")
        
    async def generate_voice(self, text: str, language: str = "english") -> Optional[bytes]:
        """Generate voice audio from text using ElevenLabs or fallback to silent audio"""
        try:
            # Check if ElevenLabs is properly configured
            if not self.api_key:
                logger.info("ElevenLabs API key not configured, generating silent audio fallback")
                return self._generate_silent_audio(len(text))
            
            # Select voice ID based on language
            voice_id = self.bulgarian_voice_id if language.lower() == "bulgarian" else self.default_voice_id
            api_url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            
            logger.info(f"🎙️ Language requested: '{language}'")
            logger.info(f"🎙️ Voice ID selected: {voice_id} ({'Bulgarian' if language.lower() == 'bulgarian' else 'English'})")
            logger.info(f"🎙️ Script preview (first 100 chars): {text[:100]}")
            
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
            
            logger.info(f"Calling ElevenLabs API for {language} narration...")
            response = requests.post(api_url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 401:
                logger.error("ElevenLabs API key is invalid or expired. Falling back to silent audio.")
                return self._generate_silent_audio(len(text))
            elif response.status_code == 429:
                logger.error("ElevenLabs API rate limit exceeded. Falling back to silent audio.")
                return self._generate_silent_audio(len(text))
            
            response.raise_for_status()
            
            logger.info("Successfully generated voice audio")
            return response.content
            
        except requests.exceptions.RequestException as e:
            logger.error(f"ElevenLabs API request failed: {str(e)}. Falling back to silent audio.")
            return self._generate_silent_audio(len(text))
        except Exception as e:
            logger.error(f"Error generating voice: {str(e)}. Falling back to silent audio.")
            return self._generate_silent_audio(len(text))
    
    def _generate_silent_audio(self, text_length: int) -> bytes:
        """Generate a silent MP3 audio file as fallback"""
        try:
            import io
            import wave
            import struct
            
            # Calculate duration based on text length (roughly 150 words per minute)
            estimated_duration = max(3, text_length / 10)  # Minimum 3 seconds
            
            # Generate silent audio data
            sample_rate = 22050
            duration = int(estimated_duration)
            frames = sample_rate * duration
            
            # Create silent audio data
            audio_data = struct.pack('<' + ('h' * frames), *([0] * frames))
            
            # Create WAV file in memory
            wav_buffer = io.BytesIO()
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data)
            
            wav_buffer.seek(0)
            logger.info(f"Generated {duration}s silent audio fallback")
            return wav_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Failed to generate silent audio fallback: {str(e)}")
            # Return minimal WAV file
            return b'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00'

# Create singleton instance
elevenlabs_service = ElevenLabsService()