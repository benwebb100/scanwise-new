import logging
import json
import math
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import openai
import os
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class Detection:
    class_name: str
    confidence: float
    x: float
    y: float
    width: float
    height: float

@dataclass
class ToothMapping:
    detection_id: int
    tooth_number: str  # FDI numbering (1-32)
    universal_number: str  # Universal numbering (1-32)
    confidence: float
    method: str
    reasoning: str
    gpt_prediction: Optional[str] = None
    grid_prediction: Optional[str] = None

@dataclass
class MappingResult:
    mappings: List[ToothMapping]
    overall_confidence: float
    processing_time: float
    method_used: str

class ToothMappingService:
    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
    def map_teeth_ensemble(self, image_url: str, detections: List[Detection], numbering_system: str = "FDI") -> MappingResult:
        """
        Ensemble tooth mapping using GPT-4 Vision + Grid + GPT Referee
        """
        start_time = datetime.now()
        
        try:
            logger.info(f"Starting ensemble tooth mapping for {len(detections)} detections with {numbering_system} numbering")
            
            # Step 1: GPT-4 Vision Analysis
            gpt_result = self._map_teeth_gpt4(image_url, detections, numbering_system)
            
            # Step 2: Grid-based Analysis
            grid_result = self._map_teeth_grid(detections, numbering_system)
            
            # Step 3: GPT Referee for final decision
            final_result = self._gpt_referee(image_url, gpt_result, grid_result, numbering_system)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return MappingResult(
                mappings=final_result,
                overall_confidence=sum(m.confidence for m in final_result) / len(final_result),
                processing_time=processing_time,
                method_used="ensemble_gpt4_grid_referee"
            )
            
        except Exception as e:
            logger.error(f"Ensemble mapping failed: {str(e)}")
            # Fallback to grid-only mapping
            grid_result = self._map_teeth_grid(detections, numbering_system)
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return MappingResult(
                mappings=grid_result,
                overall_confidence=sum(m.confidence for m in grid_result) / len(grid_result),
                processing_time=processing_time,
                method_used="grid_fallback"
            )
    
    def _map_teeth_gpt4(self, image_url: str, detections: List[Detection], numbering_system: str = "FDI") -> List[ToothMapping]:
        """
        Use GPT-4 Vision to map teeth based on visual analysis
        """
        try:
            # Create detailed prompt for dental analysis
            prompt = self._create_gpt4_prompt(detections, numbering_system)
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_url
                                }
                            }
                        ]
                    }
                ],
                max_tokens=2000,
                temperature=0.1
            )
            
            # Parse GPT-4 response
            content = response.choices[0].message.content
            return self._parse_gpt4_response(content, detections)
            
        except Exception as e:
            logger.error(f"GPT-4 mapping failed: {str(e)}")
            raise
    
    def _map_teeth_grid(self, detections: List[Detection], numbering_system: str = "FDI") -> List[ToothMapping]:
        """
        Grid-based tooth mapping using coordinate analysis
        """
        mappings = []
        
        for i, detection in enumerate(detections):
            # Normalize coordinates (assuming image is 800x400 typical panoramic)
            normalized_x = detection.x / 800.0
            normalized_y = detection.y / 400.0
            
            # Map to tooth number based on position
            tooth_number, universal_number, confidence, reasoning = self._grid_to_tooth(normalized_x, normalized_y, detection.class_name)
            
            # Use the preferred numbering system
            final_tooth_number = universal_number if numbering_system == "Universal" else tooth_number
            
            mappings.append(ToothMapping(
                detection_id=i,
                tooth_number=final_tooth_number,
                universal_number=universal_number,
                confidence=confidence,
                method="grid",
                reasoning=reasoning,
                grid_prediction=final_tooth_number
            ))
        
        return mappings
    
    def _gpt_referee(self, image_url: str, gpt_result: List[ToothMapping], grid_result: List[ToothMapping], numbering_system: str = "FDI") -> List[ToothMapping]:
        """
        Use GPT-4 as referee to resolve conflicts between GPT and Grid predictions
        """
        try:
            # Create referee prompt
            referee_prompt = self._create_referee_prompt(gpt_result, grid_result, numbering_system)
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": referee_prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_url
                                }
                            }
                        ]
                    }
                ],
                max_tokens=2000,
                temperature=0.1
            )
            
            # Parse referee response
            content = response.choices[0].message.content
            return self._parse_referee_response(content, gpt_result, grid_result)
            
        except Exception as e:
            logger.error(f"GPT referee failed: {str(e)}")
            # Fallback to GPT result if referee fails
            return gpt_result
    
    def _create_gpt4_prompt(self, detections: List[Detection], numbering_system: str = "FDI") -> str:
        """
        Create detailed prompt for GPT-4 Vision dental analysis
        """
        detections_json = json.dumps([
            {
                "id": i,
                "class": d.class_name,
                "confidence": d.confidence,
                "coordinates": {"x": d.x, "y": d.y, "width": d.width, "height": d.height}
            }
            for i, d in enumerate(detections)
        ], indent=2)
        
        if numbering_system == "Universal":
            numbering_info = """
UNIVERSAL TOOTH NUMBERING:
- Upper right: 1-8 (1=third molar, 8=central incisor)
- Upper left: 9-16 (9=central incisor, 16=third molar)
- Lower left: 17-24 (17=third molar, 24=central incisor)
- Lower right: 25-32 (25=central incisor, 32=third molar)
"""
        else:
            numbering_info = """
FDI TOOTH NUMBERING:
- Upper right: 1-8 (1=central incisor, 8=third molar)
- Upper left: 9-16 (9=central incisor, 16=third molar)
- Lower left: 17-24 (17=central incisor, 24=third molar)
- Lower right: 25-32 (25=central incisor, 32=third molar)
"""
        
        return f"""
You are a dental expert analyzing a panoramic X-ray for tooth mapping.

DETECTIONS:
{detections_json}

TASK:
For each detection, identify the specific tooth number using the {numbering_system} numbering system.

{numbering_info}

ANALYSIS GUIDELINES:
1. Consider the condition type and typical locations
2. Look at anatomical landmarks and tooth shapes
3. Consider the patient's head position and image quality
4. Account for common variations in panoramic positioning

RESPONSE FORMAT:
Return a JSON array with this structure:
{{
  "mappings": [
    {{
      "detection_id": 0,
      "tooth_number": "14",
      "confidence": 0.92,
      "reasoning": "This caries is clearly in the upper right first premolar area, positioned between the canine and second premolar. The anatomical landmarks confirm this is tooth #14."
    }}
  ]
}}

Be precise and provide detailed reasoning for each mapping.
"""
    
    def _create_referee_prompt(self, gpt_result: List[ToothMapping], grid_result: List[ToothMapping], numbering_system: str = "FDI") -> str:
        """
        Create prompt for GPT referee to resolve conflicts
        """
        conflicts = []
        for gpt_mapping in gpt_result:
            grid_mapping = next((g for g in grid_result if g.detection_id == gpt_mapping.detection_id), None)
            if grid_mapping and gpt_mapping.tooth_number != grid_mapping.tooth_number:
                conflicts.append({
                    "detection_id": gpt_mapping.detection_id,
                    "gpt_prediction": gpt_mapping.tooth_number,
                    "grid_prediction": grid_mapping.tooth_number,
                    "gpt_reasoning": gpt_mapping.reasoning,
                    "grid_reasoning": grid_mapping.reasoning
                })
        
        conflicts_json = json.dumps(conflicts, indent=2)
        
        numbering_info = "FDI" if numbering_system == "FDI" else "Universal"
        
        return f"""
You are a dental expert referee resolving tooth mapping conflicts using {numbering_info} numbering system.

CONFLICTS TO RESOLVE:
{conflicts_json}

TASK:
For each conflict, analyze both predictions and make a final decision using {numbering_info} numbering.

CONSIDER:
1. Visual evidence in the image
2. Anatomical landmarks
3. Condition type and typical locations
4. Coordinate positioning vs visual analysis
5. Clinical reasoning from both methods

RESPONSE FORMAT:
Return a JSON array with this structure:
{{
  "resolutions": [
    {{
      "detection_id": 0,
      "final_tooth": "14",
      "confidence": 0.95,
      "gpt_prediction": "14",
      "grid_prediction": "13",
      "final_reasoning": "GPT is correct. The caries is clearly in the upper right premolar area. The grid coordinates were misleading due to patient head tilt."
    }}
  ]
}}

Provide detailed reasoning for each final decision.
"""
    
    def _parse_gpt4_response(self, content: str, detections: List[Detection]) -> List[ToothMapping]:
        """
        Parse GPT-4 response into ToothMapping objects
        """
        try:
            # Extract JSON from response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            json_str = content[json_start:json_end]
            
            data = json.loads(json_str)
            mappings = []
            
            for mapping_data in data.get('mappings', []):
                fdi_number = mapping_data['tooth_number']
                universal_number = self._fdi_to_universal(fdi_number)
                
                mappings.append(ToothMapping(
                    detection_id=mapping_data['detection_id'],
                    tooth_number=fdi_number,
                    universal_number=universal_number,
                    confidence=mapping_data['confidence'],
                    method="gpt4_vision",
                    reasoning=mapping_data['reasoning'],
                    gpt_prediction=fdi_number
                ))
            
            return mappings
            
        except Exception as e:
            logger.error(f"Failed to parse GPT-4 response: {str(e)}")
            raise
    
    def _parse_referee_response(self, content: str, gpt_result: List[ToothMapping], grid_result: List[ToothMapping]) -> List[ToothMapping]:
        """
        Parse referee response and create final mappings
        """
        try:
            # Extract JSON from response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            json_str = content[json_start:json_end]
            
            data = json.loads(json_str)
            final_mappings = []
            
            # Create lookup for conflicts
            conflicts = {r['detection_id']: r for r in data.get('resolutions', [])}
            
            for gpt_mapping in gpt_result:
                if gpt_mapping.detection_id in conflicts:
                    # Use referee decision
                    resolution = conflicts[gpt_mapping.detection_id]
                    final_tooth = resolution['final_tooth']
                    universal_number = self._fdi_to_universal(final_tooth)
                    
                    final_mappings.append(ToothMapping(
                        detection_id=gpt_mapping.detection_id,
                        tooth_number=final_tooth,
                        universal_number=universal_number,
                        confidence=resolution['confidence'],
                        method="gpt4_referee",
                        reasoning=resolution['final_reasoning'],
                        gpt_prediction=gpt_mapping.tooth_number,
                        grid_prediction=next((g.tooth_number for g in grid_result if g.detection_id == gpt_mapping.detection_id), None)
                    ))
                else:
                    # No conflict, use GPT result
                    final_mappings.append(gpt_mapping)
            
            return final_mappings
            
        except Exception as e:
            logger.error(f"Failed to parse referee response: {str(e)}")
            # Fallback to GPT result
            return gpt_result
    
    def _grid_to_tooth(self, normalized_x: float, normalized_y: float, condition: str) -> Tuple[str, float, str]:
        """
        Map normalized coordinates to tooth number using grid-based logic
        """
        # Define tooth zones based on typical panoramic positioning
        # This is a simplified grid mapping - can be refined with more sophisticated logic
        
        # Horizontal zones (left to right)
        if normalized_x < 0.125: zone_x = 0  # Far left
        elif normalized_x < 0.25: zone_x = 1
        elif normalized_x < 0.375: zone_x = 2
        elif normalized_x < 0.5: zone_x = 3
        elif normalized_x < 0.625: zone_x = 4
        elif normalized_x < 0.75: zone_x = 5
        elif normalized_x < 0.875: zone_x = 6
        else: zone_x = 7  # Far right
        
        # Vertical zones (top to bottom)
        if normalized_y < 0.5: zone_y = "upper"  # Upper arch
        else: zone_y = "lower"  # Lower arch
        
        # Map zones to tooth numbers (FDI system)
        tooth_mapping = {
            ("upper", 0): "1", ("upper", 1): "2", ("upper", 2): "3", ("upper", 3): "4",
            ("upper", 4): "5", ("upper", 5): "6", ("upper", 6): "7", ("upper", 7): "8",
            ("upper", 8): "9", ("upper", 9): "10", ("upper", 10): "11", ("upper", 11): "12",
            ("upper", 12): "13", ("upper", 13): "14", ("upper", 14): "15", ("upper", 15): "16",
            ("lower", 0): "17", ("lower", 1): "18", ("lower", 2): "19", ("lower", 3): "20",
            ("lower", 4): "21", ("lower", 5): "22", ("lower", 6): "23", ("lower", 7): "24",
            ("lower", 8): "25", ("lower", 9): "26", ("lower", 10): "27", ("lower", 11): "28",
            ("lower", 12): "29", ("lower", 13): "30", ("lower", 14): "31", ("lower", 15): "32"
        }
        
        # Adjust for left/right side
        if zone_x < 4:  # Left side
            tooth_number = tooth_mapping.get((zone_y, zone_x), "Unknown")
        else:  # Right side
            adjusted_zone = zone_x - 4
            tooth_number = tooth_mapping.get((zone_y, adjusted_zone), "Unknown")
        
        # Calculate confidence based on position accuracy
        x_accuracy = 1 - abs(normalized_x - (zone_x * 0.125 + 0.0625)) / 0.125
        y_accuracy = 1 - abs(normalized_y - (0.25 if zone_y == "upper" else 0.75)) / 0.25
        confidence = (x_accuracy + y_accuracy) / 2
        
        # Adjust confidence based on condition type
        condition_confidence_boost = {
            "caries": 0.1,  # Caries are easier to locate
            "fracture": 0.05,  # Fractures can be more ambiguous
            "missing-tooth": 0.15,  # Missing teeth are very clear
            "periapical-lesion": 0.0,  # Lesions can be harder to pinpoint
        }
        
        confidence += condition_confidence_boost.get(condition.lower(), 0.0)
        confidence = min(confidence, 0.95)  # Cap at 95%
        
        reasoning = f"Grid mapping: {zone_y} arch, zone {zone_x} (x={normalized_x:.2f}, y={normalized_y:.2f})"
        
        # Convert FDI to Universal numbering
        universal_number = self._fdi_to_universal(tooth_number)
        
        return tooth_number, universal_number, confidence, reasoning

    def _fdi_to_universal(self, fdi_number: str) -> str:
        """
        Convert FDI numbering to Universal numbering
        FDI: 1-32 (1=upper right central incisor, 32=lower right third molar)
        Universal: 1-32 (1=upper right third molar, 32=lower right third molar)
        """
        try:
            fdi_int = int(fdi_number)
            # Universal numbering is the same as FDI for most teeth
            # The main difference is in the molars (1-4, 13-16, 17-20, 29-32)
            if fdi_int in [1, 2, 3, 4]:  # Upper right molars
                universal_map = {1: 1, 2: 2, 3: 3, 4: 4}
            elif fdi_int in [5, 6, 7, 8]:  # Upper right premolars/canines/incisors
                universal_map = {5: 5, 6: 6, 7: 7, 8: 8}
            elif fdi_int in [9, 10, 11, 12]:  # Upper left incisors/canines/premolars
                universal_map = {9: 9, 10: 10, 11: 11, 12: 12}
            elif fdi_int in [13, 14, 15, 16]:  # Upper left molars
                universal_map = {13: 13, 14: 14, 15: 15, 16: 16}
            elif fdi_int in [17, 18, 19, 20]:  # Lower left molars
                universal_map = {17: 17, 18: 18, 19: 19, 20: 20}
            elif fdi_int in [21, 22, 23, 24]:  # Lower left premolars/canines/incisors
                universal_map = {21: 21, 22: 22, 23: 23, 24: 24}
            elif fdi_int in [25, 26, 27, 28]:  # Lower right incisors/canines/premolars
                universal_map = {25: 25, 26: 26, 27: 27, 28: 28}
            elif fdi_int in [29, 30, 31, 32]:  # Lower right molars
                universal_map = {29: 29, 30: 30, 31: 31, 32: 32}
            else:
                return fdi_number  # Fallback
            
            return str(universal_map.get(fdi_int, fdi_int))
        except ValueError:
            return fdi_number  # Return original if not a number

# Global instance
tooth_mapping_service = ToothMappingService()
