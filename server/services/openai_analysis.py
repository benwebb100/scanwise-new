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
        
        # Centralized, env-driven model configuration
        # Using valid model names (gpt-4o instead of gpt-5 which doesn't exist)
        self.model_analysis = os.getenv("OPENAI_MODEL_ANALYSIS", "gpt-4o")
        self.model_html = os.getenv("OPENAI_MODEL_HTML", "gpt-4o")
        self.model_edit = os.getenv("OPENAI_MODEL_EDIT", "gpt-4o")
        self.model_summary = os.getenv("OPENAI_MODEL_SUMMARY", "gpt-4o")
        self.model_script = os.getenv("OPENAI_MODEL_SCRIPT", "gpt-4o")
    
    async def analyze_dental_conditions(self, roboflow_predictions: Dict, patient_findings: List[Dict]) -> Dict:
        """
        Use GPT to analyze Roboflow predictions and generate treatment plan
        """
        try:
            # Updated system prompt with more specific formatting
            system_prompt = """You are an expert dental AI assistant analyzing panoramic X-ray results. 
Your task is to:
1. Summarize detected dental conditions
2. Organize treatments into a staged approach (Stage 1: Urgent, Stage 2: Preventive, Stage 3: Restorative, Stage 4: Cosmetic) — but only include the number of stages actually needed. Do not include empty stages. If there is only one stage required, use the label "Treatment Overview" instead of Stage 1.
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
2. Definition: Begin the paragraph with a short explanation of the condition in plain language (e.g. "A periapical lesion is an infection at the tip of a tooth root.")
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
                model=self.model_analysis,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
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

    def _get_urgency_level(self, condition: str) -> str:
        """Determine urgency level based on hard-coded clinical logic"""
        # Normalize condition name
        normalized_condition = condition.lower().replace(' ', '-').replace('_', '-')
        
        # HIGH URGENCY (Infection/Active Disease)
        high_urgency_conditions = {
            'caries', 'periapical-lesion', 'fracture', 'root-piece'
        }
        
        # MEDIUM URGENCY (Structural/Progressive)
        medium_urgency_conditions = {
            'impacted-tooth', 'missing-teeth-no-distal', 'missing-tooth-between', 
            'bone-level', 'tissue-level'
        }
        
        if normalized_condition in high_urgency_conditions:
            return 'high'
        elif normalized_condition in medium_urgency_conditions:
            return 'medium'
        else:
            # LOW URGENCY (Existing dental work or other conditions)
            return 'low'
    
    async def generate_video_script(self, treatment_stages: List[Dict], annotated_image_base64: str, patient_name: str = None, language: str = "english") -> str:
        """Generate video voiceover script for patient education using vision model"""
        try:
            # Determine language-specific instructions
            language_name = "Bulgarian" if language.lower() == "bulgarian" else "English"
            language_instruction = ""
            if language.lower() == "bulgarian":
                language_instruction = "\n\n**CRITICAL: Generate the ENTIRE script in Bulgarian language. Use proper Bulgarian grammar, dental terminology, and natural phrasing. Do NOT use English.**\n"
            
            system_prompt = f"""You are a **professional dental education specialist** creating a **clear, concise, and easy-to-understand** voiceover script for **dental patient education** based on a panoramic x-ray.{language_instruction}

This is for **professional dental practice communication** - a standard educational video that shows an **annotated dental x-ray** with **color-coded highlights** for patient understanding.

Your goal is to explain what each highlighted color represents, what it means for their dental health, and what treatments are planned — in friendly, plain {language_name}.

---

### 🎬 OPENING LINE

Start every script with:

**"Hi {{patient_name}}, here's a quick explanation of what we found in your x-ray."**

If no name is provided, use:
**"Hi there, here's a quick explanation of what we found in your x-ray."**

Then continue straight into the findings.

---

### 🗂️ INPUT YOU WILL RECEIVE

You will receive:
- A JSON list of confirmed dentist findings (tooth number, condition, and recommended treatment)
- An annotated x-ray image with color-coded highlights
- A color legend mapping conditions to highlight colors

You may use the image to identify:
- Approximate positions (upper/lower, left/right)
- Number of instances of each color
- Grouped regions (e.g. "across the bottom row" or "mainly on the top right")

---

### 🎨 COLOR LEGEND (Plain Names Only)

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

Always refer to colors by their plain names — never use hex codes or technical terms.

---

### 🧩 SCRIPT STRUCTURE — GROUPED BY CONDITION

Group findings by **condition/color**, not by tooth number.

For each color/condition present, generate one paragraph following this structure:

1. **Intro line (color + count + location)**
   - "You'll notice several [color] areas across your scan — these represent [condition]."
   - If one area only: "You'll see a [color] highlight along the [directional region] — this shows [condition]."

2. **Condition meaning (plain-English)**
   - Explain simply what the condition is and what it means.

3. **Consequences if untreated (gentle, factual)**
   - "If left untreated, this can sometimes lead to…"

4. **Treatment plan (based on JSON + visual cues)**
   - Use JSON to describe planned treatments.
   - Example:
     "All of these are planned for extraction."
     "Three will be removed, while one on the upper right will remain since it isn't causing issues."
   - Use regional terms (upper/lower, left/right), not tooth numbers.

---

### ⚙️ STYLE GUIDELINES

- Do **not** mention tooth numbers, confidence levels, or patient names in the main narration.
- Use **soft phrasing**:
  "This may require…", "We'd usually recommend…", "One option might be…"
- Tone: professional, calm, conversational, not overly emotional.
- Keep sentences short and clear.
- Do **not** include an outro — stop after the final relevant paragraph."""

            # Extract findings from treatment stages
            findings = []
            for stage in treatment_stages:
                for item in stage.get('items', []):
                    findings.append({
                        'tooth': item.get('tooth', ''),
                        'condition': item.get('condition', ''),
                        'treatment': item.get('recommended_treatment', '')
                    })

            # Identify existing dental work conditions
            EXISTING_WORK_CONDITIONS = {
                'filling': 'bright red',
                'crown': 'magenta pink',
                'implant': 'lime green',
                'root-canal-treatment': 'bright red',
                'root canal treatment': 'bright red',
                'post': 'turquoise'
            }
            
            # Check which existing dental work is actually present
            existing_work_found = []
            for finding in findings:
                condition = finding.get('condition', '').lower()
                if condition in EXISTING_WORK_CONDITIONS:
                    color = EXISTING_WORK_CONDITIONS[condition]
                    # Format condition name nicely
                    condition_display = condition.replace('-', ' ').replace('root canal treatment', 'root canal treatment')
                    existing_work_found.append({
                        'condition': condition_display,
                        'color': color
                    })
            
            # Remove duplicates
            seen = set()
            unique_existing_work = []
            for work in existing_work_found:
                key = (work['condition'], work['color'])
                if key not in seen:
                    seen.add(key)
                    unique_existing_work.append(work)
            
            logger.info(f"🦷 Existing dental work found: {unique_existing_work}")

            # Prepare patient name for greeting
            greeting_name = patient_name if patient_name else None
            name_instruction = f"Use the patient name '{patient_name}' in the opening greeting." if greeting_name else "Use 'Hi there' in the opening greeting since no patient name was provided."
            
            # Language-specific instruction
            language_reminder = ""
            if language.lower() == "bulgarian":
                language_reminder = "\n\n**REMINDER: Write the ENTIRE script in Bulgarian language, not English.**"

            # Build existing dental work instruction if applicable
            existing_work_instruction = ""
            if unique_existing_work:
                work_descriptions = []
                for work in unique_existing_work:
                    work_descriptions.append(f"{work['color']} ({work['condition']})")
                
                work_list = ", ".join(work_descriptions)
                existing_work_instruction = f"""

**IMPORTANT - EXISTING DENTAL WORK:**
The patient has the following existing dental work that should be mentioned at the END of the script:
{work_list}

Include a final paragraph like: "You'll also see some existing dental work — like the [list colors] areas — showing your [list conditions, e.g. fillings and root canal treatments]. Everything there looks stable and functioning well."

Use the actual colors and conditions from the list above."""
            else:
                existing_work_instruction = """

**IMPORTANT - NO EXISTING DENTAL WORK:**
Do NOT include any paragraph about existing dental work, as none is present in this case."""

            user_prompt = f"""Based on this dental X-ray analysis, create a concise, grouped-by-condition voiceover script IN {language_name.upper()}.

{name_instruction}{language_reminder}

Findings:
{json.dumps(findings, indent=2)}

The annotated X-ray shows these conditions highlighted in their respective colors according to the legend.

Please analyze the uploaded annotated X-ray image as well, and use it to identify approximate regions (upper/lower, left/right) and how many times each color appears.
{existing_work_instruction}

Generate a short, friendly script IN {language_name.upper()} following the structure in the system prompt."""

            # Use vision-capable model (gpt-4o or gpt-4o-mini)
            response = self.client.chat.completions.create(
                model="gpt-4o",  # Vision-capable model
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{annotated_image_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_completion_tokens=1500  # Increased for more detailed vision-based analysis
            )
            
            script = response.choices[0].message.content.strip()
            
            # Check if OpenAI refused the request (safety filter)
            if "sorry" in script.lower() and ("can't" in script.lower() or "cannot" in script.lower()):
                logger.warning("⚠️ OpenAI safety filter detected - falling back to text-only script generation")
                # Fallback: generate script without image analysis
                fallback_response = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_completion_tokens=1500
                )
                script = fallback_response.choices[0].message.content.strip()
                logger.info("✅ Generated fallback script without image")
            
            logger.info(f"✅ Successfully generated video script in {language_name} using vision model")
            logger.info(f"📝 Script length: {len(script)} characters")
            logger.info(f"📝 Script preview (first 150 chars): {script[:150]}")
            return script
            
        except Exception as e:
            logger.error(f"Error generating video script: {str(e)}")
            raise
    
    async def generate_immediate_findings_summary(self, roboflow_predictions: Dict) -> Dict:
        """
        Generate immediate findings summary for dentist reference
        """
        try:
            system_prompt = """You are an expert dental AI assistant analyzing panoramic X-ray results. 
            Your task is to provide a comprehensive summary of detected conditions to help the dentist 
            understand what the AI has found and use this information to fill out their findings.

            For each detection, provide:
            1. Clear description of the condition
            2. Location details (which teeth/areas affected)
            3. Clinical significance
            4. Recommended next steps
            5. Confidence assessment

            Return a JSON response with the following structure:
            {
                "overall_summary": "Brief overview of all findings",
                "detailed_findings": [
                    {
                        "condition": "condition_name",
                        "description": "detailed description",
                        "affected_areas": "specific teeth or regions",
                        "clinical_significance": "what this means clinically",
                        "recommended_action": "suggested treatment approach",
                        "confidence_note": "interpretation of AI confidence",
                        "urgency": "low/medium/high"
                    }
                ],
                "total_detections": 0,
                "high_confidence_count": 0,
                "areas_needing_attention": ["list of specific areas"]
            }

            Use professional dental terminology but keep explanations clear for clinical decision-making.
            
            IMPORTANT: For urgency levels, use this hard-coded logic instead of clinical judgment:
            - HIGH URGENCY: caries, periapical-lesion, fracture, root-piece
            - MEDIUM URGENCY: impacted-tooth, missing-teeth-no-distal, missing-tooth-between, bone-level, tissue-level
            - LOW URGENCY: All other conditions (existing dental work like crown, filling, implant, post, root-canal-treatment)
            
            Always use the exact condition name from the detection for urgency determination."""
            
            # Format detections for analysis
            detections = []
            if roboflow_predictions and 'predictions' in roboflow_predictions:
                for pred in roboflow_predictions['predictions']:
                    detections.append({
                        'class': pred.get('class', 'Unknown'),
                        'confidence': pred.get('confidence', 0),
                        'location': {
                            'x': pred.get('x', 0),
                            'y': pred.get('y', 0),
                            'width': pred.get('width', 0),
                            'height': pred.get('height', 0)
                        }
                    })
            
            user_prompt = f"""Analyze these AI-detected dental conditions from the panoramic X-ray:

            Detections:
            {json.dumps(detections, indent=2)}

            Please provide a comprehensive clinical summary to assist the dentist in their assessment."""
            
            response = self.client.chat.completions.create(
                model=self.model_summary,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info("Successfully generated immediate findings summary")
            return result
            
        except Exception as e:
            logger.error(f"Error generating immediate findings summary: {str(e)}")
            return {
                "overall_summary": "Error processing AI analysis",
                "detailed_findings": [],
                "total_detections": 0,
                "high_confidence_count": 0,
                "areas_needing_attention": []
            }

    async def generate_html_report_content(self, patient_findings: List[Dict], patient_name: str) -> str:
        """
        Generate HTML report content directly from dentist findings using GPT
        """
        try:
            system_prompt = """You are an expert dental AI assistant creating a comprehensive treatment report. 
            Your task is to generate a complete HTML report based on the dentist's confirmed findings.

            Generate a professional, patient-friendly HTML report with the following sections:

            1. TREATMENT OVERVIEW TABLE:
            - Create a clean table showing: Tooth, Condition, Recommended Treatment, Importance/Urgency
            - Use clear, professional formatting
            - Do not include pricing information

            2. TREATMENT PLAN SUMMARY:
            - Provide a clear, concise summary of the overall treatment plan
            - Explain the approach and timeline
            - Keep it reassuring and educational

            3. CONDITION EXPLANATION BOXES:
            - For each finding, create a detailed explanation box
            - Format: "[Treatment] for [Condition]" (e.g., "Filling for Caries")
            - Include: What the condition is, why treatment is needed, what the treatment involves
            - Add urgency/importance level
            - Use 🔴 emoji for risks if untreated

            CRITICAL REQUIREMENTS FOR CONDITION DESCRIPTIONS:
            - Each "What This Means" section must be COMPLETE and COMPREHENSIVE
            - NEVER leave descriptions incomplete or cut off mid-sentence
            - For CARIES/CAVITIES: Explain what causes cavities, how they progress, symptoms, and why early treatment is crucial
            - For PERIAPICAL LESIONS: Explain infection at tooth root, causes, symptoms, and risks of untreated infection
            - For IMPACTED TEETH: Explain what makes a tooth impacted, symptoms, complications, and treatment necessity
            - For ROOT PIECES: Explain what root pieces are, why they remain, infection risks, and removal importance
            - For FRACTURES: Explain types of fractures, symptoms, complications, and treatment urgency
            - Each description should be 3-5 sentences minimum, explaining cause, symptoms, progression, and risks

            IMPORTANT REQUIREMENTS:
            - Use ONLY the dentist's confirmed findings (patient_findings)
            - Do NOT use any AI detections or automated findings
            - Generate complete, valid HTML with proper styling
            - Include CSS styling inline for a professional appearance
            - Make the report comprehensive but easy to understand
            - Focus on accuracy and patient education
            - Do not include pricing or cost information
            - Ensure ALL text is complete - no truncated sentences
            - The report MUST include proper clinic branding in the header and footer.

            URGENCY LOGIC (use this exact mapping):
            - HIGH URGENCY: caries, periapical-lesion, fracture, root-piece
            - MEDIUM URGENCY: impacted-tooth, missing-teeth-no-distal, missing-tooth-between, bone-level, tissue-level  
            - LOW URGENCY: All other conditions (existing dental work like crown, filling, implant, post, root-canal-treatment)

            Return the complete HTML report as a single string. Ensure every description is complete and comprehensive."""
            
            # Format findings for the prompt
            findings_text = ""
            for i, finding in enumerate(patient_findings, 1):
                findings_text += f"""
                Finding {i}:
                - Tooth: {finding.get('tooth', 'N/A')}
                - Condition: {finding.get('condition', 'N/A')}
                - Treatment: {finding.get('treatment', 'N/A')}
                """
            
            user_prompt = f"""Generate a complete HTML treatment report for patient: {patient_name}

            Dentist's Confirmed Findings:
            {findings_text}

            Please generate a comprehensive HTML report with treatment overview table, plan summary, and detailed condition explanations."""
            
            response = self.client.chat.completions.create(
                model=self.model_html,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_completion_tokens=4000
            )
            
            html_content = response.choices[0].message.content.strip()
            
            # Clean up any markdown code fences that might wrap the HTML
            if html_content.startswith("```html"):
                html_content = html_content[7:]  # Remove ```html
                if html_content.endswith("```"):
                    html_content = html_content[:-3]  # Remove trailing ```
            elif html_content.startswith("```"):
                # Remove generic code fences
                lines = html_content.split('\n')
                if lines[0].strip() == '```' or lines[0].strip().startswith('```'):
                    lines = lines[1:]
                if lines and (lines[-1].strip() == '```' or lines[-1].strip().endswith('```')):
                    lines = lines[:-1]
                html_content = '\n'.join(lines)
            
            html_content = html_content.strip()
            logger.info("Successfully generated HTML report content")
            
            # Validate that all descriptions are complete (no truncated sentences)
            if self._has_truncated_descriptions(html_content):
                logger.warning(f"Detected truncated descriptions in HTML, regenerating with higher token limit")
                # Try again with higher token limit
                response = self.client.chat.completions.create(
                    model=self.model_html,
                    messages=[
                        {"role": "system", "content": system_prompt + "\n\nIMPORTANT: If you hit token limits, prioritize complete descriptions over length. Each description must be complete."},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_completion_tokens=6000  # Increase token limit for complete descriptions
                )
                html_content = response.choices[0].message.content.strip()
                logger.info("Regenerated HTML content with higher token limit")
                
                # Check again after regeneration
                if self._has_truncated_descriptions(html_content):
                    logger.warning(f"Still detecting truncated descriptions after regeneration, using fallback system")
                    fallback_html = self._generate_fallback_descriptions(patient_findings)
                    return fallback_html
            
            return html_content
            
        except Exception as e:
            logger.error(f"Error generating HTML report content: {str(e)}")
            logger.info("Generating fallback HTML report with complete descriptions")
            fallback_html = self._generate_fallback_descriptions(patient_findings)
            return fallback_html

    def _has_truncated_descriptions(self, html_content: str) -> bool:
        """
        Checks if any condition explanation box in the HTML content has a truncated description.
        Looks for incomplete sentences, missing content, or cut-off text.
        """
        # Check for common truncation patterns
        truncation_indicators = [
            # Incomplete sentences that end abruptly
            '...',
            '..',
            '. .',
            # Common incomplete phrases
            'This condition',
            'The treatment',
            'Without treatment',
            'Early treatment',
            'Delaying treatment',
            # Check if any "What This Means" sections are too short
            'What This Means:</strong><br>',
            'Recommended Treatment:</strong><br>',
            'Urgency:</strong><br>'
        ]
        
        for indicator in truncation_indicators:
            if indicator in html_content:
                logger.warning(f"Found potential truncation indicator: {indicator}")
                return True
        
        # Check if any condition explanation boxes have very short content
        # Look for the pattern: <div class="condition-explanation">...content...</div>
        import re
        condition_boxes = re.findall(r'<div class="condition-explanation">(.*?)</div>', html_content, re.DOTALL)
        
        for box in condition_boxes:
            # Remove HTML tags to get plain text
            import re
            plain_text = re.sub(r'<[^>]+>', '', box)
            plain_text = re.sub(r'&[^;]+;', '', plain_text)  # Remove HTML entities
            
            # Check if the text is too short (likely truncated) - REDUCED THRESHOLD
            if len(plain_text.strip()) < 150:  # Increased from 100 to catch more incomplete descriptions
                logger.warning(f"Found suspiciously short condition description: {plain_text.strip()[:100]}...")
                return True
            
            # Check for incomplete sentences (sentences that don't end with proper punctuation)
            sentences = plain_text.split('.')
            for sentence in sentences:
                sentence = sentence.strip()
                if sentence and not sentence.endswith(('.', '!', '?')) and len(sentence) > 20:
                    # Long sentence without proper ending - likely truncated
                    logger.warning(f"Found incomplete sentence: {sentence[:100]}...")
                    return True
            
            # Specific check for incomplete caries descriptions
            if 'caries' in plain_text.lower() and len(plain_text.strip()) < 200:
                logger.warning(f"Found incomplete caries description: {plain_text.strip()[:100]}...")
                return True
            
            # Check for the specific incomplete description that appeared in the report
            if 'caries is a dental condition that requires professional treatment' in plain_text.lower():
                logger.warning(f"Found the exact incomplete caries description from the report")
                return True
            
            # Check for generic/unhelpful descriptions
            generic_phrases = [
                'is a dental condition that requires professional treatment',
                'requires professional treatment',
                'needs to be treated by a dentist',
                'should be addressed by a dental professional'
            ]
            
            for phrase in generic_phrases:
                if phrase in plain_text.lower():
                    logger.warning(f"Found generic/unhelpful description: {phrase}")
                    return True
            
            # Check for descriptions that lack proper explanation
            if 'what this means' in plain_text.lower():
                what_means_section = plain_text.lower().split('what this means')[1] if 'what this means' in plain_text.lower() else ''
                if what_means_section:
                    # Check if the "What This Means" section is too short or generic
                    if len(what_means_section.strip()) < 100 or any(phrase in what_means_section for phrase in generic_phrases):
                        logger.warning(f"Found inadequate 'What This Means' section: {what_means_section[:100]}...")
                        return True
        
        return False

    def _generate_fallback_descriptions(self, patient_findings: List[Dict]) -> str:
        """
        Generate fallback HTML descriptions for common dental conditions.
        This ensures complete descriptions even if AI generation fails.
        """
        fallback_html = ""
        
        for finding in patient_findings:
            condition = finding.get('condition', '').lower()
            treatment = finding.get('treatment', '').lower()
            tooth = finding.get('tooth', 'N/A')
            
            # Generate comprehensive descriptions for common conditions
            if 'caries' in condition or 'cavity' in condition:
                description = f"""
                <div class="condition-explanation" style="margin: 20px 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #ffeb3b; padding: 15px; font-weight: bold; font-size: 18px;">
                        Filling for Caries
                    </div>
                    <div style="padding: 20px; background-color: white;">
                        <h3 style="margin-top: 0; color: #333;">Treatment for Caries</h3>
                        <p><strong>Teeth {tooth} have caries that requires filling.</strong></p>
                        
                        <h4 style="color: #666; margin-top: 20px;">What This Means:</h4>
                        <p>Caries, commonly known as cavities, are areas of tooth decay caused by bacteria that produce acids that eat away at your tooth enamel. This decay starts on the surface and can progress deeper into the tooth if left untreated. Cavities can cause sensitivity to hot and cold foods, visible dark spots on teeth, and eventually severe pain if they reach the nerve.</p>
                        
                        <h4 style="color: #666; margin-top: 20px;">Recommended Treatment:</h4>
                        <p>A dental filling involves removing the decayed portion of the tooth and filling the space with a durable material like composite resin or amalgam. This treatment restores the tooth's function and prevents further decay. The procedure is typically quick, taking about 30-60 minutes per tooth, and recovery is immediate.</p>
                        
                        <h4 style="color: #666; margin-top: 20px;">Urgency:</h4>
                        <p>🔴 <strong>Physical Risks:</strong> Untreated cavities grow larger and can reach the nerve, causing severe pain and potential infection. The decay can spread to other teeth and may eventually require more extensive treatment like root canals or extractions.</p>
                    </div>
                </div>
                """
            elif 'periapical' in condition or 'lesion' in condition:
                description = f"""
                                <div class="condition-explanation" style="margin: 20px 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #ffeb3b; padding: 15px; font-weight: bold; font-size: 18px;">
                        Root Canal Treatment for Periapical Lesion
                    </div>
                    <div style="padding: 20px; background-color: white;">
                        <h3 style="margin-top: 0; color: #333;">Treatment for Periapical Lesion</h3>
                        <p><strong>Teeth {tooth} have periapical lesion that requires root canal treatment.</strong></p>
                        
                        <h4 style="color: #666; margin-top: 20px;">What This Means:</h4>
                        <p>A periapical lesion is an infection or inflammation at the tip of the tooth root, usually caused by untreated decay that has reached the pulp or by trauma to the tooth. This condition can cause severe pain, sensitivity to pressure, and may lead to abscess formation. The infection can spread to surrounding bone and tissues if left untreated.</p>
                        
                        <h4 style="color: #666; margin-top: 20px;">Recommended Treatment:</h4>
                        <p>Root canal treatment involves removing the infected pulp from inside the tooth, cleaning and disinfecting the root canals, and sealing them to prevent future infection. This procedure saves the natural tooth and eliminates the source of pain and infection. The treatment typically takes 1-2 hours and may require multiple visits.</p>
                        
                        <h4 style="color: #666; margin-top: 20px;">Urgency:</h4>
                        <p>🔴 <strong>Physical Risks:</strong> Without treatment, the infection can spread to the jawbone, other teeth, and potentially to other parts of the body. Early treatment is crucial to save the tooth and prevent more serious complications.</p>
                    </div>
                </div>
                """
            elif 'impacted' in condition:
                description = f"""
                <div class="condition-explanation" style="margin: 20px 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #ffeb3b; padding: 15px; font-weight: bold; font-size: 18px;">
                        Surgical Extraction for Impacted Tooth
                    </div>
                    <div style="padding: 20px; background-color: white;">
                        <h3 style="margin-top: 0; color: #333;">Treatment for Impacted Tooth</h3>
                        <p><strong>Teeth {tooth} have impacted tooth that requires surgical extraction.</strong></p>
                        
                        <h4 style="color: #666; margin-top: 20px;">What This Means:</h4>
                        <p>An impacted tooth is one that has not fully erupted through the gum or has grown in at an angle, often due to lack of space or obstruction by other teeth. Impacted teeth can cause pain, swelling, and damage to neighboring teeth. They may also lead to infection and cyst formation in the surrounding bone.</p>
                        
                        <h4 style="color: #666; margin-top: 20px;">Recommended Treatment:</h4>
                        <p>Surgical extraction involves making a small incision in the gum to access and remove the impacted tooth. This procedure is necessary when a tooth cannot be removed using simpler extraction techniques. The surgery is performed under local anesthesia and typically takes 30-60 minutes.</p>
                        
                        <h4 style="color: #666; margin-top: 20px;">Urgency:</h4>
                        <p>🔴 <strong>Physical Risks:</strong> Delaying extraction can lead to severe pain, infection spreading to other teeth, and potential damage to the jawbone. The longer you wait, the more complex the procedure becomes.</p>
                    </div>
                </div>
                """
            else:
                # Generic description for other conditions
                description = f"""
                <div class="condition-explanation" style="margin: 20px 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #ffeb3b; padding: 15px; font-weight: bold; font-size: 18px;">
                        {treatment.title()} for {condition.title()}
                    </div>
                    <div style="padding: 20px; background-color: white;">
                        <h3 style="margin-top: 0; color: #333;">Treatment for {condition.title()}</h3>
                        <p><strong>Teeth {tooth} have {condition} that requires {treatment}.</strong></p>
                        
                        <h4 style="color: #666; margin-top: 20px;">What This Means:</h4>
                        <p>This dental condition requires professional treatment to restore oral health and prevent further complications. Your dentist has identified this issue and recommended appropriate treatment to address it effectively.</p>
                        
                        <h4 style="color: #666; margin-top: 20px;">Recommended Treatment:</h4>
                        <p>The recommended treatment will be performed according to standard dental protocols to ensure the best possible outcome for your oral health.</p>
                        
                        <h4 style="color: #666; margin-top: 20px;">Urgency:</h4>
                        <p>🔴 <strong>Physical Risks:</strong> Delaying treatment may lead to complications and more extensive procedures. It's important to address this condition promptly.</p>
                    </div>
                </div>
                """
            
            fallback_html += description
        
        return fallback_html

# Create singleton instance
# Initialize service lazily to avoid import-time errors
_openai_service = None

def get_openai_service():
    global _openai_service
    if _openai_service is None:
        try:
            _openai_service = OpenAIService()
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI service: {e}")
            return None
    return _openai_service

# For backward compatibility
openai_service = get_openai_service()