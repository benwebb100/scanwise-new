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
        self.base_font_size = 32  # Increased from 24 for better visibility
        self.text_color = (255, 255, 255)  # White text
        self.outline_color = (0, 0, 0)     # Black outline
        self.outline_width = 2
        
        # Condition-based styling
        self.condition_font_size_multiplier = 1.5  # Teeth with conditions get 1.5x larger text
        
    async def add_tooth_number_overlay(
        self, 
        image_url: str, 
        segmentation_data: Dict, 
        numbering_system: str = "FDI",
        show_numbers: bool = True,
        text_size_multiplier: float = 1.0,
        condition_data: Optional[Dict] = None
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
            
            # Calculate font size based on multiplier
            font_size = int(self.base_font_size * text_size_multiplier)
            
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
                    font = ImageFont.truetype(font_path, font_size)
                    logger.info(f"Loaded font from: {font_path} with size {font_size}")
                    break
                except Exception as e:
                    logger.debug(f"Failed to load font from {font_path}: {e}")
                    continue
            
            if font is None:
                logger.warning("No system fonts found, using default font")
                font = ImageFont.load_default()
            
            # Process segmentation data
            teeth = self._extract_teeth_from_segmentation(segmentation_data, numbering_system)
            
            # Draw tooth numbers with condition-based styling
            if teeth:
                logger.info(f"Drawing {len(teeth)} tooth numbers on image")
                for tooth in teeth:
                    self._draw_tooth_number(draw, font, tooth, condition_data, text_size_multiplier)
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
    
    def _draw_tooth_number(self, draw: ImageDraw.Draw, font: ImageFont.FreeTypeFont, tooth: Dict, 
                          condition_data: Optional[Dict] = None, text_size_multiplier: float = 1.0):
        """
        Draw a tooth number on the image with condition-based styling.
        """
        tooth_number = tooth["tooth_number"]
        x, y = tooth["x"], tooth["y"]
        
        # Determine if this tooth has conditions and get styling
        has_condition, condition_color, is_condition_tooth = self._get_tooth_condition_info(
            tooth_number, condition_data
        )
        
        # Use condition-based font size if applicable
        if is_condition_tooth:
            condition_font_size = int(self.base_font_size * self.condition_font_size_multiplier * text_size_multiplier)
            try:
                condition_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", condition_font_size)
            except:
                condition_font = font  # Fallback to original font
        else:
            condition_font = font
        
        # Use condition-based font for this tooth
        current_font = condition_font if is_condition_tooth else font
        
        # Calculate text position (center of tooth bounding box)
        bbox = draw.textbbox((0, 0), tooth_number, font=current_font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Position text at center of tooth
        text_x = x - (text_width / 2)
        text_y = y - (text_height / 2)
        
        # Determine text color based on conditions
        if is_condition_tooth and condition_color:
            text_color = condition_color
            # Use a darker outline for better contrast with colored text
            outline_color = (0, 0, 0)  # Black outline
        else:
            text_color = self.text_color
            outline_color = self.outline_color
        
        # Draw outline for visibility
        outline_width = max(2, int(3 * text_size_multiplier))  # Thicker outline for larger text
        for dx in range(-outline_width, outline_width + 1):
            for dy in range(-outline_width, outline_width + 1):
                if dx != 0 or dy != 0:  # Skip center pixel
                    draw.text((text_x + dx, text_y + dy), tooth_number, font=current_font, fill=outline_color)
        
        # Draw main text
        draw.text((text_x, text_y), tooth_number, font=current_font, fill=text_color)
    
    def _get_tooth_condition_info(self, tooth_number: str, condition_data: Optional[Dict]) -> tuple[bool, Optional[tuple], bool]:
        """
        Determine if a tooth has conditions and get styling information.
        Returns: (has_condition, condition_color, is_condition_tooth)
        """
        if not condition_data or not condition_data.get("predictions"):
            return False, None, False
        
        # Convert tooth number to match condition data format
        # Condition data might use different numbering systems
        tooth_int = int(tooth_number) if tooth_number.isdigit() else None
        if tooth_int is None:
            return False, None, False
        
        # Check if this tooth has any conditions
        has_condition = False
        condition_color = None
        
        for detection in condition_data["predictions"]:
            # Try to match tooth by position or explicit tooth number
            detection_tooth = detection.get("tooth_number") or detection.get("tooth")
            
            if detection_tooth and str(detection_tooth) == tooth_number:
                has_condition = True
                # Get condition type to determine color
                condition_type = detection.get("class", "").lower()
                condition_color = self._get_condition_color(condition_type)
                break
        
        # Also check if this tooth is in the area of any detection
        # This helps catch teeth that might not have explicit tooth numbers but are in problem areas
        for detection in condition_data["predictions"]:
            if self._tooth_in_detection_area(tooth_number, detection):
                has_condition = True
                condition_type = detection.get("class", "").lower()
                if not condition_color:  # Only set if not already set
                    condition_color = self._get_condition_color(condition_type)
                break
        
        return has_condition, condition_color, has_condition
    
    def _get_condition_color(self, condition_type: str) -> Optional[tuple]:
        """
        Get the color for a specific condition type.
        """
        condition_colors = {
            'bone-level': (108, 74, 53),      # #6C4A35
            'caries': (88, 238, 195),         # #58eec3
            'crown': (255, 0, 212),           # #FF00D4
            'filling': (255, 0, 77),          # #FF004D
            'fracture': (255, 105, 248),      # #FF69F8
            'impacted-tooth': (255, 215, 0),  # #FFD700
            'implant': (0, 255, 90),          # #00FF5A
            'missing-teeth-no-distal': (79, 226, 226),  # #4FE2E2
            'missing-tooth-between': (140, 40, 254),    # #8c28fe
            'periapical-lesion': (0, 123, 255),         # #007BFF
            'post': (0, 255, 213),            # #00FFD5
            'root-piece': (254, 78, 237),     # #fe4eed
            'root-canal-treatment': (255, 0, 77),  # #FF004D
            'tissue-level': (162, 146, 93),   # #A2925D
        }
        
        # Normalize condition type
        normalized_condition = condition_type.lower().replace(' ', '-').replace('_', '-')
        return condition_colors.get(normalized_condition)
    
    def _tooth_in_detection_area(self, tooth_number: str, detection: Dict) -> bool:
        """
        Check if a tooth is in the area of a detection.
        This helps catch teeth that might be affected by nearby conditions.
        """
        try:
            tooth_int = int(tooth_number)
            detection_x = float(detection.get("x", 0))
            detection_y = float(detection.get("y", 0))
            detection_w = float(detection.get("width", 0))
            detection_h = float(detection.get("height", 0))
            
            # Get tooth position from segmentation data
            # This is a simplified check - in practice, you'd want to use the actual tooth positions
            # For now, we'll use a heuristic based on tooth numbering
            
            # Check if tooth is in the same quadrant as the detection
            if 11 <= tooth_int <= 18:  # Upper right
                expected_x_range = (0.5, 1.0)
                expected_y_range = (0.0, 0.5)
            elif 21 <= tooth_int <= 28:  # Upper left
                expected_x_range = (0.0, 0.5)
                expected_y_range = (0.0, 0.5)
            elif 31 <= tooth_int <= 38:  # Lower left
                expected_x_range = (0.0, 0.5)
                expected_y_range = (0.5, 1.0)
            elif 41 <= tooth_int <= 48:  # Lower right
                expected_x_range = (0.5, 1.0)
                expected_y_range = (0.5, 1.0)
            else:
                return False
            
            # Check if detection overlaps with expected tooth area
            # This is a simplified overlap check
            detection_center_x = detection_x / 1000.0  # Normalize to 0-1 range
            detection_center_y = detection_y / 1000.0  # Normalize to 0-1 range
            
            return (expected_x_range[0] <= detection_center_x <= expected_x_range[1] and
                    expected_y_range[0] <= detection_center_y <= expected_y_range[1])
                    
        except (ValueError, TypeError):
            return False
    
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
