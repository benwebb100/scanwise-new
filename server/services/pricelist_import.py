import os
import json
import logging
import base64
from typing import Dict, List, Optional
from openai import OpenAI
from dotenv import load_dotenv
import PyPDF2
import io
import pandas as pd
from PIL import Image

load_dotenv()

logger = logging.getLogger(__name__)

class PricelistImportService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key must be set")
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = os.getenv("OPENAI_MODEL_ANALYSIS", "gpt-4o")
    
    async def extract_from_file(self, file_content: bytes, filename: str, mime_type: str) -> Dict:
        """
        Extract treatment pricing from uploaded file
        Supports: PDF, Excel, CSV, Images
        """
        try:
            logger.info(f"📄 Extracting pricelist from {filename} ({mime_type})")
            
            # Determine file type and route to appropriate handler
            if mime_type in ['application/pdf']:
                return await self._extract_from_pdf(file_content)
            elif mime_type in ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                               'application/vnd.ms-excel',
                               'text/csv']:
                return await self._extract_from_spreadsheet(file_content, mime_type)
            elif mime_type.startswith('image/'):
                return await self._extract_from_image(file_content, mime_type)
            else:
                raise ValueError(f"Unsupported file type: {mime_type}")
        
        except Exception as e:
            logger.error(f"❌ Error extracting pricelist: {str(e)}")
            raise
    
    async def _extract_from_image(self, image_bytes: bytes, mime_type: str) -> Dict:
        """
        Use GPT-4 Vision to extract pricing from image
        """
        try:
            logger.info("🖼️ Using GPT-4 Vision to extract from image...")
            
            # Convert image bytes to base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            # Construct the vision prompt
            response = self.client.chat.completions.create(
                model="gpt-4o",  # gpt-4o supports vision
                messages=[
                    {
                        "role": "system",
                        "content": """You are a dental pricing extraction assistant. Extract ALL dental treatments and their prices from the provided image.

IMPORTANT RULES:
1. Extract EVERY treatment you can see, even if unclear
2. Include price (required), duration (if visible), insurance code (if visible)
3. Preserve the exact treatment name as written
4. If price has currency symbol, remove it and just use number
5. If duration is in format like "30min" or "1hr", convert to minutes (integer)
6. Group by category if clearly separated in the document

Return a JSON object with this exact structure:
{
  "extracted_treatments": [
    {
      "name": "Root Canal Treatment - 1 canal",
      "price": 500,
      "duration": 60,
      "insurance_code": "415",
      "category": "Endodontics"
    }
  ],
  "total_count": 45,
  "currency": "AUD",
  "notes": "Any important observations about the price list"
}"""
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Extract all dental treatments and prices from this price list image:"
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=4000,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info(f"✅ Extracted {result.get('total_count', 0)} treatments from image")
            
            return result
        
        except Exception as e:
            logger.error(f"❌ Error in GPT-4 Vision extraction: {str(e)}")
            raise
    
    async def _extract_from_pdf(self, pdf_bytes: bytes) -> Dict:
        """
        Extract text from PDF and use GPT-4 to structure it
        """
        try:
            logger.info("📄 Extracting text from PDF...")
            
            # Read PDF
            pdf_file = io.BytesIO(pdf_bytes)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            # Extract text from all pages
            text_content = ""
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text_content += page.extract_text() + "\n\n"
            
            logger.info(f"📝 Extracted {len(text_content)} characters from PDF")
            
            # If text extraction worked, use GPT-4 text
            if len(text_content.strip()) > 100:
                return await self._extract_from_text(text_content)
            else:
                # PDF might be scanned image - fall back to vision
                logger.warning("⚠️ PDF has minimal text, might be scanned. Consider using image extraction.")
                raise ValueError("PDF appears to be a scanned image. Please convert to image format or use OCR-enabled PDF.")
        
        except Exception as e:
            logger.error(f"❌ Error extracting from PDF: {str(e)}")
            raise
    
    async def _extract_from_text(self, text_content: str) -> Dict:
        """
        Use GPT-4 to extract structured pricing from text
        """
        try:
            logger.info("🤖 Using GPT-4 to structure text content...")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a dental pricing extraction assistant. Extract ALL dental treatments and their prices from the provided text.

IMPORTANT RULES:
1. Extract EVERY treatment you can see
2. Include price (required), duration (if visible), insurance code (if visible)
3. Preserve the exact treatment name as written
4. Remove currency symbols from prices
5. Convert durations to minutes (integer)
6. Group by category if clearly separated

Return a JSON object with this exact structure:
{
  "extracted_treatments": [
    {
      "name": "Root Canal Treatment - 1 canal",
      "price": 500,
      "duration": 60,
      "insurance_code": "415",
      "category": "Endodontics"
    }
  ],
  "total_count": 45,
  "currency": "AUD",
  "notes": "Any important observations"
}"""
                    },
                    {
                        "role": "user",
                        "content": f"Extract all dental treatments and prices from this text:\n\n{text_content}"
                    }
                ],
                max_tokens=4000,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info(f"✅ Extracted {result.get('total_count', 0)} treatments from text")
            
            return result
        
        except Exception as e:
            logger.error(f"❌ Error in GPT-4 text extraction: {str(e)}")
            raise
    
    async def _extract_from_spreadsheet(self, file_bytes: bytes, mime_type: str) -> Dict:
        """
        Extract pricing from Excel/CSV spreadsheet
        """
        try:
            logger.info("📊 Extracting from spreadsheet...")
            
            # Read spreadsheet
            if mime_type == 'text/csv':
                df = pd.read_csv(io.BytesIO(file_bytes))
            else:
                df = pd.read_excel(io.BytesIO(file_bytes))
            
            logger.info(f"📈 Loaded spreadsheet with {len(df)} rows and {len(df.columns)} columns")
            logger.info(f"Columns: {df.columns.tolist()}")
            
            # Convert to text representation for GPT
            text_content = df.to_string(index=False)
            
            # Use GPT to intelligently parse the spreadsheet
            return await self._extract_from_text(text_content)
        
        except Exception as e:
            logger.error(f"❌ Error extracting from spreadsheet: {str(e)}")
            raise
    
    async def match_to_master_database(self, extracted_treatments: List[Dict], master_treatments: List[Dict]) -> List[Dict]:
        """
        Use GPT-4 to intelligently match extracted treatments to master database
        Returns matches with confidence scores
        """
        try:
            logger.info(f"🔍 Matching {len(extracted_treatments)} treatments to master database...")
            
            # Prepare master database summary for GPT
            master_summary = "\n".join([
                f"- {t['code']}: {t['displayName']} ({t.get('friendlyPatientName', '')})"
                for t in master_treatments[:100]  # Limit to prevent token overflow
            ])
            
            # Prepare extracted treatments summary with full details
            extracted_summary = "\n".join([
                f"- {t['name']}: ${t.get('price', 0)} | Duration: {t.get('duration', 'N/A')} mins | Code: {t.get('insurance_code', 'N/A')}"
                for t in extracted_treatments
            ])
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are a dental treatment matching assistant. Match clinic treatments to the master database.

MASTER DATABASE:
{master_summary}

MATCHING RULES:
1. Consider synonyms (e.g., "RCT" = "Root Canal Treatment")
2. Consider abbreviations (e.g., "Endo" = "Endodontics")
3. Match by procedure type, not exact wording
4. Confidence scoring:
   - 0.95-1.0: Exact or near-exact match
   - 0.80-0.94: Strong match with minor differences
   - 0.70-0.79: Probable match, needs review
   - <0.70: No good match, flag as CUSTOM

Return JSON array:
[
  {{
    "clinic_name": "RCT 1 canal",
    "clinic_price": 500,
    "clinic_duration": 60,
    "matched_code": "endo_rct_prep_1",
    "matched_name": "Chemo-mechanical Preparation — 1 Canal",
    "confidence": 0.95,
    "reasoning": "RCT = Root Canal Treatment, 1 canal matches prep",
    "requires_review": false
  }}
]

If confidence < 0.70, set matched_code to "CUSTOM" and requires_review to true."""
                    },
                    {
                        "role": "user",
                        "content": f"Match these clinic treatments:\n\n{extracted_summary}"
                    }
                ],
                max_tokens=4000,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            matches = result.get('matches', [])
            
            logger.info(f"✅ Matched {len(matches)} treatments")
            logger.info(f"📊 Auto-matched: {sum(1 for m in matches if not m.get('requires_review', False))}")
            logger.info(f"⚠️ Needs review: {sum(1 for m in matches if m.get('requires_review', False))}")
            
            return matches
        
        except Exception as e:
            logger.error(f"❌ Error matching treatments: {str(e)}")
            raise

# Singleton instance
pricelist_import_service = PricelistImportService()

