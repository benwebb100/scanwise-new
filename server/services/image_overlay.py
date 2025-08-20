import logging
import requests
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from typing import Dict, List, Optional, Tuple
import base64

logger = logging.getLogger(__name__)

class ImageOverlayService:
    def __init__(self):
        # Default font size and color for tooth numbers
        self.font_size = 24
        self.text_color = (255, 255, 255)  # White text
        self.outline_color = (0, 0, 0)     # Black outline
        self.outline_width = 2
        
    async def add_tooth_number_overlay(
        self, 
        image_url: str, 
        segmentation_data: Dict, 
        numbering_system: str = "FDI",
        show_numbers: bool = True
    ) -> Optional[str]:
        """
        Add tooth number overlays to an X-ray image using segmentation data.
        
        Args:
            image_url: URL of the annotated X-ray image
            segmentation_data: Teeth segmentation data from April Vision
            numbering_system: "FDI" or "Universal"
            show_numbers: Whether to show tooth numbers or return original image
            
        Returns:
            Base64 encoded image with tooth numbers, or None on failure
        """
        if not show_numbers:
            return None  # Return None to indicate no overlay needed
        
        # Validate inputs
        if not image_url or not image_url.strip():
            logger.error("Invalid image URL provided")
            return None
            
        if not segmentation_data:
            logger.error("No segmentation data provided")
            return None
            
        if numbering_system not in ["FDI", "Universal"]:
            logger.warning(f"Invalid numbering system '{numbering_system}', defaulting to FDI")
            numbering_system = "FDI"
            
        try:
            # Download the image
            logger.info(f"Downloading image from: {image_url}")
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # Validate image content
            if not response.content:
                logger.error("Empty image content received")
                return None
            
            logger.info(f"Downloaded image size: {len(response.content)} bytes")
            
            # Open image with PIL
            image = Image.open(BytesIO(response.content))
            logger.info(f"Image opened successfully: {image.size[0]}x{image.size[1]} pixels, mode: {image.mode}")
            
            # Convert to RGBA if needed
            if image.mode != 'RGBA':
                logger.info(f"Converting image from {image.mode} to RGBA")
                image = image.convert('RGBA')
            
            # Create a copy for drawing
            overlay_image = image.copy()
            draw = ImageDraw.Draw(overlay_image)
            
            # Try to load a font, fallback to default if not available
            font = None
            font_paths = [
                "arial.ttf",
                "/System/Library/Fonts/Arial.ttf",
                "/System/Library/Fonts/Helvetica.ttc",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/TTF/arial.ttf"
            ]
            
            for font_path in font_paths:
                try:
                    font = ImageFont.truetype(font_path, self.font_size)
                    logger.info(f"Loaded font from: {font_path}")
                    break
                except Exception as e:
                    logger.debug(f"Failed to load font from {font_path}: {e}")
                    continue
            
            if font is None:
                logger.warning("No system fonts found, using default font")
                font = ImageFont.load_default()
            
            # Process segmentation data
            teeth = self._extract_teeth_from_segmentation(segmentation_data, numbering_system)
            
            # Draw tooth numbers
            if teeth:
                logger.info(f"Drawing {len(teeth)} tooth numbers on image")
                for tooth in teeth:
                    self._draw_tooth_number(draw, font, tooth)
            else:
                logger.warning("No valid teeth found for overlay")
            
            # Convert back to base64
            try:
                buffer = BytesIO()
                overlay_image.save(buffer, format='PNG')
                buffer.seek(0)
                
                # Convert to base64
                image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                
                logger.info(f"Successfully added tooth number overlay to image")
                return f"data:image/png;base64,{image_base64}"
            except Exception as e:
                logger.error(f"Failed to encode image to base64: {e}")
                return None
            
        except Exception as e:
            logger.error(f"Failed to add tooth number overlay: {str(e)}")
            return None
    
    def _extract_teeth_from_segmentation(
        self, 
        segmentation_data: Dict, 
        numbering_system: str
    ) -> List[Dict]:
        """
        Extract tooth information from segmentation data.
        
        Returns:
            List of dicts with: tooth_number, x, y, width, height
        """
        teeth = []
        predictions = segmentation_data.get("predictions", [])
        
        if not predictions:
            logger.warning("No predictions found in segmentation data")
            return teeth
        
        logger.info(f"Processing {len(predictions)} tooth predictions")
        
        for pred in predictions:
            try:
                # Get tooth number
                cls = str(pred.get("class", "")).strip()
                tooth_id = int(cls) if cls.isdigit() else None
                
                if tooth_id is None:
                    logger.debug(f"Skipping prediction with invalid class: {cls}")
                    continue
                
                # Get coordinates
                x = float(pred.get("x", 0.0))
                y = float(pred.get("y", 0.0))
                w = float(pred.get("width", 0.0))
                h = float(pred.get("height", 0.0))
                
                # Validate coordinates
                if x < 0 or y < 0 or w <= 0 or h <= 0:
                    logger.warning(f"Invalid coordinates for tooth {tooth_id}: x={x}, y={y}, w={w}, h={h}")
                    continue
                
                # Convert to numbering system if needed
                if numbering_system == "Universal":
                    tooth_number = self._fdi_to_universal(str(tooth_id))
                else:
                    tooth_number = str(tooth_id)
                
                logger.debug(f"Adding tooth {tooth_number} at position ({x}, {y})")
                
                teeth.append({
                    "tooth_number": tooth_number,
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h
                })
                
            except Exception as e:
                logger.warning(f"Skipping tooth due to error: {e}")
                continue
        
        logger.info(f"Successfully extracted {len(teeth)} valid teeth")
        return teeth
    
    def _draw_tooth_number(self, draw: ImageDraw.Draw, font: ImageFont.FreeTypeFont, tooth: Dict):
        """
        Draw a tooth number on the image with outline for visibility.
        """
        tooth_number = tooth["tooth_number"]
        x, y = tooth["x"], tooth["y"]
        
        # Calculate text position (center of tooth bounding box)
        bbox = draw.textbbox((0, 0), tooth_number, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Position text at center of tooth
        text_x = x - (text_width / 2)
        text_y = y - (text_height / 2)
        
        # Draw outline (black background for visibility)
        for dx in range(-self.outline_width, self.outline_width + 1):
            for dy in range(-self.outline_width, self.outline_width + 1):
                if dx != 0 or dy != 0:  # Skip center pixel
                    draw.text((text_x + dx, text_y + dy), tooth_number, font=font, fill=self.outline_color)
        
        # Draw main text
        draw.text((text_x, text_y), tooth_number, font=font, fill=self.text_color)
    
    def _fdi_to_universal(self, fdi_number: str) -> str:
        """
        Convert FDI numbering (11-18, 21-28, 31-38, 41-48) to Universal numbering (1-32)
        """
        try:
            f = int(fdi_number)
            if 11 <= f <= 18:  # Upper right, 11..18 maps to 8..1
                mapping = {11: 8, 12: 7, 13: 6, 14: 5, 15: 4, 16: 3, 17: 2, 18: 1}
                return str(mapping[f])
            if 21 <= f <= 28:  # Upper left, 21..28 maps to 9..16
                return str(8 + (f - 20))  # 9..16
            if 31 <= f <= 38:  # Lower left, 31..38 maps to 24..17
                mapping = {31: 24, 32: 23, 33: 22, 34: 21, 35: 20, 36: 19, 37: 18, 38: 17}
                return str(mapping[f])
            if 41 <= f <= 48:  # Lower right, 41..48 maps to 25..32
                return str(24 + (f - 40))  # 25..32
            return fdi_number
        except ValueError:
            return fdi_number

# Create singleton instance
image_overlay_service = ImageOverlayService()
