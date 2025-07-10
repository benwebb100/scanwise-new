import os
import json
import logging
from typing import Dict, List
from openai import OpenAI
from dotenv import load_dotenv
from models.analyze import TreatmentStage, TreatmentItem

load_dotenv()

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key must be set")
        
        self.client = OpenAI(api_key=self.api_key)
    
    async def analyze_dental_conditions(self, roboflow_predictions: Dict, patient_findings: List[Dict]) -> Dict:
        """
        Use GPT-4o to analyze Roboflow predictions and generate treatment plan
        """
        try:
            # Prepare the prompt
            system_prompt = """You are an expert dental AI assistant analyzing panoramic X-ray results. 
            Your task is to:
            1. Summarize detected dental conditions
            2. Organize treatments into staged approach (Stage 1: Urgent, Stage 2: Preventive)
            3. Generate professional notes for the dentist
            
            Return a JSON response with the following structure:
            {
                "summary": "Brief summary of all detected conditions",
                "treatment_stages": [
                    {
                        "stage": "Stage 1",
                        "focus": "Urgent issues affecting oral health",
                        "items": [
                            {
                                "tooth": "tooth_number",
                                "condition": "condition_name",
                                "recommended_treatment": "treatment"
                            }
                        ]
                    }
                ],
                "ai_notes": "Professional notes for the dentist"
            }"""
            
            # Combine Roboflow predictions with manual findings
            detections = self._format_detections(roboflow_predictions, patient_findings)
            
            user_prompt = f"""Analyze these dental X-ray findings:
            
            Automated Detections:
            {json.dumps(detections['automated'], indent=2)}
            
            Manual Findings:
            {json.dumps(detections['manual'], indent=2)}
            
            Please provide a comprehensive analysis and treatment plan."""
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info("Successfully generated AI analysis")
            return result
            
        except Exception as e:
            logger.error(f"Error in OpenAI analysis: {str(e)}")
            # Return a fallback response
            return {
                "summary": "Error processing AI analysis",
                "treatment_stages": [],
                "ai_notes": f"Analysis failed: {str(e)}"
            }
    
    def _format_detections(self, roboflow_predictions: Dict, patient_findings: List[Dict]) -> Dict:
        """Format detections for GPT analysis"""
        automated = []
        
        # Process Roboflow predictions
        if roboflow_predictions and 'predictions' in roboflow_predictions:
            for pred in roboflow_predictions['predictions']:
                automated.append({
                    'class': pred.get('class', 'Unknown'),
                    'confidence': pred.get('confidence', 0),
                    'x': pred.get('x', 0),
                    'y': pred.get('y', 0),
                    'width': pred.get('width', 0),
                    'height': pred.get('height', 0)
                })
        
        # Format manual findings
        manual = [
            {
                'tooth': f.get('tooth', ''),
                'condition': f.get('condition', ''),
                'treatment': f.get('treatment', '')
            }
            for f in patient_findings
        ]
        
        return {
            'automated': automated,
            'manual': manual
        }

# Create singleton instance
openai_service = OpenAIService()