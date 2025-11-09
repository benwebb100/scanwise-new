import os
import base64
import tempfile
import logging
import requests
import subprocess
from typing import Tuple, Optional
from moviepy import AudioFileClip

logger = logging.getLogger(__name__)

class VideoGeneratorService:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
        os.makedirs(self.temp_dir, exist_ok=True)
        
    def image_to_base64(self, image_url: str) -> str:
        """Convert image from URL to base64 - handles both HTTP URLs and data URLs"""
        try:
            if image_url.startswith('data:'):
                # Already a data URL - extract just the base64 part
                logger.info("Image is already a data URL, extracting base64 data")
                # Remove the "data:image/png;base64," prefix to get pure base64
                base64_str = image_url.split(',', 1)[1]
                logger.info(f"Extracted base64 from data URL - Size: {len(base64_str)} characters")
                return base64_str
            else:
                # HTTP/HTTPS URL - download and convert
                logger.info(f"Downloading image from HTTP URL to convert to base64")
                response = requests.get(image_url)
                response.raise_for_status()
                
                image_bytes = response.content
                base64_str = base64.b64encode(image_bytes).decode('utf-8')
                
                logger.info(f"Successfully converted image to base64 - Size: {len(base64_str)} characters")
                return base64_str
            
        except Exception as e:
            logger.error(f"Error converting image to base64: {str(e)}")
            raise
    
    def create_video_with_subtitles(self, image_path: str, audio_path: str, video_path: str) -> float:
        """Create video from image and audio with burned-in subtitles"""
        # Save current directory
        original_dir = os.getcwd()
        
        try:
            import whisper
            
            # Change to temp directory to use relative paths
            os.chdir(self.temp_dir)
            
            logger.info("Loading Whisper Tiny model...")
            model = whisper.load_model("tiny")

            logger.info("Transcribing audio...")
            result = model.transcribe(audio_path, verbose=False)
            segments = result['segments']

            # Load audio to get duration
            audio_clip = AudioFileClip(audio_path)
            duration = audio_clip.duration
            audio_clip.close()  # Add this line to release the file

            # Create temporary subtitle file (relative path)
            srt_path = "temp_subtitles.srt"
            with open(srt_path, "w", encoding="utf-8") as srt_file:
                for i, seg in enumerate(segments, start=1):
                    start = self._format_timestamp(seg['start'])
                    end = self._format_timestamp(seg['end'])
                    text = seg['text'].strip()
                    srt_file.write(f"{i}\n{start} --> {end}\n{text}\n\n")

            # Create temporary video (relative path)
            logger.info("Creating temporary video...")
            temp_video = "temp_video.mp4"
            subprocess.run([
                "ffmpeg", "-y",
                "-loop", "1",
                "-i", image_path,
                "-i", audio_path,
                "-shortest",
                "-c:v", "libx264",
                "-tune", "stillimage",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", "192k",
                "-vf", "scale=1280:720",
                temp_video
            ], check=True)

            # Path to watermark (relative path)
            watermark_path = "watermark.png"
            if not os.path.exists(watermark_path):
                # Create a simple watermark using ffmpeg
                subprocess.run([
                    "ffmpeg", "-y",
                    "-f", "lavfi",
                    "-i", "color=c=white@0.5:s=200x50",
                    "-vf", "drawtext=text='Scanwise':fontcolor=blue:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2",
                    "-frames:v", "1",
                    watermark_path
                ], check=True)
            
            # Burn subtitles and add watermark (using relative paths)
            logger.info("Burning subtitles and adding watermark...")
            subprocess.run([
                "ffmpeg", "-y",
                "-i", temp_video,
                "-i", watermark_path,
                "-filter_complex", 
                f"subtitles={srt_path}[sub];[1:v]scale=iw*0.15:-1[watermark];[sub][watermark]overlay=10:H-h-10[v]",
                "-map", "[v]", 
                "-map", "0:a",
                "-c:a", "copy",
                video_path
            ], check=True)

            # Cleanup
            os.remove(temp_video)
            os.remove(srt_path)

            return duration

        except Exception as e:
            logger.error(f"Error creating video: {str(e)}")
            raise
        finally:
            # Always change back to original directory
            os.chdir(original_dir)
    
    def _format_timestamp(self, seconds: float) -> str:
        """Convert seconds to SRT timestamp format"""
        hrs = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds - int(seconds)) * 1000)
        return f"{hrs:02}:{mins:02}:{secs:02},{millis:03}"
    
    def cleanup(self):
        """Clean up temporary directory"""
        import shutil
        try:
            shutil.rmtree(self.temp_dir)
        except Exception as e:
            logger.error(f"Error cleaning up temp directory: {str(e)}")

# Create singleton instance
# Initialize service lazily to avoid import-time errors
_video_generator_service = None

def get_video_generator_service():
    global _video_generator_service
    if _video_generator_service is None:
        try:
            _video_generator_service = VideoGeneratorService()
        except Exception as e:
            logger.error(f"Failed to initialize VideoGenerator service: {e}")
            return None
    return _video_generator_service

# For backward compatibility
video_generator_service = get_video_generator_service()