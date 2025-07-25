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
2. Organize treatments into a staged approach (Stage 1: Urgent, Stage 2: Preventive, Stage 3: Restorative, Stage 4: Cosmetic) — but only include the number of stages actually needed. Do not include empty stages. If there is only one stage required, use the label “Treatment Overview” instead of Stage 1.
3. Group treatments together logically to minimize number of stages if appropriate (e.g. fillings and crown may be done in the same visit).
4. Generate professional notes for the dentist
5. Include pricing estimates and ADA codes where applicable

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
                    "price": 100,
                    "confidence": 0.95
                }
            ]
        }
    ],
    "ai_notes": "Professional notes for the dentist",
    "detections": []
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
- Partial Denture: $600

Also generate a detailed, patient-friendly condition explanation box for each treatment, with the following elements:

1. Title: Always use the format "Treatment for Condition" (e.g. "Extraction for Periapical Lesion")
2. Definition: Begin the paragraph with a short explanation of the condition in plain language (e.g. “A periapical lesion is an infection at the tip of a tooth root.”)
3. Status Line: Describe how many teeth are affected and that it needs attention.
4. Recommended Treatment: Describe the procedure, what it does, estimated time, and recovery.
5. Risks if Untreated: Use 🔴 as the emoji for this section. Clearly explain the health consequences, and also include cosmetic/aesthetic effects *if they realistically apply* (e.g. visible gaps, smile changes, discoloration). Do not exaggerate.

Keep the tone professional, educational, and reassuring. Avoid clinical jargon unless it is immediately explained. Keep all language human-readable and non-alarming."""
            
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
            
            # Add the raw detections with confidence scores to the result
            result['detections'] = detections['automated']
            
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
- A color legend mapping conditions to visual highlight colors

When referring to the image, always describe the condition by its plain color name — never mention hex codes. For example, say: "In purple, you'll see an impacted tooth on the lower left..." or "The bright red area shows a filling on your upper molar."

Here is the color legend to use:
- Bone-level: deep brown
- Caries: light aqua
- Crown: magenta pink
- Filling: bright red
- Fracture: neon pink
- Impacted tooth: bright yellow
- Implant: lime green
- Missing tooth (no distal): sky blue
- Missing tooth (between): violet purple
- Periapical lesion: bold blue
- Post: turquoise
- Root piece: hot pink
- Root canal treatment: bright red
- Tissue-level loss: muted gold

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
