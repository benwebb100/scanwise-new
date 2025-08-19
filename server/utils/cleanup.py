import os
import time
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

def cleanup_old_temp_files(temp_dir: str = "video_temp", max_age_hours: int = 24):
    """Clean up temporary files older than specified hours"""
    try:
        if not os.path.exists(temp_dir):
            return
        
        current_time = time.time()
        cutoff_time = current_time - (max_age_hours * 3600)
        
        cleaned_count = 0
        for filename in os.listdir(temp_dir):
            file_path = os.path.join(temp_dir, filename)
            
            if os.path.isfile(file_path):
                file_modified_time = os.path.getmtime(file_path)
                
                if file_modified_time < cutoff_time:
                    os.remove(file_path)
                    cleaned_count += 1
                    logger.info(f"Removed old temp file: {filename}")
        
        if cleaned_count > 0:
            logger.info(f"Cleaned up {cleaned_count} old temporary files")
            
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")

# Run cleanup on import
cleanup_old_temp_files()