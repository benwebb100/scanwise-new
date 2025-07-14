# import os
# import json
# import logging
# from typing import Dict, List
# from openai import OpenAI
# from dotenv import load_dotenv
# from models.analyze import TreatmentStage, TreatmentItem

# load_dotenv()

# logger = logging.getLogger(__name__)

# class OpenAIService:
#     def __init__(self):
#         self.api_key = os.getenv("OPENAI_API_KEY")
#         if not self.api_key:
#             raise ValueError("OpenAI API key must be set")
        
#         self.client = OpenAI(api_key=self.api_key)
    
#     async def analyze_dental_conditions(self, roboflow_predictions: Dict, patient_findings: List[Dict]) -> Dict:
#         """
#         Use GPT-4o to analyze Roboflow predictions and generate treatment plan
#         """
#         try:
#             # Prepare the prompt
#             system_prompt = """You are an expert dental AI assistant analyzing panoramic X-ray results. 
#             Your task is to:
#             1. Summarize detected dental conditions
#             2. Organize treatments into staged approach (Stage 1: Urgent, Stage 2: Preventive)
#             3. Generate professional notes for the dentist
            
#             Return a JSON response with the following structure:
#             {
#                 "summary": "Brief summary of all detected conditions",
#                 "treatment_stages": [
#                     {
#                         "stage": "Stage 1",
#                         "focus": "Urgent issues affecting oral health",
#                         "items": [
#                             {
#                                 "tooth": "tooth_number",
#                                 "condition": "condition_name",
#                                 "recommended_treatment": "treatment"
#                             }
#                         ]
#                     }
#                 ],
#                 "ai_notes": "Professional notes for the dentist"
#             }"""
            
#             # Combine Roboflow predictions with manual findings
#             detections = self._format_detections(roboflow_predictions, patient_findings)
            
#             user_prompt = f"""Analyze these dental X-ray findings:
            
#             Automated Detections:
#             {json.dumps(detections['automated'], indent=2)}
            
#             Manual Findings:
#             {json.dumps(detections['manual'], indent=2)}
            
#             Please provide a comprehensive analysis and treatment plan."""
            
#             response = self.client.chat.completions.create(
#                 model="gpt-4o",
#                 messages=[
#                     {"role": "system", "content": system_prompt},
#                     {"role": "user", "content": user_prompt}
#                 ],
#                 temperature=0.3,
#                 response_format={"type": "json_object"}
#             )
            
#             result = json.loads(response.choices[0].message.content)
#             logger.info("Successfully generated AI analysis")
#             return result
            
#         except Exception as e:
#             logger.error(f"Error in OpenAI analysis: {str(e)}")
#             # Return a fallback response
#             return {
#                 "summary": "Error processing AI analysis",
#                 "treatment_stages": [],
#                 "ai_notes": f"Analysis failed: {str(e)}"
#             }
    
#     def _format_detections(self, roboflow_predictions: Dict, patient_findings: List[Dict]) -> Dict:
#         """Format detections for GPT analysis"""
#         automated = []
        
#         # Process Roboflow predictions
#         if roboflow_predictions and 'predictions' in roboflow_predictions:
#             for pred in roboflow_predictions['predictions']:
#                 automated.append({
#                     'class': pred.get('class', 'Unknown'),
#                     'confidence': pred.get('confidence', 0),
#                     'x': pred.get('x', 0),
#                     'y': pred.get('y', 0),
#                     'width': pred.get('width', 0),
#                     'height': pred.get('height', 0)
#                 })
        
#         # Format manual findings
#         manual = [
#             {
#                 'tooth': f.get('tooth', ''),
#                 'condition': f.get('condition', ''),
#                 'treatment': f.get('treatment', '')
#             }
#             for f in patient_findings
#         ]
        
#         return {
#             'automated': automated,
#             'manual': manual
#         }

# # Create singleton instance
# openai_service = OpenAIService()




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
            # Updated system prompt with more specific formatting
            system_prompt = """You are an expert dental AI assistant analyzing panoramic X-ray results. 
            Your task is to:
            1. Summarize detected dental conditions
            2. Organize treatments into staged approach (Stage 1: Urgent, Stage 2: Preventive, Stage 3: Restorative, Stage 4: Cosmetic)
            3. Generate professional notes for the dentist
            4. Include pricing estimates and ADA codes where applicable

            Return a JSON response with the following structure:
            {
                "summary": "Brief summary of all detected conditions",
                "treatment_stages": [
                    {
                        "stage": "Stage 1",
                        "focus": "Urgent issues affecting oral health",
                        "summary": "Brief description of what this stage includes",
                        "duration": "estimated hours",
                        "items": [
                            {
                                "tooth": "tooth_number",
                                "condition": "condition_name",
                                "recommended_treatment": "treatment",
                                "quantity": 1,
                                "ada_code": "D1234",
                                "price": 100
                            }
                        ]
                    }
                ],
                "ai_notes": "Professional notes for the dentist"
            }

            For treatments, use these standard names:
            - Filling (for cavities)
            - Extraction (for damaged teeth/roots)
            - Root Canal (for infections)
            - Crown (for restorations)
            - Bridge (for missing teeth)
            - Implant (for replacements)
            - Partial Denture (for multiple missing teeth)

            Include appropriate ADA codes:
            - D2330: Filling
            - D7140: Extraction
            - D3310: Root Canal
            - D2740: Crown
            - D6240: Bridge
            - D6010: Implant
            - D5213: Partial Denture

            Use realistic US dental pricing:
            - Filling: $120
            - Extraction: $180
            - Root Canal: $400
            - Crown: $1200
            - Bridge: $850
            - Implant: $2300
            - Partial Denture: $600"""
            
            # Combine Roboflow predictions with manual findings
            detections = self._format_detections(roboflow_predictions, patient_findings)
            
            user_prompt = f"""Analyze these dental X-ray findings:
            
            Automated Detections:
            {json.dumps(detections['automated'], indent=2)}
            
            Manual Findings:
            {json.dumps(detections['manual'], indent=2)}
            
            Please provide a comprehensive analysis and treatment plan with staged treatments."""
            
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
    
    async def generate_video_script(self, treatment_stages: List[Dict], annotated_image_base64: str) -> str:
        """Generate video voiceover script for patient education"""
        try:
            system_prompt = """You are a dental clinician creating a calm, friendly, and easy-to-understand voiceover script for a patient based on their panoramic x-ray. The patient will be watching a video that shows their annotated x-ray with highlighted areas in specific colors. Your job is to explain the findings in a reassuring tone that improves clarity and builds trust.

            Start every script with the following line:

            "I know dental scans can be a little overwhelming, so I've put this video together to guide you through the key findings from your x-ray and help you understand what we're seeing, step by step."

            You will receive:
            - A list of confirmed dentist findings (tooth number, condition, recommended treatment)
            - An annotated x-ray image with highlighted color-coded areas
            - A color legend mapping hex codes to conditions

            You must use the color legend to refer to conditions visually on the scan. For example, say: "In bright yellow, you'll see an impacted tooth on the lower left..." and so on.

            Here is the color legend to use:
            - Bone-level: deep brown (#6C4A35)
            - Caries: light aqua (#58eec3)
            - Crown: magenta pink (#FF00D4)
            - Filling: bright red (#FF004D)
            - Fracture: neon pink (#FF69F8)
            - Impacted tooth: bright yellow (#FFD700)
            - Implant: lime green (#00FF5A)
            - Missing tooth (no distal): sky blue (#4FE2E2)
            - Missing tooth (between): violet purple (#8c28fe)
            - Periapical lesion: bold blue (#007BFF)
            - Post: turquoise (#00FFD5)
            - Root piece: hot pink (#fe4eed)
            - Root canal treatment: bright red (#FF004D)
            - Tissue-level loss: muted gold (#A2925D)

            What to explain:
            For each dentist-confirmed finding, use the image and the color legend to describe what the patient is seeing. Mention:
            - The color-coded area
            - The tooth or area of the mouth (e.g. upper left molar)
            - What the condition means in simple terms
            - What might happen if it's left untreated
            - The suggested treatment

            Use soft, non-definitive clinical language like:
            - "This may require..."
            - "We'd often recommend..."
            - "This is typically treated with..."
            - "One option might be..."

            Group existing dental work (like fillings, implants, crowns, root canals, and posts) into a single sentence at the end, for example:
            "You'll also notice a few areas of dental work already in place — such as fillings in red and implants in green — which appear to be doing their job and helping protect your smile."

            Do not:
            - Mention confidence levels
            - Mention the patient's name
            - Include a closing line
            - Return anything other than clean, plain text"""

            # Extract findings from treatment stages
            findings = []
            for stage in treatment_stages:
                for item in stage.get('items', []):
                    findings.append({
                        'tooth': item.get('tooth', ''),
                        'condition': item.get('condition', ''),
                        'treatment': item.get('recommended_treatment', '')
                    })

            user_prompt = f"""Based on this dental X-ray analysis, create a voiceover script:

    Findings:
    {json.dumps(findings, indent=2)}

    The annotated X-ray shows these conditions highlighted in their respective colors according to the legend.

    Please generate a clear, friendly voiceover script explaining these findings to the patient."""

            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            script = response.choices[0].message.content.strip()
            logger.info("Successfully generated video script")
            return script
            
        except Exception as e:
            logger.error(f"Error generating video script: {str(e)}")
            raise

# Create singleton instance
openai_service = OpenAIService()