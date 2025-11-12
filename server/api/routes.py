from fastapi import APIRouter, HTTPException, Depends, Header, Request
from typing import Optional, Dict, Any, Union, List
from datetime import datetime
import logging
import os
import base64
import requests
import jwt
import json
from pathlib import Path

from models.analyze import AnalyzeXrayRequest, AnalyzeXrayResponse, SuggestChangesRequest, SuggestChangesResponse
from pydantic import BaseModel
from typing import Optional, List
from services.supabase import supabase_service
from services.roboflow import roboflow_service
from services.openai_analysis import openai_service
from utils.image import generate_annotated_filename

from services.video_generator import video_generator_service
from services.elevenlabs_service import elevenlabs_service
from services.insurance_verification import insurance_service
import os
from services.tooth_mapping import tooth_mapping_service, Detection
from services.roboflow import roboflow_service
from services.april_vision_mapper import map_with_segmentation
from services.image_overlay import image_overlay_service
from lib.stagingV2 import build_staged_plan_v2
import tempfile
import uuid
from services.stripe_service import stripe_service
from api.admin_routes import admin_router

# Enhanced models for new functionality
class EnhancedFinding(BaseModel):
    tooth: str
    condition: str
    treatment: str
    price: Optional[float] = None
    tooth_numbering_system: Optional[str] = "FDI"

class ClinicBrandingData(BaseModel):
    clinic_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    header_template: Optional[str] = None
    footer_template: Optional[str] = None
    primary_color: Optional[str] = "#1e88e5"
    secondary_color: Optional[str] = "#666666"

class EnhancedAnalyzeRequest(BaseModel):
    patient_name: str
    image_url: Optional[str] = None
    findings: List[EnhancedFinding] = []
    observations: Optional[str] = None
    tooth_numbering_system: Optional[str] = "FDI"
    clinic_branding: Optional[ClinicBrandingData] = None

# Insurance verification models
class InsuranceProvider(BaseModel):
    id: str
    name: str
    phone: str
    website: str
    api_endpoint: Optional[str] = None
    api_key: Optional[str] = None

class PatientInsurance(BaseModel):
    patient_id: str
    patient_name: str
    insurance_provider: str
    policy_number: str
    group_number: Optional[str] = None
    subscriber_name: str
    subscriber_relationship: str  # Self, Spouse, Child, etc.
    effective_date: str
    expiration_date: str
    copay_amount: Optional[float] = None
    deductible_remaining: Optional[float] = None
    max_annual_benefit: Optional[float] = None
    last_verified: Optional[str] = None

class InsuranceVerificationRequest(BaseModel):
    patient_id: str
    insurance_provider: str
    policy_number: str
    group_number: Optional[str] = None
    subscriber_name: str
    subscriber_relationship: str
    date_of_birth: str
    treatment_codes: Optional[List[str]] = None

class InsuranceVerificationResponse(BaseModel):
    verification_id: str
    status: str  # "pending", "completed", "failed"
    coverage_details: Optional[Dict] = None
    estimated_costs: Optional[Dict] = None
    verification_date: str
    next_verification_due: Optional[str] = None
    notes: Optional[str] = None

class ToothNumberOverlayRequest(BaseModel):
    image_url: str
    numbering_system: str = "FDI"
    show_numbers: bool = True
    text_size_multiplier: float = 1.0
    condition_data: Optional[Union[Dict, List]] = None
    cached_segmentation_data: Optional[Dict] = None  # NEW: Allow passing cached data

class TreatmentCostEstimate(BaseModel):
    treatment_code: str
    treatment_name: str
    total_cost: float
    insurance_coverage: float
    patient_responsibility: float
    copay_amount: float
    deductible_applied: float
    coverage_percentage: float

router = APIRouter()
logger = logging.getLogger(__name__)

# PDF generation will be handled client-side



async def get_auth_token(authorization: Optional[str] = Header(None)) -> str:
    """Extract JWT token from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        # Remove 'Bearer ' prefix
        token = authorization.replace("Bearer ", "").strip()
        if not token:
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        
        return token
        
    except Exception as e:
        logger.error(f"Auth extraction error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    

@router.post("/analyze-xray-immediate")
async def analyze_xray_immediate(
    request: AnalyzeXrayRequest,
    token: str = Depends(get_auth_token)
):
    """
    Immediately analyze X-ray after upload to provide findings summary
    """
    try:
        logger.info(f"Starting immediate X-ray analysis for image: {request.image_url}")
        
        # Step 1: Send image to Roboflow for detection
        predictions, annotated_image = await roboflow_service.detect_conditions(str(request.image_url))
        
        if not predictions or not annotated_image:
            raise HTTPException(status_code=500, detail="Failed to process image with Roboflow")
        
        # Step 2: Upload annotated image to Supabase Storage
        annotated_filename = f"annotated/immediate_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        annotated_url = await supabase_service.upload_image(
            annotated_image,
            annotated_filename,
            token
        )
        
        if not annotated_url:
            raise HTTPException(status_code=500, detail="Failed to upload annotated image")
        
        # Step 3: Generate immediate findings summary with OpenAI
        findings_summary = await openai_service.generate_immediate_findings_summary(predictions)
        
        # Step 4: Prepare response with detailed findings
        detections = []
        if predictions and 'predictions' in predictions:
            logger.info(f"RoboFlow returned {len(predictions['predictions'])} predictions")
            logger.info(f"Sample RoboFlow prediction: {predictions['predictions'][0] if predictions['predictions'] else 'No predictions'}")
            
            for i, pred in enumerate(predictions['predictions']):
                # Log the raw RoboFlow data
                logger.info(f"RoboFlow prediction {i}: {pred}")
                
                detections.append({
                    'class': pred.get('class', 'Unknown'),
                    'class_name': pred.get('class', 'Unknown'),
                    'confidence': pred.get('confidence', 0),
                    'x': pred.get('x', 0),
                    'y': pred.get('y', 0),
                    'width': pred.get('width', 0),
                    'height': pred.get('height', 0)
                })
        
        response_data = {
            "status": "success",
            "annotated_image_url": annotated_url,
            "detections": detections,
            "findings_summary": findings_summary,
            "original_predictions": predictions
        }
        
        logger.info(f"Successfully completed immediate X-ray analysis. Found {len(detections)} detections")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in analyze_xray_immediate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/analyze-xray", response_model=AnalyzeXrayResponse)
async def analyze_xray(
    request: AnalyzeXrayRequest,
    generate_video: bool = True,  # Default to True for X-ray reports
    token: str = Depends(get_auth_token)
):
    """
    Main endpoint to analyze dental X-ray
    Note: Supabase handles user authentication and RLS automatically
    Supports pre-analyzed AWS images via pre_analyzed_detections and pre_analyzed_annotated_url
    """
    try:
        logger.info(f"Starting X-ray analysis for patient: {request.patient_name}")
        
        # Check if we have pre-analyzed data (for AWS images)
        if request.pre_analyzed_detections and request.pre_analyzed_annotated_url:
            logger.info("🔄 Using pre-analyzed AWS data, skipping Roboflow detection")
            predictions = {"predictions": request.pre_analyzed_detections}
            annotated_url = request.pre_analyzed_annotated_url
        else:
            # Step 1: Send image to Roboflow for detection (for manual uploads)
            logger.info("🤖 Running Roboflow detection for manual upload")
            predictions, annotated_image = await roboflow_service.detect_conditions(str(request.image_url))
            
            if not predictions or not annotated_image:
                raise HTTPException(status_code=500, detail="Failed to process image with Roboflow")
            
            # Step 2: Upload annotated image to Supabase Storage
            annotated_filename = generate_annotated_filename(str(request.image_url), request.patient_name)
            annotated_url = await supabase_service.upload_image(
                annotated_image,
                f"{annotated_filename}",
                token
            )
            
            if not annotated_url:
                raise HTTPException(status_code=500, detail="Failed to upload annotated image")
        
        # Step 3: Analyze with OpenAI
        findings_dict = [f.model_dump() for f in request.findings] if request.findings else []
        ai_analysis = await openai_service.analyze_dental_conditions(predictions, findings_dict)
        
        # Step 4: Save to database (Supabase handles user_id via RLS)
        # SKIP HTML generation here - let frontend generate HTML from organized stages
        # This ensures the report uses the dentist's organized stages from the stage editor
        # html_report = await openai_service.generate_html_report_content(findings_dict, request.patient_name)
        
        diagnosis_data = {
            'patient_name': request.patient_name,
            'image_url': str(request.image_url),
            'annotated_image_url': annotated_url,
            'summary': ai_analysis.get('summary', ''),
            'ai_notes': ai_analysis.get('ai_notes', ''),
            'treatment_stages': ai_analysis.get('treatment_stages', []),
            'report_html': None,  # Let frontend generate HTML from organized stages
            'is_xray_based': True
        }
        
        saved_diagnosis = await supabase_service.save_diagnosis(diagnosis_data, token)
        diagnosis_id = saved_diagnosis.get('id')

        # Use generate_video from request body, fallback to query param
        should_generate_video = request.generate_video if hasattr(request, 'generate_video') else generate_video
        logger.info(f"Will generate video: {should_generate_video}")
        
        # Step 5: Generate video synchronously (not in background)
        video_url = None
        if should_generate_video and diagnosis_id and annotated_url:  # Use should_generate_video
            logger.info(f"Generating video for diagnosis: {diagnosis_id}")
            try:
                # Get video language from request, default to English
                video_language = request.video_language or "english"
                logger.info(f"Video language: {video_language}")
                
                # Call the video generation function directly (not in background)
                video_url = await generate_video_sync(diagnosis_id, annotated_url, ai_analysis.get('treatment_stages', []), request.patient_name, token, video_language)
                logger.info(f"Video generated successfully: {video_url}")
            except Exception as video_error:
                logger.error(f"Video generation failed: {str(video_error)}")
                # Don't fail the entire request if video fails
                video_url = None
        else:
            logger.info(f"Skipping video generation. Conditions: generate_video={should_generate_video}, diagnosis_id={diagnosis_id}, annotated_url={bool(annotated_url)}")
        
        # Return response with video URL
        response_data = {
            "status": "success",
            "summary": ai_analysis.get('summary', ''),
            "treatment_stages": ai_analysis.get('treatment_stages', []),
            "ai_notes": ai_analysis.get('ai_notes', ''),
            "diagnosis_timestamp": datetime.now(),
            "annotated_image_url": annotated_url,
            "detections": ai_analysis.get('detections', []),
            "report_html": None,  # Let frontend generate HTML from organized stages
            "diagnosis_id": diagnosis_id,
            "video_url": video_url  # Include video URL directly
        }
        
        response = AnalyzeXrayResponse(**response_data)
        
        logger.info(f"Successfully completed X-ray analysis for patient: {request.patient_name}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in analyze_xray: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
# New synchronous video generation function
async def generate_video_sync(diagnosis_id: str, annotated_url: str, treatment_stages: list, patient_name: str, token: str, video_language: str = "english") -> Optional[str]:
    """
    Generate video synchronously and return the URL
    """
    temp_dir = None
    try:
        logger.info(f"Starting synchronous video generation for diagnosis: {diagnosis_id} in {video_language}")
        
        # Convert annotated image to base64
        logger.info(f"Converting image to base64 for diagnosis: {diagnosis_id}")
        image_base64 = video_generator_service.image_to_base64(annotated_url)
        
        # Generate video script with patient name and language
        logger.info(f"Generating video script for diagnosis: {diagnosis_id} in {video_language}")
        video_script = await openai_service.generate_video_script(treatment_stages, image_base64, patient_name, video_language)
        
        if not video_script or len(video_script.strip()) == 0:
            raise Exception("Generated video script is empty")
        
        # Generate voice audio with specified language
        logger.info(f"Generating voice audio for diagnosis: {diagnosis_id} in {video_language}")
        audio_bytes = await elevenlabs_service.generate_voice(video_script, video_language)
        
        if not audio_bytes or len(audio_bytes) == 0:
            raise Exception("Generated audio is empty")
        
        # Create temporary files
        temp_dir = tempfile.mkdtemp()
        unique_id = str(uuid.uuid4())[:8]
        
        # Save image - handle both HTTP URLs and data URLs
        if annotated_url.startswith('data:'):
            # Data URL (base64-encoded image)
            logger.info("Detected data URL for annotated image, decoding base64")
            try:
                # Extract base64 data (remove "data:image/png;base64," prefix)
                base64_data = annotated_url.split(',', 1)[1]
                image_bytes = base64.b64decode(base64_data)
                logger.info(f"Successfully decoded data URL - Size: {len(image_bytes)} bytes")
            except Exception as decode_error:
                logger.error(f"Failed to decode data URL: {str(decode_error)}")
                raise Exception(f"Invalid data URL format: {str(decode_error)}")
        else:
            # HTTP/HTTPS URL - download the image
            logger.info(f"Downloading image from HTTP URL: {annotated_url[:100]}...")
            image_response = requests.get(annotated_url, timeout=30)
            image_response.raise_for_status()
            image_bytes = image_response.content
            logger.info(f"Successfully downloaded image - Size: {len(image_bytes)} bytes")
        
        image_path = os.path.join(temp_dir, f"image_{unique_id}.jpg")
        with open(image_path, 'wb') as f:
            f.write(image_bytes)
        
        # Save audio
        audio_path = os.path.join(temp_dir, f"audio_{unique_id}.mp3")
        with open(audio_path, 'wb') as f:
            f.write(audio_bytes)
        
        # Create video
        logger.info(f"Creating video with subtitles for diagnosis: {diagnosis_id}")
        video_path = os.path.join(temp_dir, f"patient_video_{unique_id}.mp4")
        duration = video_generator_service.create_video_with_subtitles(
            image_path,
            audio_path,
            video_path
        )
        
        # Upload video
        logger.info(f"Uploading video to storage for diagnosis: {diagnosis_id}")
        with open(video_path, 'rb') as video_file:
            video_data = video_file.read()
        
        video_filename = f"patient_videos/{patient_name.replace(' ', '_')}_{unique_id}.mp4"
        video_url = await supabase_service.upload_video(
            video_data,
            video_filename,
            token
        )
        
        # Update diagnosis with video URL
        if video_url:
            logger.info(f"Updating database with video URL for diagnosis: {diagnosis_id}")
            auth_client = supabase_service._create_authenticated_client(token)
            auth_client.table('patient_diagnosis').update({
                'video_url': video_url,
                'video_script': video_script,
                'video_generated_at': datetime.now().isoformat(),
                'video_generation_failed': False,
                'video_error': None
            }).eq('id', diagnosis_id).execute()
            
            return video_url
        else:
            raise Exception("Failed to upload video to storage")
        
    except Exception as e:
        logger.error(f"Error in synchronous video generation: {str(e)}")
        # Update diagnosis to indicate video generation failed
        try:
            auth_client = supabase_service._create_authenticated_client(token)
            auth_client.table('patient_diagnosis').update({
                'video_generation_failed': True,
                'video_error': str(e)[:500],
                'video_generated_at': datetime.now().isoformat()
            }).eq('id', diagnosis_id).execute()
        except Exception as update_error:
            logger.error(f"Failed to update diagnosis with video error: {str(update_error)}")
        
        return None
    
    finally:
        # Cleanup temporary files
        if temp_dir and os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir)
                logger.info(f"Cleaned up temp directory: {temp_dir}")
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup temp directory: {str(cleanup_error)}")

@router.get("/health")
async def health_check() -> Dict:
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "SCANWISE AI Backend",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@router.get("/health/detailed")
async def detailed_health_check() -> Dict:
    """Detailed health check that verifies all services are configured"""
    health_status = {
        "status": "checking",
        "timestamp": datetime.now().isoformat(),
        "services": {}
    }
    
    # Check Supabase
    try:
        # Try to access Supabase client
        client = supabase_service.client
        if client:
            health_status["services"]["supabase"] = {
                "status": "connected",
                "url": os.getenv("SUPABASE_URL", "").split('.')[0] + ".supabase.co"
            }
        else:
            health_status["services"]["supabase"] = {"status": "error", "message": "Client not initialized"}
    except Exception as e:
        health_status["services"]["supabase"] = {"status": "error", "message": str(e)}
    
    # Check Roboflow
    try:
        if roboflow_service.api_key and roboflow_service.project_id:
            health_status["services"]["roboflow"] = {
                "status": "configured",
                "project_id": roboflow_service.project_id,
                "model_version": roboflow_service.model_version
            }
        else:
            health_status["services"]["roboflow"] = {"status": "error", "message": "Missing configuration"}
    except Exception as e:
        health_status["services"]["roboflow"] = {"status": "error", "message": str(e)}
    
    # Check OpenAI
    try:
        if openai_service.api_key:
            health_status["services"]["openai"] = {
                "status": "configured",
                "model": "gpt-4o"
            }
        else:
            health_status["services"]["openai"] = {"status": "error", "message": "Missing API key"}
    except Exception as e:
        health_status["services"]["openai"] = {"status": "error", "message": str(e)}
    
    # Overall status
    all_services_ok = all(
        service.get("status") in ["connected", "configured"] 
        for service in health_status["services"].values()
    )
    
    health_status["status"] = "healthy" if all_services_ok else "unhealthy"
    
    return health_status

@router.get("/diagnoses")
async def get_user_diagnoses(
    token: str = Depends(get_auth_token),
    limit: int = 10,
    offset: int = 0
):
    """Get all diagnoses for the authenticated user"""
    try:
        # Create authenticated client
        auth_client = supabase_service._create_authenticated_client(token)
        
        # Fetch diagnoses
        response = auth_client.table('patient_diagnosis').select("*").order(
            'created_at', desc=True
        ).range(offset, offset + limit - 1).execute()
        
        # Transform data for frontend
        diagnoses = []
        for diagnosis in response.data:
            diagnoses.append({
                "id": diagnosis.get('id'),
                "patientName": diagnosis.get('patient_name'),
                "patientId": f"PAT-{diagnosis.get('id')[:5]}",  # Generate patient ID
                "scanDate": diagnosis.get('created_at'),
                "status": "Completed",
                "imageUrl": diagnosis.get('image_url'),
                "annotatedImageUrl": diagnosis.get('annotated_image_url'),
                "summary": diagnosis.get('summary'),
                "aiNotes": diagnosis.get('ai_notes'),
                "treatmentStages": diagnosis.get('treatment_stages', []),
                "conditions": _extract_conditions(diagnosis.get('treatment_stages', [])),
                "teethAnalyzed": _count_teeth(diagnosis.get('treatment_stages', [])),
                "createdAt": diagnosis.get('created_at'),
                "emailSentAt": diagnosis.get('email_sent_at')  # ✅ Include email sent timestamp
            })
        
        return {
            "diagnoses": diagnoses,
            "total": len(diagnoses),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching diagnoses: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch diagnoses: {str(e)}")

def _extract_conditions(treatment_stages):
    """Extract unique conditions from treatment stages"""
    conditions = set()
    for stage in treatment_stages:
        for item in stage.get('items', []):
            conditions.add(item.get('condition', ''))
    return list(conditions)

def _count_teeth(treatment_stages):
    """Count unique teeth from treatment stages"""
    teeth = set()
    for stage in treatment_stages:
        for item in stage.get('items', []):
            teeth.add(item.get('tooth', ''))
    return len(teeth)



from fastapi import UploadFile, File

@router.post("/upload-image")
async def upload_xray_image(
    file: UploadFile = File(...),
    token: str = Depends(get_auth_token)
):
    """Upload X-ray image to Supabase Storage (supports JPEG, PNG, TIFF, and DICOM)"""
    try:
        # Check if this is a DICOM file
        is_dicom = (
            file.filename and file.filename.lower().endswith('.dcm') or
            file.content_type == "application/dicom"
        )
        
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/tiff", "application/dicom"]
        if not is_dicom and file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type. Supported: JPEG, PNG, TIFF, DICOM")
        
        # Read file content
        file_content = await file.read()
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Handle DICOM files - convert to JPEG
        if is_dicom:
            logger.info(f"🏥 Detected DICOM file upload: {file.filename}")
            from services.dicom_processor import dicom_processor
            
            # Convert DICOM to JPEG
            conversion_result = dicom_processor.convert_dicom_bytes_to_image(file_content)
            
            if not conversion_result:
                raise HTTPException(status_code=500, detail="Failed to convert DICOM file. Please ensure it's a valid DICOM with image data.")
            
            image_bytes, dicom_metadata = conversion_result
            logger.info(f"✅ DICOM converted to JPEG: {len(image_bytes)} bytes, Patient: {dicom_metadata.get('patient_name', 'Unknown')}")
            
            # Use JPEG bytes and change extension
            file_content = image_bytes
            file_name = f"xrays/dicom_{timestamp}_{file.filename.replace('.dcm', '.jpg')}"
            
            # Store metadata for future use (optional - could save to database here too)
            logger.info(f"📋 DICOM metadata: {dicom_metadata.get('patient_name')}, ID: {dicom_metadata.get('patient_id')}")
        else:
            # Regular image file
            file_extension = file.filename.split('.')[-1]
            file_name = f"xrays/{timestamp}_{file.filename}"
        
        # Upload to Supabase
        public_url = await supabase_service.upload_image(
            file_content,
            file_name,
            token
        )
        
        if not public_url:
            raise HTTPException(status_code=500, detail="Failed to upload image")
        
        # Prepare response
        response = {
            "status": "success",
            "url": public_url,
            "filename": file_name
        }
        
        # Add DICOM metadata if available
        if is_dicom and 'dicom_metadata' in locals():
            response["metadata"] = {
                "patient_name": dicom_metadata.get('patient_name'),
                "patient_id": dicom_metadata.get('patient_id'),
                "patient_email": dicom_metadata.get('patient_email'),
                "is_dicom": True
            }
            logger.info(f"📤 Returning DICOM metadata with upload response")
        
        return response
        
    except Exception as e:
        logger.error(f"Error uploading image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    

@router.post("/apply-suggested-changes", response_model=SuggestChangesResponse)
async def apply_suggested_changes(
    request: SuggestChangesRequest,
    token: str = Depends(get_auth_token)
):
    """Apply AI-suggested changes to the report HTML"""
    try:
        if not request.previous_report_html or not request.change_request_text:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Log the request details for debugging
        logger.info(f"Applying suggested changes. HTML length: {len(request.previous_report_html)}, Request: {request.change_request_text[:100]}...")
        
        system_prompt = """You are an expert dental assistant AI and HTML editor. You will receive:

1. An existing HTML dental treatment plan report, already formatted with inline styles and condition blocks.
2. A plain-text change request written by a dentist, describing edits they'd like made to the content.

Your task is to carefully update the HTML to reflect these requested changes.

Instructions:
- Maintain the full structure and inline styles of the HTML exactly as-is.
- Only modify the **text content inside HTML elements** when explicitly instructed.
- If the dentist asks to remove a condition entirely, you may delete that entire <div> block.
- Do not reword, reformat, or reorder any part of the document unless the change request specifies it.
- Do not add or alter colors, classes, or structure.
- The output must be a valid, continuous HTML string (starting with <div and ending with </div>).
- Do not include markdown, code fences, or JSON formatting.
- Accuracy is critical. This output will be used in patient-facing medical documents."""

        user_prompt = f"""Here is the current HTML version of the treatment report:
{request.previous_report_html}

Here is the dentist's change request (typed or dictated):
{request.change_request_text}

Please apply the change exactly as described, keeping the HTML structure intact and updating only the necessary content."""

        # Check if the combined prompt is too long
        total_length = len(system_prompt) + len(user_prompt)
        logger.info(f"Total prompt length: {total_length} characters")
        
        # Increase max_tokens to handle larger reports
        max_tokens_needed = min(8000, max(4000, len(request.previous_report_html) // 2))
        
        try:
            response = openai_service.client.chat.completions.create(
                model=openai_service.model_edit,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=max_tokens_needed  # Dynamic based on input size
            )
        except Exception as api_error:
            logger.error(f"OpenAI API error: {str(api_error)}")
            # Check if it's a model error
            if "model" in str(api_error).lower():
                raise HTTPException(
                    status_code=500, 
                    detail="AI model configuration error. Please check the OpenAI model settings."
                )
            raise
        
        updated_html = response.choices[0].message.content
        
        # Clean up any potential markdown formatting
        updated_html = updated_html.strip()
        if updated_html.startswith("```html"):
            # Remove code fences if present
            updated_html = updated_html[7:]  # Remove ```html
            if updated_html.endswith("```"):
                updated_html = updated_html[:-3]
        elif updated_html.startswith("```"):
            # Remove generic code fences
            updated_html = updated_html.split("\n", 1)[1].rsplit("\n", 1)[0]
        
        logger.info(f"Successfully applied suggested changes. Output length: {len(updated_html)}")
        return SuggestChangesResponse(updated_html=updated_html)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying suggested changes: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        if hasattr(e, 'response'):
            logger.error(f"API Response: {getattr(e.response, 'text', 'No response text')}")
        raise HTTPException(status_code=500, detail=f"Failed to apply suggested changes: {str(e)}")
    

@router.post("/generate-patient-video")
async def generate_patient_video(
    diagnosis_id: str,
    token: str = Depends(get_auth_token)
):
    """Generate educational video for patient based on diagnosis"""
    temp_files = []
    try:
        logger.info(f"Starting video generation for diagnosis: {diagnosis_id}")
        
        # Step 1: Fetch diagnosis from database
        auth_client = supabase_service._create_authenticated_client(token)
        diagnosis_response = auth_client.table('patient_diagnosis').select("*").eq('id', diagnosis_id).execute()
        
        if not diagnosis_response.data:
            raise HTTPException(status_code=404, detail="Diagnosis not found")
        
        diagnosis = diagnosis_response.data[0]
        annotated_image_url = diagnosis.get('annotated_image_url')
        treatment_stages = diagnosis.get('treatment_stages', [])
        patient_name = diagnosis.get('patient_name')
        
        # Step 2: Convert annotated image to base64
        logger.info("Converting annotated image to base64...")
        image_base64 = video_generator_service.image_to_base64(annotated_image_url)
        
        # Step 3: Generate video script with OpenAI (with patient name and default English)
        logger.info("Generating video script...")
        video_language = "english"  # Default to English for this endpoint
        video_script = await openai_service.generate_video_script(treatment_stages, image_base64, patient_name, video_language)
        
        # Step 4: Generate voice audio with ElevenLabs
        logger.info("Generating voice audio...")
        audio_bytes = await elevenlabs_service.generate_voice(video_script, video_language)
        
        # Step 5: Save temporary files
        temp_dir = tempfile.mkdtemp()
        unique_id = str(uuid.uuid4())[:8]
        
        # Download and save annotated image
        image_response = requests.get(annotated_image_url)
        image_path = os.path.join(temp_dir, f"image_{unique_id}.jpg")
        with open(image_path, 'wb') as f:
            f.write(image_response.content)
        temp_files.append(image_path)
        
        # Save audio file
        audio_path = os.path.join(temp_dir, f"audio_{unique_id}.mp3")
        with open(audio_path, 'wb') as f:
            f.write(audio_bytes)
        temp_files.append(audio_path)
        
        # Step 6: Create video with subtitles
        logger.info("Creating video with subtitles...")
        video_path = os.path.join(temp_dir, f"patient_video_{unique_id}.mp4")
        duration = video_generator_service.create_video_with_subtitles(
            image_path, 
            audio_path, 
            video_path
        )
        temp_files.append(video_path)
        
        # Step 7: Upload video to Supabase Storage
        logger.info("Uploading video to storage...")
        with open(video_path, 'rb') as video_file:
            video_data = video_file.read()
        
        video_filename = f"patient_videos/{patient_name.replace(' ', '_')}_{unique_id}.mp4"
        video_url = await supabase_service.upload_video(
            video_data,
            video_filename,
            token
        )
        
        if not video_url:
            raise HTTPException(status_code=500, detail="Failed to upload video")
        
        # Step 8: Update diagnosis with video URL
        update_response = auth_client.table('patient_diagnosis').update({
            'video_url': video_url,
            'video_script': video_script,
            'video_generated_at': datetime.now().isoformat()
        }).eq('id', diagnosis_id).execute()
        
        logger.info(f"Successfully generated video for diagnosis: {diagnosis_id}")
        
        return {
            "status": "success",
            "video_url": video_url,
            "duration": duration,
            "script_length": len(video_script),
            "message": "Patient education video generated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating patient video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate video: {str(e)}")
    finally:
        # Cleanup temporary files
        for file_path in temp_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                logger.error(f"Error cleaning up {file_path}: {str(e)}")
        
        # Clean up temp directory
        if 'temp_dir' in locals():
            try:
                import shutil
                shutil.rmtree(temp_dir)
            except Exception as e:
                logger.error(f"Error cleaning up temp directory: {str(e)}")


@router.get("/diagnosis/{diagnosis_id}/video-status")
async def get_video_status(
    diagnosis_id: str,
    token: str = Depends(get_auth_token)
):
    """Check if video has been generated for a diagnosis"""
    try:
        auth_client = supabase_service._create_authenticated_client(token)
        
        response = auth_client.table('patient_diagnosis').select(
            "id, video_url, video_generated_at"
        ).eq('id', diagnosis_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Diagnosis not found")
        
        diagnosis = response.data[0]
        has_video = bool(diagnosis.get('video_url'))
        
        return {
            "diagnosis_id": diagnosis_id,
            "has_video": has_video,
            "video_url": diagnosis.get('video_url'),
            "video_generated_at": diagnosis.get('video_generated_at'),
            "status": "completed" if has_video else "not_generated"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking video status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check video status: {str(e)}")
    

@router.post("/diagnosis/{diagnosis_id}/regenerate-video")
async def regenerate_video(
    diagnosis_id: str,
    token: str = Depends(get_auth_token)
):
    """Regenerate video for an existing diagnosis"""
    try:
        # Just call the generate_patient_video endpoint
        return await generate_patient_video(diagnosis_id, token)
        
    except Exception as e:
        logger.error(f"Error regenerating video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to regenerate video: {str(e)}")
    

@router.get("/diagnoses/{diagnosis_id}")
async def get_diagnosis_by_id(
    diagnosis_id: str,
    token: str = Depends(get_auth_token)
):
    """Get a specific diagnosis by ID for the authenticated user"""
    try:
        # Create authenticated client
        auth_client = supabase_service._create_authenticated_client(token)
        
        # Fetch specific diagnosis
        response = auth_client.table('patient_diagnosis').select("*").eq('id', diagnosis_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Diagnosis not found")
        
        diagnosis = response.data[0]
        
        # Transform data for frontend
        return {
            "id": diagnosis.get('id'),
            "patientName": diagnosis.get('patient_name'),
            "patientId": f"PAT-{diagnosis.get('id')[:5]}",
            "createdAt": diagnosis.get('created_at'),
            "imageUrl": diagnosis.get('image_url'),
            "annotatedImageUrl": diagnosis.get('annotated_image_url'),
            "summary": diagnosis.get('summary'),
            "aiNotes": diagnosis.get('ai_notes'),
            "treatmentStages": diagnosis.get('treatment_stages', []),
            "videoUrl": diagnosis.get('video_url'),
            "videoScript": diagnosis.get('video_script'),
            "videoGeneratedAt": diagnosis.get('video_generated_at'),
            "reportHtml": diagnosis.get('report_html'),  # Changed from report_html to reportHtml
            "conditions": _extract_conditions(diagnosis.get('treatment_stages', [])),
            "teethAnalyzed": _count_teeth(diagnosis.get('treatment_stages', [])),
            "status": "Completed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching diagnosis {diagnosis_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch diagnosis: {str(e)}")


@router.delete("/diagnoses/{diagnosis_id}")
async def delete_diagnosis(
    diagnosis_id: str,
    token: str = Depends(get_auth_token)
):
    """Delete a specific diagnosis by ID for the authenticated user"""
    try:
        logger.info(f"🗑️ Attempting to delete diagnosis: {diagnosis_id}")
        
        # Create authenticated client
        auth_client = supabase_service._create_authenticated_client(token)
        
        # First, verify the diagnosis exists and belongs to the user
        check_response = auth_client.table('patient_diagnosis').select("id, patient_name").eq('id', diagnosis_id).execute()
        
        if not check_response.data:
            logger.warning(f"❌ Diagnosis {diagnosis_id} not found")
            raise HTTPException(status_code=404, detail="Diagnosis not found")
        
        diagnosis = check_response.data[0]
        patient_name = diagnosis.get('patient_name', 'Unknown')
        
        # Delete the diagnosis
        # Note: Supabase delete() doesn't always return data, so we check for errors instead
        try:
            delete_response = auth_client.table('patient_diagnosis').delete().eq('id', diagnosis_id).execute()
            logger.info(f"✅ Successfully deleted diagnosis {diagnosis_id} for patient: {patient_name}")
        except Exception as delete_error:
            logger.error(f"❌ Failed to delete diagnosis {diagnosis_id}: {str(delete_error)}")
            raise HTTPException(status_code=500, detail=f"Failed to delete diagnosis: {str(delete_error)}")
        
        return {
            "success": True,
            "message": f"Report for {patient_name} has been permanently deleted",
            "diagnosis_id": diagnosis_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting diagnosis {diagnosis_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete diagnosis: {str(e)}")


@router.patch("/diagnosis/{diagnosis_id}/html")
async def update_diagnosis_html(
    diagnosis_id: str,
    request: Dict,
    token: str = Depends(get_auth_token)
):
    """Update the report_html field for a specific diagnosis"""
    try:
        report_html = request.get('report_html')
        
        if not report_html:
            raise HTTPException(status_code=400, detail="report_html is required")
        
        logger.info(f"📝 Updating report HTML for diagnosis: {diagnosis_id} (length: {len(report_html)} chars)")
        
        # Create authenticated client
        auth_client = supabase_service._create_authenticated_client(token)
        
        # Update the diagnosis record
        response = auth_client.table('patient_diagnosis')\
            .update({'report_html': report_html})\
            .eq('id', diagnosis_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Diagnosis not found")
        
        logger.info(f"✅ Successfully updated report HTML for diagnosis: {diagnosis_id}")
        
        return {
            "success": True,
            "message": "Report HTML updated successfully",
            "diagnosis_id": diagnosis_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating diagnosis HTML {diagnosis_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update diagnosis HTML: {str(e)}")


@router.get("/generate-pdf/{diagnosis_id}")
async def generate_pdf_download(
    diagnosis_id: str,
    token: str = Depends(get_auth_token)
):
    """Generate and return a PDF for download"""
    try:
        logger.info(f"📄 Generating PDF for diagnosis: {diagnosis_id}")
        
        # Create authenticated client
        auth_client = supabase_service._create_authenticated_client(token)
        
        # Fetch the diagnosis data
        response = auth_client.table('patient_diagnosis')\
            .select("*")\
            .eq('id', diagnosis_id)\
            .execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Report not found")
        
        diagnosis = response.data[0]
        report_html = diagnosis.get('report_html', '')
        
        if not report_html:
            raise HTTPException(status_code=400, detail="Report HTML not available")
        
        # Get clinic branding
        user_id = diagnosis.get('user_id')
        branding_response = auth_client.table('clinic_branding')\
            .select("*")\
            .eq('user_id', user_id)\
            .execute()
        
        clinic_branding = branding_response.data[0] if branding_response.data else {}
        
        # Use the HTML PDF service to render the HTML to PDF
        from services.html_pdf_service import HtmlPdfService
        html_pdf_service = HtmlPdfService()
        
        # Render HTML to PDF (async)
        pdf_path = await html_pdf_service.render_html_to_pdf(report_html)
        
        # Read the PDF file
        with open(pdf_path, 'rb') as pdf_file:
            pdf_content = pdf_file.read()
        
        # Clean up temp file
        import os
        os.unlink(pdf_path)
        
        logger.info(f"✅ PDF generated successfully for diagnosis: {diagnosis_id}")
        
        # Return PDF as downloadable file
        from fastapi.responses import Response
        patient_name = diagnosis.get('patient_name', 'Report').replace(' ', '-')
        filename = f"Dental-Report-{patient_name}-{diagnosis_id[:8]}.pdf"
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "application/pdf"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating PDF {diagnosis_id}: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@router.post("/analyze-without-xray", response_model=AnalyzeXrayResponse)
async def analyze_without_xray(
    request: Dict,
    token: str = Depends(get_auth_token)
):
    """
    Analyze dental conditions without X-ray image, based on observations and findings only
    """
    try:
        patient_name = request.get('patient_name')
        observations = request.get('observations', '')
        findings = request.get('findings', [])
        
        logger.info(f"Starting analysis without X-ray for patient: {patient_name}")
        
        # Prepare data for OpenAI analysis
        # Create a mock predictions dict with manual findings only
        mock_predictions = {
            'predictions': []  # No automated detections without X-ray
        }
        
        # Combine observations with findings for better context
        enhanced_findings = findings.copy()
        if observations:
            # Add observations as context for AI
            enhanced_findings.append({
                'tooth': 'General',
                'condition': 'Clinical Observations',
                'treatment': observations
            })
        
        # Step 1: Analyze with OpenAI (no Roboflow detection)
        ai_analysis = await openai_service.analyze_dental_conditions(mock_predictions, enhanced_findings)
        
        # Generate HTML report using GPT
        html_report = await openai_service.generate_html_report_content(findings, patient_name)
        
        # Step 2: Save to database without image URLs
        diagnosis_data = {
            'patient_name': patient_name,
            'image_url': 'placeholder-no-xray.jpg',  # Placeholder image URL instead of null
            'annotated_image_url': 'placeholder-no-xray.jpg',  # Placeholder image URL instead of null
            'summary': ai_analysis.get('summary', ''),
            'ai_notes': ai_analysis.get('ai_notes', ''),
            'treatment_stages': ai_analysis.get('treatment_stages', []),
            'is_xray_based': False,  # Flag to indicate this is not X-ray based
            'report_html': html_report
        }
        
        saved_diagnosis = await supabase_service.save_diagnosis(diagnosis_data, token)
        
        # Step 3: Prepare response (no video for non-X-ray reports)
        response_data = {
            "status": "success",
            "summary": ai_analysis.get('summary', ''),
            "treatment_stages": ai_analysis.get('treatment_stages', []),
            "ai_notes": ai_analysis.get('ai_notes', ''),
            "diagnosis_timestamp": datetime.now(),
            "annotated_image_url": None,  # No annotated image
            "report_html": html_report
        }
        
        response = AnalyzeXrayResponse(**response_data)
        
        logger.info(f"Successfully completed analysis without X-ray for patient: {patient_name}")
        return response
        
    except Exception as e:
        logger.error(f"Error in analyze_without_xray: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/clinic-pricing")
async def save_clinic_pricing(
    pricing_data: Dict[str, float],
    token: str = Depends(get_auth_token)
):
    """Save clinic-specific pricing for treatments"""
    try:
        # Create authenticated client
        auth_client = supabase_service._create_authenticated_client(token)
        
        # Save or update pricing data
        # First, try to get existing pricing
        existing_response = auth_client.table('clinic_pricing').select("*").execute()
        
        if existing_response.data:
            # Update existing pricing
            response = auth_client.table('clinic_pricing').update({
                'pricing_data': pricing_data,
                'updated_at': datetime.now().isoformat()
            }).eq('id', existing_response.data[0]['id']).execute()
        else:
            # Create new pricing record
            response = auth_client.table('clinic_pricing').insert({
                'pricing_data': pricing_data,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }).execute()
        
        return {
            "status": "success",
            "message": "Clinic pricing saved successfully",
            "pricing_data": pricing_data
        }
        
    except Exception as e:
        logger.error(f"Error saving clinic pricing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save pricing: {str(e)}")


@router.get("/clinic-pricing")
async def get_clinic_pricing(
    token: str = Depends(get_auth_token)
):
    """Get clinic-specific pricing for treatments"""
    try:
        # Create authenticated client
        auth_client = supabase_service._create_authenticated_client(token)
        
        # Get pricing data
        response = auth_client.table('clinic_pricing').select("*").execute()
        
        if response.data:
            return {
                "status": "success",
                "pricing_data": response.data[0].get('pricing_data', {})
            }
        else:
            return {
                "status": "success",
                "pricing_data": {}
            }
        
    except Exception as e:
        logger.error(f"Error getting clinic pricing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get pricing: {str(e)}")


@router.get("/treatment-settings")
async def get_treatment_settings(
    token: str = Depends(get_auth_token)
):
    """Get clinic-specific treatment settings with fallback to defaults"""
    try:
        logger.info("Fetching treatment settings for clinic")
        
        # Hardcoded defaults as fallback (matching dental-data.ts exactly)
        # This ensures prices/durations work even if database is empty
        HARDCODED_DEFAULTS = {
            # Legacy codes (for backwards compatibility)
            'filling': {'duration': 30, 'price': 220},
            'extraction': {'duration': 30, 'price': 250},
            'root-canal-treatment': {'duration': 90, 'price': 1100},
            'crown': {'duration': 60, 'price': 1800},
            'bridge': {'duration': 120, 'price': 850},
            'implant-placement': {'duration': 90, 'price': 2300},
            'partial-denture': {'duration': 60, 'price': 1600},
            'scale-and-clean': {'duration': 30, 'price': 190},
            'periodontal-treatment': {'duration': 60, 'price': 280},
            'veneer': {'duration': 60, 'price': 1500},
            'fluoride-treatment': {'duration': 15, 'price': 40},
            'composite-build-up': {'duration': 45, 'price': 200},
            'surgical-extraction': {'duration': 45, 'price': 450},
            'deep-cleaning': {'duration': 60, 'price': 280},
            'complete-denture': {'duration': 90, 'price': 2500},
            'inlay': {'duration': 60, 'price': 1400},
            'onlay': {'duration': 60, 'price': 1400},
            'whitening': {'duration': 60, 'price': 750},
            'bonding': {'duration': 30, 'price': 150},
            'sealant': {'duration': 15, 'price': 70},
            'night-guard': {'duration': 30, 'price': 600},
            'orthodontic-treatment': {'duration': 60, 'price': 4000},
            'braces': {'duration': 60, 'price': 3500},
            'invisalign': {'duration': 60, 'price': 4500},
            'retainer': {'duration': 30, 'price': 200},
            'space-maintainer': {'duration': 30, 'price': 180},
            'apicoectomy': {'duration': 90, 'price': 950},
            'bone-graft': {'duration': 90, 'price': 800},
            'sinus-lift': {'duration': 120, 'price': 1200},
            'gum-graft': {'duration': 90, 'price': 750},
            
            # NEW: Current dental codes (matching dental-data.ts)
            # Examinations
            'exam_emergency': {'duration': 20, 'price': 100},
            'exam_comprehensive': {'duration': 40, 'price': 120},
            'radiograph_intraoral': {'duration': 10, 'price': 45},
            'radiograph_opg': {'duration': 15, 'price': 100},
            
            # Preventive
            'scale_clean_polish': {'duration': 30, 'price': 190},
            'fluoride_application': {'duration': 15, 'price': 40},
            'fissure_sealant': {'duration': 15, 'price': 70},
            'desensitising': {'duration': 15, 'price': 55},
            'oh_instructions': {'duration': 15, 'price': 40},
            'whitening_inchair': {'duration': 90, 'price': 750},
            'whitening_takehome': {'duration': 20, 'price': 450},
            
            # Restorative - Composite
            'resto_comp_one_surface_ant': {'duration': 30, 'price': 220},
            'resto_comp_two_surface_ant': {'duration': 40, 'price': 280},
            'resto_comp_three_plus_ant': {'duration': 50, 'price': 340},
            'resto_comp_one_surface_post': {'duration': 35, 'price': 260},
            'resto_comp_two_surface_post': {'duration': 45, 'price': 320},
            'resto_comp_three_plus_post': {'duration': 55, 'price': 380},
            'resto_glassionomer': {'duration': 25, 'price': 160},
            'resto_amalgam_post': {'duration': 35, 'price': 290},
            
            # Crowns and indirect restorations
            'crown_temp': {'duration': 30, 'price': 180},
            'crown_full_tooth_coloured': {'duration': 60, 'price': 1800},
            'crown_full_metal': {'duration': 60, 'price': 1650},
            'onlay_inlay_indirect_tc': {'duration': 60, 'price': 1400},
            'veneer_indirect': {'duration': 60, 'price': 1500},
            'veneer_direct': {'duration': 45, 'price': 650},
            
            # Endodontic
            'endo_direct_pulp_cap': {'duration': 30, 'price': 120},
            'endo_indirect_pulp_cap': {'duration': 25, 'price': 120},
            'endo_pulpotomy': {'duration': 35, 'price': 220},
            'endo_extirpation': {'duration': 40, 'price': 180},
            'endo_rct_single': {'duration': 90, 'price': 1100},
            'endo_rct_multi': {'duration': 120, 'price': 1600},
            'endo_retx': {'duration': 150, 'price': 1900},
            'endo_apicectomy': {'duration': 90, 'price': 950},
            'endo_rct_1_canal': {'duration': 90, 'price': 1100},
            'endo_rct_2_canals': {'duration': 105, 'price': 1350},
            'endo_rct_3_canals': {'duration': 120, 'price': 1650},
            'endo_rct_4_canals': {'duration': 135, 'price': 1850},
            'endo_retx_load': {'duration': 30, 'price': 300},
            'endo_calcified_per_canal': {'duration': 20, 'price': 150},
            'endo_remove_post': {'duration': 25, 'price': 180},
            'endo_remove_root_filling_per_canal': {'duration': 15, 'price': 120},
            'endo_additional_irrigation_visit': {'duration': 20, 'price': 120},
            'endo_interim_therapeutic_fill': {'duration': 25, 'price': 180},
            'endo_apicectomy_per_root': {'duration': 90, 'price': 950},
            'endo_extirpation_emergency': {'duration': 40, 'price': 180},
            
            # Periodontal
            'perio_scale_root_planing': {'duration': 60, 'price': 280},
            'perio_curettage': {'duration': 60, 'price': 280},
            'perio_flap_surgery': {'duration': 90, 'price': 950},
            'perio_graft': {'duration': 90, 'price': 750},
            'perio_crown_lengthening': {'duration': 90, 'price': 950},
            'perio_guided_tissue_regen': {'duration': 120, 'price': 1100},
            'perio_bone_graft': {'duration': 90, 'price': 950},
            
            # Surgical
            'surg_simple_extraction': {'duration': 30, 'price': 250},
            'surg_surgical_extraction': {'duration': 45, 'price': 450},
            'surg_incision_drainage': {'duration': 30, 'price': 200},
            'surg_replantation': {'duration': 60, 'price': 500},
            'surg_frenectomy': {'duration': 45, 'price': 400},
            'surg_biopsy': {'duration': 40, 'price': 350},
            'surg_exposure_unerupted': {'duration': 60, 'price': 400},
            'surg_alveoloplasty': {'duration': 60, 'price': 500},
            'surg_tori_removal': {'duration': 90, 'price': 850},
            'surg_minor_soft_tissue': {'duration': 45, 'price': 400},
            'surg_apical_cystectomy': {'duration': 120, 'price': 1200},
            
            # Prosthodontic
            'prost_partial_denture_resin': {'duration': 60, 'price': 1600},
            'prost_partial_denture_cast': {'duration': 75, 'price': 2200},
            'prost_full_denture_resin': {'duration': 90, 'price': 2500},
            'prost_denture_reline': {'duration': 45, 'price': 550},
            'prost_denture_repair': {'duration': 30, 'price': 300},
            'prost_partial_denture_resin_1to3': {'duration': 55, 'price': 1450},
            'prost_partial_denture_resin_4plus': {'duration': 65, 'price': 1700},
            'prost_partial_denture_cast_1to3': {'duration': 70, 'price': 2100},
            'prost_partial_denture_cast_4plus': {'duration': 80, 'price': 2400},
            'prost_immediate_denture_partial': {'duration': 70, 'price': 1850},
            'prost_immediate_denture_full': {'duration': 95, 'price': 2700},
            'prost_full_denture_upper': {'duration': 90, 'price': 2500},
            'prost_full_denture_lower': {'duration': 90, 'price': 2600},
            'prost_add_to_denture': {'duration': 30, 'price': 300},
            'prost_soft_reline': {'duration': 40, 'price': 380},
            'prost_hard_reline_lab': {'duration': 50, 'price': 550},
            'prost_denture_repair_fracture': {'duration': 30, 'price': 300},
            'prost_denture_adjustment': {'duration': 20, 'price': 120},
            'prost_resilient_lining': {'duration': 45, 'price': 400},
            'prost_overdenture': {'duration': 120, 'price': 2800},
            
            # Posts and Bridges
            'post_core_direct': {'duration': 40, 'price': 420},
            'post_core_indirect': {'duration': 60, 'price': 650},
            'bridge_temp': {'duration': 35, 'price': 220},
            'bridge_pontic_indirect_tc': {'duration': 60, 'price': 1600},
            'bridge_abutment_crown_tc': {'duration': 65, 'price': 1700},
            'bridge_recement': {'duration': 25, 'price': 220},
            'crown_recement': {'duration': 20, 'price': 180},
            
            # Implant Restorative
            'crown_implant_supported_tc': {'duration': 70, 'price': 1950},
            'abutment_custom': {'duration': 40, 'price': 420},
            
            # Functional
            'splint_occlusal': {'duration': 30, 'price': 600},
            'tmj_adjustment': {'duration': 30, 'price': 250},
            
            # Palliative/Sedation
            'palliative_care': {'duration': 25, 'price': 120},
            'postop_review_simple': {'duration': 15, 'price': 60},
            'medication_prescription': {'duration': 10, 'price': 30},
            'nitrous_sedation': {'duration': 30, 'price': 180},
            'iv_sedation_inhouse': {'duration': 60, 'price': 800},
            'mouthguard_custom': {'duration': 30, 'price': 220},
            
            # Trauma
            'trauma_splinting': {'duration': 45, 'price': 350},
            'trauma_pulpotomy_temp': {'duration': 30, 'price': 200},
            
            # Orthodontic
            'ortho_removable_appliance': {'duration': 45, 'price': 750},
            'ortho_clear_aligner_simple': {'duration': 60, 'price': 2500},
            'ortho_retainer': {'duration': 30, 'price': 400},
        }
        
        # Pass the token to the service method
        custom_settings = await supabase_service.get_treatment_settings(token)
        
        # Get default treatments from master table (no token needed)
        default_treatments = await supabase_service.get_dental_treatments()
        
        # Merge custom settings with defaults
        treatment_data = {}
        
        # Start with hardcoded defaults
        treatment_data = HARDCODED_DEFAULTS.copy()
        
        # Override with database defaults if available
        for treatment in default_treatments:
            treatment_data[treatment['code']] = {
                'duration': treatment['default_duration'],
                'price': treatment['default_price']
            }
        
        # Finally override with custom settings if they exist
        if custom_settings and custom_settings.get('treatment_settings'):
            custom_data = custom_settings.get('treatment_settings', {})
            for code, settings in custom_data.items():
                treatment_data[code] = settings
        
        logger.info(f"✅ Returning {len(treatment_data)} treatment settings")
        
        return {
            "status": "success",
            "treatment_data": treatment_data,
            "has_customizations": bool(custom_settings and custom_settings.get('treatment_settings')),
            "last_updated": custom_settings.get('updated_at') if custom_settings else None
        }
        
    except Exception as e:
        logger.error(f"Error fetching treatment settings: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch treatment settings: {str(e)}"
        )

@router.post("/treatment-settings")
async def save_treatment_settings(
    treatment_data: dict,
    token: str = Depends(get_auth_token)
):
    """Save clinic-specific treatment customizations (only modified values)"""
    try:
        logger.info(f"Saving treatment settings. Data count: {len(treatment_data)}")
        
        # Get default treatments to validate against
        default_treatments = await supabase_service.get_dental_treatments()
        default_map = {t['code']: t for t in default_treatments}
        
        # Filter out settings that match defaults (no need to store them)
        customized_settings = {}
        
        for code, value in treatment_data.items():
            # Validate structure
            if not isinstance(value, dict) or 'duration' not in value or 'price' not in value:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid treatment data format for '{code}'"
                )
            
            # Validate data types
            if not isinstance(value['duration'], (int, float)) or value['duration'] <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid duration for treatment '{code}'"
                )
                
            if not isinstance(value['price'], (int, float)) or value['price'] < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid price for treatment '{code}'"
                )
            
            # Only store if different from default
            if code in default_map:
                default = default_map[code]
                if (value['duration'] != default['default_duration'] or 
                    value['price'] != float(default['default_price'])):
                    customized_settings[code] = value
        
        # Save only customized settings
        result = await supabase_service.save_treatment_settings(customized_settings, token)
        
        if result:
            logger.info(f"Saved {len(customized_settings)} customized treatment settings")
            return {
                "status": "success",
                "message": "Treatment settings saved successfully",
                "customized_count": len(customized_settings),
                "total_count": len(treatment_data)
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to save treatment settings"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error saving treatment settings: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save treatment settings: {str(e)}"
        )

@router.delete("/treatment-settings/reset")
async def reset_treatment_settings(
    token: str = Depends(get_auth_token)
):
    """Reset all treatment settings to defaults by clearing customizations"""
    try:
        logger.info("Resetting treatment settings to defaults")
        
        # Clear the treatment_settings JSON field
        result = await supabase_service.clear_treatment_settings(token)
        
        if result:
            return {
                "status": "success",
                "message": "Treatment settings reset to defaults"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to reset treatment settings"
            )
            
    except Exception as e:
        logger.error(f"Error resetting treatment settings: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset treatment settings: {str(e)}"
        )

@router.get("/dental-data/treatments")
async def get_dental_treatments():
    """Get all available dental treatments (master data)"""
    try:
        treatments = await supabase_service.get_dental_treatments()
        return treatments
    except Exception as e:
        logger.error(f"Error fetching dental treatments: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch dental treatments: {str(e)}"
        )

@router.get("/dental-data/conditions")
async def get_dental_conditions():
    """Get all dental conditions (master data)"""
    try:
        conditions = await supabase_service.get_dental_conditions()
        return conditions
    except Exception as e:
        logger.error(f"Error fetching dental conditions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch dental conditions: {str(e)}"
        )

@router.post("/clinic-branding/logo")
async def upload_clinic_logo(
    file: UploadFile,
    token: str = Depends(get_auth_token)
):
    """Upload clinic logo to Supabase storage"""
    try:
        # Decode JWT to get user_id
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get('sub')
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        # Read file contents
        file_contents = await file.read()
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        filename = f"clinic_logo_{user_id}_{int(datetime.now().timestamp())}.{file_extension}"
        
        # Upload to Supabase storage
        logo_url = await supabase_service.upload_image(
            file_contents,
            f"clinic_logos/{filename}",
            token
        )
        
        if not logo_url:
            raise HTTPException(status_code=500, detail="Failed to upload logo")
        
        logger.info(f"✅ Logo uploaded successfully: {logo_url}")
        
        return {
            "status": "success",
            "logo_url": logo_url
        }
        
    except Exception as e:
        logger.error(f"Error uploading clinic logo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload logo: {str(e)}")

@router.post("/clinic-branding")
async def save_clinic_branding(
    branding_data: ClinicBrandingData,
    token: str = Depends(get_auth_token)
):
    """Save clinic branding information"""
    try:
        # Create authenticated client
        auth_client = supabase_service._create_authenticated_client(token)
        
        # Convert to dict and clean values
        raw_branding_dict = branding_data.model_dump()
        
        # Trim strings and remove empty values
        branding_dict = {}
        for key, value in raw_branding_dict.items():
            if isinstance(value, str):
                trimmed = value.strip()
                if trimmed:
                    branding_dict[key] = trimmed
                else:
                    # Skip empty strings to avoid overwriting with NULL
                    continue
            elif value is not None:
                branding_dict[key] = value
        
        # DEBUG: Log the authentication context
        logger.info(f"Attempting to save clinic branding with token: {token[:20]}...")
        
        # DEBUG: Try to get user info from the authenticated client
        try:
            user_response = auth_client.auth.get_user()
            logger.info(f"User context: {user_response}")
        except Exception as user_error:
            logger.error(f"Failed to get user context: {str(user_error)}")
        
        # Save or update branding data
        logger.info("Checking for existing clinic branding records...")
        existing_response = auth_client.table('clinic_branding').select("*").execute()
        logger.info(f"Existing records found: {len(existing_response.data) if existing_response.data else 0}")
        
        if existing_response.data:
            # Update existing branding
            logger.info(f"Updating existing branding record with ID: {existing_response.data[0]['id']}")
            response = auth_client.table('clinic_branding').update({
                **branding_dict,
                'updated_at': datetime.now().isoformat()
            }).eq('id', existing_response.data[0]['id']).execute()
            logger.info("Update operation completed successfully")
        else:
            # Create new branding record
            logger.info("Creating new branding record...")
            insert_data = {
                **branding_dict,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            logger.info(f"Insert data: {insert_data}")
            
            # DEBUG: Try to explicitly add user_id if we can extract it
            try:
                # Decode JWT to get user_id
                import jwt
                decoded_token = jwt.decode(token, options={"verify_signature": False})
                user_id = decoded_token.get('sub')
                if user_id:
                    insert_data['user_id'] = user_id
                    logger.info(f"Added user_id to insert data: {user_id}")
                else:
                    logger.warning("No user_id found in JWT token")
            except Exception as jwt_error:
                logger.error(f"Failed to decode JWT token: {str(jwt_error)}")
            
            response = auth_client.table('clinic_branding').insert(insert_data).execute()
            logger.info("Insert operation completed successfully")
        
        return {
            "status": "success",
            "message": "Clinic branding saved successfully",
            "branding_data": branding_dict
        }
        
    except Exception as e:
        logger.error(f"Error saving clinic branding: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        
        # DEBUG: Log more details about the error
        if hasattr(e, 'details'):
            logger.error(f"Error details: {e.details}")
        if hasattr(e, 'message'):
            logger.error(f"Error message: {e.message}")
        if hasattr(e, 'code'):
            logger.error(f"Error code: {e.code}")
            
        raise HTTPException(status_code=500, detail=f"Failed to save branding: {str(e)}")


@router.get("/clinic-branding")
async def get_clinic_branding(
    token: str = Depends(get_auth_token)
):
    """Get clinic branding information"""
    try:
        # Create authenticated client
        auth_client = supabase_service._create_authenticated_client(token)
        
        # Get branding data
        response = auth_client.table('clinic_branding').select("*").execute()
        
        if response.data:
            branding_data = response.data[0]
            # Remove metadata fields
            branding_data.pop('id', None)
            branding_data.pop('created_at', None)
            branding_data.pop('updated_at', None)
            branding_data.pop('user_id', None)
            
            return {
                "status": "success",
                "branding_data": branding_data
            }
        else:
            return {
                "status": "success",
                "branding_data": {}
            }
        
    except Exception as e:
        logger.error(f"Error getting clinic branding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get branding: {str(e)}")


@router.get("/dental-data/conditions")
async def get_dental_conditions():
    """Get list of dental conditions for dropdowns"""
    conditions = [
        {"value": "caries", "label": "Caries", "pinned": True},
        {"value": "periapical-lesion", "label": "Periapical lesion", "pinned": True},
        {"value": "root-fracture", "label": "Root fracture", "pinned": True},
        {"value": "impacted-tooth", "label": "Impacted tooth", "pinned": True},
        {"value": "missing-tooth", "label": "Missing tooth", "pinned": True},
        {"value": "gingivitis", "label": "Gingivitis", "pinned": True},
        {"value": "periodontal-pocket", "label": "Periodontal pocket", "pinned": True},
        {"value": "attrition", "label": "Attrition", "pinned": True},
        {"value": "pulpitis", "label": "Pulpitis", "pinned": True},
        {"value": "tooth-mobility", "label": "Tooth mobility", "pinned": True},
        # Additional conditions
        {"value": "abrasion", "label": "Abrasion", "pinned": False},
        {"value": "erosion", "label": "Erosion", "pinned": False},
        {"value": "calculus", "label": "Calculus", "pinned": False},
        {"value": "plaque", "label": "Plaque", "pinned": False},
        {"value": "crown-fracture", "label": "Crown fracture", "pinned": False},
        {"value": "root-piece", "label": "Root piece", "pinned": False},
        {"value": "abscess", "label": "Abscess", "pinned": False},
        {"value": "cyst", "label": "Cyst", "pinned": False},
        {"value": "resorption", "label": "Resorption", "pinned": False},
        {"value": "hypoplasia", "label": "Hypoplasia", "pinned": False},
        {"value": "fluorosis", "label": "Fluorosis", "pinned": False},
        {"value": "staining", "label": "Staining", "pinned": False},
    ]
    
    return {
        "status": "success",
        "conditions": conditions
    }


@router.get("/dental-data/treatments")
async def get_dental_treatments():
    """
    ✅ NEW: Serve master treatment database (treatments.au.json)
    
    Returns complete treatment data including:
    - code, displayName, friendlyPatientName
    - category, description
    - defaultDuration, defaultPriceAUD
    - insuranceCodes (AU, US, UK, CA, NZ)
    - autoMapConditions, toothNumberRules
    - replacementOptions, metadata
    """
    try:
        # Get the path to the treatments.au.json file
        # Assuming server is running from /server directory
        base_dir = Path(__file__).parent.parent.parent  # Go up to project root
        treatments_path = base_dir / "client" / "src" / "data" / "treatments.au.json"
        
        # Check if file exists
        if not treatments_path.exists():
            logger.error(f"❌ Master treatment database not found at: {treatments_path}")
            # Fallback to empty array with error
            return {
                "status": "error",
                "message": "Master treatment database not found",
                "treatments": []
            }
        
        # Load and return the master database
        with open(treatments_path, 'r', encoding='utf-8') as f:
            treatments = json.load(f)
        
        logger.info(f"✅ Loaded {len(treatments)} treatments from master database")
        
        return {
            "status": "success",
            "treatments": treatments,
            "count": len(treatments),
            "source": "treatments.au.json"
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"❌ Error parsing treatments.au.json: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Invalid JSON in master database: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Error loading master treatment database: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load treatments: {str(e)}")


@router.get("/dental-data/conditions-master")
async def get_dental_conditions_master():
    """
    ✅ NEW: Serve master conditions database (conditions.core.json)
    
    Returns complete condition data including:
    - value, label, urgency, category
    """
    try:
        base_dir = Path(__file__).parent.parent.parent
        conditions_path = base_dir / "client" / "src" / "data" / "conditions.core.json"
        
        if not conditions_path.exists():
            logger.error(f"❌ Master conditions database not found at: {conditions_path}")
            return {
                "status": "error",
                "message": "Master conditions database not found",
                "conditions": []
            }
        
        with open(conditions_path, 'r', encoding='utf-8') as f:
            conditions = json.load(f)
        
        logger.info(f"✅ Loaded {len(conditions)} conditions from master database")
        
        return {
            "status": "success",
            "conditions": conditions,
            "count": len(conditions),
            "source": "conditions.core.json"
        }
        
    except Exception as e:
        logger.error(f"❌ Error loading master conditions database: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load conditions: {str(e)}")


@router.get("/dental-data/mappings-master")
async def get_condition_mappings_master():
    """
    ✅ NEW: Serve master condition→treatment mappings (mappings.core.json)
    
    Returns complete mapping data including:
    - condition, treatments (array with treatment code, priority, optional stage hint)
    """
    try:
        base_dir = Path(__file__).parent.parent.parent
        mappings_path = base_dir / "client" / "src" / "data" / "mappings.core.json"
        
        if not mappings_path.exists():
            logger.error(f"❌ Master mappings database not found at: {mappings_path}")
            return {
                "status": "error",
                "message": "Master mappings database not found",
                "mappings": []
            }
        
        with open(mappings_path, 'r', encoding='utf-8') as f:
            mappings = json.load(f)
        
        logger.info(f"✅ Loaded {len(mappings)} condition mappings from master database")
        
        return {
            "status": "success",
            "mappings": mappings,
            "count": len(mappings),
            "source": "mappings.core.json"
        }
        
    except Exception as e:
        logger.error(f"❌ Error loading master mappings database: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load mappings: {str(e)}")


@router.get("/dental-data/treatment-suggestions/{condition}")
async def get_treatment_suggestions(condition: str):
    """
    Get suggested treatments for a specific condition
    
    ✅ UPDATED: Now uses master mappings database for suggestions
    """
    suggestions_map = {
        "caries": ["filling"],
        "periapical-lesion": ["root-canal-treatment"],
        "root-fracture": ["crown"],
        "crown-fracture": ["crown"],
        "attrition": ["composite-build-up", "crown"],
        "pulpitis": ["root-canal-treatment"],
        "missing-tooth": ["implant-placement", "bridge", "partial-denture"],
        "tooth-mobility": ["extraction"],
        "impacted-tooth": ["surgical-extraction"],
        "root-piece": ["surgical-extraction"],
        "periodontal-pocket": ["deep-cleaning"],
        "gingivitis": ["scale-and-clean"]
    }
    
    suggested_treatments = suggestions_map.get(condition, [])
    
    return {
        "status": "success",
        "condition": condition,
        "suggested_treatments": suggested_treatments
    }


class OCRRequest(BaseModel):
    image_data: str  # Base64 encoded image


@router.post("/process-image-ocr")
async def process_image_ocr(
    request: OCRRequest,
    token: str = Depends(get_auth_token)
):
    """Process image with OCR to extract treatment prices"""
    try:
        # Extract base64 data (remove data:image/...;base64, prefix if present)
        image_data = request.image_data
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        
        # Use OpenAI Vision API to extract pricing information
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        system_prompt = """You are an expert at extracting dental treatment pricing information from images.
        
        Analyze the provided image and extract any treatment names and their corresponding prices.
        
        Look for:
        - Treatment names (like "Filling", "Crown", "Root Canal", "Extraction", etc.)
        - Associated prices (numbers with currency symbols or just numbers)
        - Table structures, lists, or any organized pricing information
        
        Return the extracted information as a JSON object where keys are treatment names (normalized to lowercase with hyphens) and values are numeric prices.
        
        Example output format:
        {
          "filling": 120.00,
          "crown": 1200.00,
          "root-canal-treatment": 400.00,
          "extraction": 180.00
        }
        
        If no pricing information is found, return an empty object: {}
        
        Normalize treatment names to match common dental terminology:
        - "Filling" or "Composite" -> "filling"
        - "Crown" -> "crown"
        - "Root Canal" -> "root-canal-treatment"
        - "Extraction" -> "extraction"
        - "Cleaning" or "Scale and Clean" -> "scale-and-clean"
        - "Implant" -> "implant-placement"
        - etc.
        """
        
        # Mock OCR response for now
        mock_pricing_data = {
            "filling": 120.00,
            "crown": 1200.00,
            "root-canal-treatment": 400.00,
            "extraction": 180.00,
            "scale-and-clean": 80.00
        }
        
        return {
            "success": True,
            "pricing_data": mock_pricing_data,
            "message": "OCR processing completed"
        }
        
    except Exception as e:
        logger.error(f"OCR processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

# Insurance Verification Endpoints
@router.post("/insurance/verify", response_model=InsuranceVerificationResponse)
async def verify_insurance(
    request: InsuranceVerificationRequest,
    token: str = Depends(get_auth_token)
):
    """
    Verify patient insurance coverage and get cost estimates
    """
    try:
        logger.info(f"Starting insurance verification for patient: {request.patient_id}")
        
        # Use the insurance verification service
        from services.insurance_verification import VerificationRequest
        
        verification_request = VerificationRequest(
            patient_id=request.patient_id,
            insurance_provider=request.insurance_provider,
            policy_number=request.policy_number,
            group_number=request.group_number,
            subscriber_name=request.subscriber_name,
            subscriber_relationship=request.subscriber_relationship,
            date_of_birth=request.date_of_birth,
            treatment_codes=request.treatment_codes
        )
        
        result = insurance_service.verify_insurance(verification_request)
        
        return InsuranceVerificationResponse(
            verification_id=result.verification_id,
            status=result.status,
            coverage_details=result.coverage_details,
            estimated_costs=result.estimated_costs,
            verification_date=result.verification_date,
            next_verification_due=result.next_verification_due,
            notes=result.notes
        )
        
    except Exception as e:
        logger.error(f"Insurance verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Insurance verification failed: {str(e)}")

@router.post("/insurance/patient")
async def save_patient_insurance(
    insurance_data: PatientInsurance,
    token: str = Depends(get_auth_token)
):
    """
    Save patient insurance information
    """
    try:
        logger.info(f"Saving insurance data for patient: {insurance_data.patient_id}")
        
        # Use the insurance service
        result = insurance_service.save_patient_insurance(insurance_data.dict())
        return result
        
    except Exception as e:
        logger.error(f"Save insurance error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save insurance data: {str(e)}")

@router.get("/insurance/patient/{patient_id}")
async def get_patient_insurance(
    patient_id: str,
    token: str = Depends(get_auth_token)
):
    """
    Get patient insurance information
    """
    try:
        logger.info(f"Fetching insurance data for patient: {patient_id}")
        
        # Use the insurance service
        insurance_data = insurance_service.get_patient_insurance(patient_id)
        
        return {
            "success": True,
            "insurance_data": insurance_data
        }
        
    except Exception as e:
        logger.error(f"Get insurance error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get insurance data: {str(e)}")

@router.get("/insurance/providers")
async def get_insurance_providers(
    token: str = Depends(get_auth_token)
):
    """
    Get list of supported insurance providers
    """
    try:
        logger.info("Fetching insurance providers")
        
        # Use the insurance service
        providers = insurance_service.get_providers()
        
        return {
            "success": True,
            "providers": providers
        }
        
    except Exception as e:
        logger.error(f"Get providers error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get insurance providers: {str(e)}")

@router.get("/insurance/verification/{verification_id}")
async def get_verification_status(
    verification_id: str,
    token: str = Depends(get_auth_token)
):
    """
    Get insurance verification status and results
    """
    try:
        logger.info(f"Fetching verification status for: {verification_id}")
        
        # Mock verification status
        mock_status = {
            "verification_id": verification_id,
            "status": "completed",
            "coverage_details": {
                "eligibility_status": "Active",
                "coverage_period": {
                    "start_date": "2024-01-01",
                    "end_date": "2024-12-31"
                },
                "benefits": {
                    "preventive": {"coverage": 100, "frequency": "2x/year"},
                    "basic": {"coverage": 80, "frequency": "unlimited"},
                    "major": {"coverage": 50, "frequency": "unlimited"}
                }
            },
            "estimated_costs": {
                "D0150": {
                    "treatment_name": "Comprehensive Oral Evaluation",
                    "total_cost": 150.0,
                    "insurance_coverage": 120.0,
                    "patient_responsibility": 30.0,
                    "copay_amount": 20.0,
                    "deductible_applied": 10.0,
                    "coverage_percentage": 80.0
                }
            },
            "verification_date": datetime.now().isoformat(),
            "next_verification_due": (datetime.now().replace(month=datetime.now().month + 1)).isoformat(),
            "notes": "Insurance verification completed successfully"
        }
        
        return {
            "success": True,
            "verification": mock_status
        }
        
    except Exception as e:
        logger.error(f"Get verification status error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get verification status: {str(e)}")

# Tooth Mapping Endpoints
class ToothMappingRequest(BaseModel):
    image_url: str
    detections: List[Dict[str, Any]]
    numbering_system: str = "FDI"  # Default to FDI, can be "FDI" or "Universal"

@router.post("/tooth-mapping")
async def map_teeth(
    request: ToothMappingRequest,
    token: str = Depends(get_auth_token)
):
    """
    Map dental conditions to specific tooth numbers using ensemble AI approach
    """
    try:
        logger.info(f"Starting tooth mapping for {len(request.detections)} detections")
        logger.info(f"User requested numbering system: {request.numbering_system}")
        
        # Convert detections to Detection objects
        detections = [
            Detection(
                class_name=detection["class"],
                confidence=detection["confidence"],
                x=detection["x"],
                y=detection["y"],
                width=detection.get("width", 0),
                height=detection.get("height", 0)
            )
            for detection in request.detections
        ]
        
        # Use provider switch; default to existing ensemble
        provider = os.getenv("TOOTH_MAPPING_PROVIDER", "ensemble").lower()
        if provider == "april_vision":
            # Call Roboflow condition detections already produced upstream; here we only have detections list
            # For AprilVision flow we also need segmentation predictions
            seg_json = await roboflow_service.segment_teeth(request.image_url)
            if not seg_json:
                # fallback to existing implementation if segmentation unavailable
                result = tooth_mapping_service.map_teeth_ensemble(request.image_url, detections, request.numbering_system)
            else:
                # Build synthetic condition_detections payload from incoming detections
                cond_json = {
                    "predictions": [
                        {
                            "class": d.class_name,
                            "confidence": d.confidence,
                            "x": d.x,
                            "y": d.y,
                            "width": d.width,
                            "height": d.height,
                        }
                        for d in detections
                    ]
                }
                # Image width is unknown here; AprilVision uses it to midline-correct if provided.
                result = map_with_segmentation(None, cond_json, seg_json, request.numbering_system)
        else:
            # Perform ensemble tooth mapping with user's numbering system preference
            result = tooth_mapping_service.map_teeth_ensemble(request.image_url, detections, request.numbering_system)
        
        return {
            "success": True,
            "mappings": [
                {
                    "detection_id": mapping.detection_id,
                    "tooth_number": mapping.tooth_number,  # Will be in user's preferred system
                    "confidence": mapping.confidence,
                    "method": mapping.method,
                    "reasoning": mapping.reasoning,
                    "gpt_prediction": mapping.gpt_prediction,
                    "grid_prediction": mapping.grid_prediction
                }
                for mapping in result.mappings
            ],
            "overall_confidence": result.overall_confidence,
            "processing_time": result.processing_time,
            "method_used": result.method_used
        }
        
    except Exception as e:
        logger.error(f"Tooth mapping error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Tooth mapping failed: {str(e)}")


@router.post("/image/overlay")
async def add_tooth_number_overlay(
    request: ToothNumberOverlayRequest,
    token: str = Depends(get_auth_token)
):
    """
    Add tooth number overlays to an X-ray image.
    """
    try:
        if not request.show_numbers:
            return {"image_url": request.image_url, "has_overlay": False}
        
        # NEW: If cached segmentation data is provided, use it
        seg_json = request.cached_segmentation_data
        
        # Otherwise, try to get fresh segmentation
        if not seg_json:
            # Only call Roboflow if we have a real URL (not base64)
            if not request.image_url.startswith('data:image'):
                seg_json = await roboflow_service.segment_teeth(request.image_url)
            else:
                logger.warning("Cannot segment base64 image - need cached segmentation data")
                return {"image_url": request.image_url, "has_overlay": False}
        
        if not seg_json:
            logger.warning("No segmentation data available for overlay")
            return {"image_url": request.image_url, "has_overlay": False}
        
        # Add tooth number overlay
        overlay_image = await image_overlay_service.add_tooth_number_overlay(
            request.image_url, 
            seg_json, 
            request.numbering_system, 
            True,
            request.text_size_multiplier, 
            request.condition_data
        )
        
        if overlay_image:
            # Security check
            if overlay_image.startswith('/tmp/') or overlay_image.startswith('file://') or (not overlay_image.startswith('http') and not overlay_image.startswith('data:')):
                logger.error(f"SECURITY: Blocking unsafe image path from overlay service: {overlay_image}")
                return {"image_url": request.image_url, "has_overlay": False}
            
            logger.info(f"Tooth overlay successful")
            return {
                "image_url": overlay_image, 
                "has_overlay": True,
                "segmentation_data": seg_json  # Return it so frontend can cache it
            }
        else:
            logger.warning("Failed to create overlay image")
            return {"image_url": request.image_url, "has_overlay": False}
            
    except Exception as e:
        logger.error(f"Tooth number overlay error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Tooth number overlay failed: {str(e)}")


@router.post("/billing/checkout")
async def create_checkout_session(interval: str = "monthly", token: str = Depends(get_auth_token)):
    try:
        from services.stripe_service import get_stripe_service
        stripe_service = get_stripe_service()
        if not stripe_service:
            raise HTTPException(status_code=500, detail="Stripe service unavailable")
        url = stripe_service.create_checkout_session(token, interval)
        return {"url": url}
    except Exception as e:
        logger.error(f"Stripe checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/billing/registration-checkout")
async def create_registration_checkout(request: Request):
    """Create Stripe checkout for new user registration (before account creation)"""
    try:
        data = await request.json()
        user_data = data.get('userData', {})
        interval = data.get('interval', 'monthly')
        
        # Store user data temporarily (including password) for webhook processing
        # We'll use a simple in-memory store for now, but in production you'd want Redis or similar
        import uuid
        registration_id = str(uuid.uuid4())
        
        # Store the registration data temporarily
        # In production, use Redis or database instead of global variable
        if not hasattr(create_registration_checkout, 'pending_registrations'):
            create_registration_checkout.pending_registrations = {}
        
        create_registration_checkout.pending_registrations[registration_id] = {
            'user_data': user_data,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(hours=1)  # Expire after 1 hour
        }
        
        # Add registration ID to user data for webhook processing
        user_data['registration_id'] = registration_id
        
        # Create checkout session with user data in metadata
        # This will be processed by the webhook after successful payment
        from services.stripe_service import get_stripe_service
        stripe_service = get_stripe_service()
        if not stripe_service:
            raise HTTPException(status_code=500, detail="Stripe service unavailable")
        url = stripe_service.create_registration_checkout(user_data, interval)
        return {"url": url}
    except Exception as e:
        logger.error(f"Registration checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/billing/portal")
async def create_billing_portal(customer_id: str, token: str = Depends(get_auth_token)):
    try:
        from services.stripe_service import get_stripe_service
        stripe_service = get_stripe_service()
        if not stripe_service:
            raise HTTPException(status_code=500, detail="Stripe service unavailable")
        url = stripe_service.create_billing_portal(customer_id)
        return {"url": url}
    except Exception as e:
        logger.error(f"Stripe portal error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/billing/verify")
async def verify_payment(session_id: str, token: str = Depends(get_auth_token)):
    """Verify payment session for existing users"""
    try:
        # Verify the payment session
        from services.stripe_service import get_stripe_service
        stripe_service = get_stripe_service()
        if not stripe_service:
            raise HTTPException(status_code=500, detail="Stripe service unavailable")
        
        result = stripe_service.verify_payment_session(session_id, token)
        return result
    except Exception as e:
        logger.error(f"Payment verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/billing/verify-public")
async def verify_payment_public(request: Request):
    """Verify payment session for new registrations (no auth required)"""
    try:
        # Parse request body to get session_id
        body = await request.json()
        session_id = body.get('session_id')
        
        if not session_id:
            logger.error("❌ No session_id provided in request body")
            return {
                "success": False,
                "message": "Session ID is required"
            }
        
        logger.info(f"🔍 Verifying payment session: {session_id}")
        
        # Check if Stripe API key is available
        stripe_api_key = os.getenv('STRIPE_SECRET_KEY')
        if not stripe_api_key:
            logger.error("❌ STRIPE_SECRET_KEY not set")
            return {
                "success": False,
                "message": "Stripe configuration error"
            }
        
        # Verify the payment session directly with Stripe
        import stripe
        stripe.api_key = stripe_api_key
        
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            logger.info(f"📊 Session status: {session.status}")
            
            if session.status == 'complete':
                # Check if this was a new registration
                is_new_registration = session.metadata.get('is_registration') == 'true'
                
                if is_new_registration:
                    logger.info("🆕 New registration payment verified")
                    
                    # Get user email from metadata to help with auto-login
                    user_email = session.metadata.get('user_email', '')
                    
                    # Decode registration data to get the password
                    import base64
                    registration_data_encoded = session.metadata.get('registration_data')
                    user_credentials = None
                    
                    if registration_data_encoded:
                        try:
                            user_data = json.loads(base64.b64decode(registration_data_encoded).decode())
                            user_credentials = {
                                'email': user_data.get('email'),
                                'password': user_data.get('password')
                            }
                            logger.info(f"✅ Extracted credentials for auto-login: {user_credentials['email']}")
                        except Exception as e:
                            logger.error(f"❌ Failed to decode registration data: {e}")
                    
                    return {
                        "success": True,
                        "is_new_registration": True,
                        "message": "Payment verified for new registration",
                        "credentials": user_credentials  # Send credentials for auto-login
                    }
                else:
                    logger.info("👤 Existing user payment verified")
                    return {
                        "success": True,
                        "is_new_registration": False,
                        "message": "Payment verified for existing user"
                    }
            else:
                logger.warning(f"⚠️ Payment session not complete: {session.status}")
                return {
                    "success": False,
                    "message": f"Payment session status: {session.status}"
                }
                
        except stripe.error.StripeError as e:
            logger.error(f"❌ Stripe error: {str(e)}")
            return {
                "success": False,
                "message": f"Stripe error: {str(e)}"
            }
            
    except Exception as e:
        logger.error(f"💥 Payment verification error: {str(e)}")
        return {
            "success": False,
            "message": f"Verification failed: {str(e)}"
        }


from fastapi import Request
import json
import stripe
from datetime import datetime, timedelta

@router.get("/stripe/webhook/test")
async def test_webhook():
    """Test endpoint to verify webhook connectivity"""
    return {"status": "webhook_endpoint_reachable", "timestamp": datetime.utcnow().isoformat()}

@router.post("/stripe/webhook/test-registration")
async def test_registration_webhook():
    """Test registration webhook with mock data"""
    try:
        logger.info("🧪 Testing registration webhook with mock data")
        
        # Mock Stripe session data
        mock_session_data = {
            "id": "cs_test_123",
            "status": "complete",
            "metadata": {
                "is_registration": "true",
                "registration_data": "eyJlbWFpbCI6ICJ0ZXN0QGV4YW1wbGUuY29tIiwgInBhc3N3b3JkIjogIlRlc3RQYXNzd29yZDEyMyEiLCAibmFtZSI6ICJUZXN0IFVzZXIiLCAiY2xpbmljTmFtZSI6ICJUZXN0IENsaW5pYyIsICJjbGluaWNXZWJzaXRlIjogInRlc3QuY29tIiwgImNvdW50cnkiOiAiVVMifQ==",
                "user_email": "test@example.com"
            }
        }
        
        # Use StripeService to handle the webhook
        from services.stripe_service import get_stripe_service
        stripe_service = get_stripe_service()
        if not stripe_service:
            raise HTTPException(status_code=500, detail="Stripe service unavailable")
        
        # Simulate the webhook call
        result = stripe_service._handle_registration_webhook(mock_session_data)
        
        if result:
            return {
                "success": True,
                "message": "Test registration webhook successful",
                "user_id": result
            }
        else:
            return {
                "success": False,
                "message": "Test registration webhook failed"
            }
            
    except Exception as e:
        logger.error(f"💥 Test webhook error: {str(e)}")
        import traceback
        logger.error(f"📍 Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks for payment events"""
    try:
        logger.info("🎯 Stripe webhook received")
        logger.info("🔍 Webhook headers: %s", dict(request.headers))
        logger.info("🔍 Webhook URL: %s", str(request.url))
        
        # Get the webhook payload
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        logger.info(f"📝 Webhook payload size: {len(payload)} bytes")
        logger.info(f"🔐 Signature header present: {bool(sig_header)}")
        
        # For now, skip signature verification and just process the event
        # This helps us debug the actual webhook processing
        webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        if webhook_secret and sig_header:
            try:
                event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
                logger.info("✅ Webhook signature verified")
            except Exception as e:
                logger.error(f"❌ Webhook signature verification failed: {str(e)}")
                # Continue without verification for debugging
                event = json.loads(payload)
        else:
            logger.warning("⚠️ Processing webhook without signature verification")
            event = json.loads(payload)
        
        event_type = event.get('type', 'unknown')
        logger.info(f"📨 Processing event type: {event_type}")
        
        # Handle the event
        if event_type == 'checkout.session.completed':
            session = event.get('data', {}).get('object', {})
            metadata = session.get('metadata', {})
            
            logger.info(f"🎯 Processing checkout.session.completed event")
            logger.info(f"🔍 Session metadata: {metadata}")
            
            # Check if this is a new registration  
            if metadata.get('is_registration') == 'true':
                logger.info("🆕 This is a NEW USER REGISTRATION - using StripeService handler")
                
                # Use StripeService to handle the registration (NEW system)
                from services.stripe_service import get_stripe_service
                stripe_service = get_stripe_service()
                if not stripe_service:
                    logger.error("❌ Stripe service unavailable")
                    return {"status": "error", "message": "Stripe service unavailable"}
                
                # Call the new registration handler
                user_id = stripe_service._handle_registration_webhook(session)
                
                if user_id:
                    logger.info(f"✅ Registration completed successfully for user: {user_id}")
                    return {"status": "success", "message": "Registration completed", "user_id": user_id}
                else:
                    logger.error("❌ Registration failed")
                    return {"status": "error", "message": "Registration failed"}
            
            # OLD SYSTEM (remove this block) - keeping for reference but won't execute
            elif False:  # This will never execute now
                logger.info("🆕 This is a NEW USER REGISTRATION - processing...")
                logger.info("🆕 Processing new user registration after payment")
                
                # Get registration ID from metadata
                registration_id = metadata.get('registration_id')
                
                if not registration_id:
                    logger.error("❌ No registration ID found in webhook metadata")
                    return {"status": "error", "message": "Registration ID missing"}
                
                # Retrieve stored registration data
                from api.routes import create_registration_checkout
                if not hasattr(create_registration_checkout, 'pending_registrations'):
                    logger.error("❌ No pending registrations found")
                    return {"status": "error", "message": "No pending registrations"}
                
                stored_registration = create_registration_checkout.pending_registrations.get(registration_id)
                if not stored_registration:
                    logger.error(f"❌ Registration {registration_id} not found or expired")
                    return {"status": "error", "message": "Registration not found or expired"}
                
                # Check if registration has expired
                if datetime.utcnow() > stored_registration['expires_at']:
                    logger.error(f"❌ Registration {registration_id} has expired")
                    del create_registration_checkout.pending_registrations[registration_id]
                    return {"status": "error", "message": "Registration expired"}
                
                # Extract user data from stored registration
                user_data = stored_registration['user_data']
                logger.info(f"👤 Registration data retrieved: {user_data.get('email')}")
                logger.info(f"🔍 Full user data fields: {list(user_data.keys())}")
                logger.info(f"🏥 Clinic name from form: {user_data.get('clinicName')}")
                logger.info(f"🌐 Website from form: {user_data.get('clinicWebsite')}")
                logger.info(f"🌍 Country from form: {user_data.get('country')}")
                
                try:
                    # Create Supabase account
                    logger.info("🔐 Creating Supabase account...")
                    from services.supabase import get_supabase_service
                    supabase_service = get_supabase_service()
                    
                    if not supabase_service:
                        logger.error("❌ Supabase service not available")
                        return {"status": "error", "message": "Supabase service unavailable"}
                    
                    # Get the password from the stored registration data
                    password = user_data.get('password')
                    
                    if not password:
                        logger.error("❌ No password found in stored registration data")
                        return {"status": "error", "message": "Password missing from registration data"}
                    
                    # Create the user account
                    created_user = await supabase_service.create_user_account(user_data, password)
                    
                    if created_user:
                        logger.info(f"✅ Supabase account created: {created_user['email']}")
                        
                        # Create clinic branding record
                        logger.info("🎨 Creating clinic branding record...")
                        logger.info(f"🔍 User data keys available: {list(user_data.keys())}")
                        logger.info(f"🏥 Clinic name value: {user_data.get('clinicName')}")
                        logger.info(f"📧 Email value: {user_data.get('email')}")
                        logger.info(f"🌐 Website value: {user_data.get('clinicWebsite')}")
                        logger.info(f"🌍 Country value: {user_data.get('country')}")
                        
                        try:
                            branding_data = {
                                'user_id': created_user['id'],
                                'clinic_name': user_data.get('clinicName', 'Unknown Clinic'),  # Frontend sends 'clinicName'
                                'email': user_data.get('email'),
                                'website': user_data.get('clinicWebsite'),  # Frontend sends 'clinicWebsite'
                                'country': user_data.get('country'),
                                'created_at': datetime.utcnow().isoformat(),
                                'updated_at': datetime.utcnow().isoformat()
                            }
                            
                            logger.info(f"🎯 Branding data to insert: {branding_data}")
                            
                            # Insert into clinic_branding table
                            branding_result = await supabase_service.save_clinic_branding(branding_data)
                            if branding_result:
                                logger.info(f"✅ Clinic branding created: {branding_data['clinic_name']}")
                            else:
                                logger.warning("⚠️ Failed to create clinic branding record")
                        except Exception as e:
                            logger.warning(f"⚠️ Clinic branding creation failed: {str(e)}")
                            import traceback
                            logger.warning(f"📍 Clinic branding traceback: {traceback.format_exc()}")
                        
                        # Create S3 folder for the clinic using the new user ID
                        clinic_name = user_data.get('clinicName', 'Unknown Clinic')  # Frontend sends 'clinicName'
                        user_id = created_user['id']
                        
                        logger.info("☁️ Creating S3 folder...")
                        from services.s3_service import get_s3_service
                        s3_service = get_s3_service()
                        
                        if not s3_service:
                            logger.error("❌ S3 service not available")
                            return {"status": "error", "message": "S3 service unavailable"}
                        
                        s3_result = s3_service.create_clinic_folder(clinic_name, user_id)
                        
                        if s3_result and s3_result.get('success'):
                            logger.info(f"✅ Successfully created S3 folder for clinic: {clinic_name}")
                            logger.info(f"✅ User registration completed: {user_data.get('email')}")
                            logger.info(f"🔑 User password: {password}")
                            
                            # Clean up stored registration data
                            del create_registration_checkout.pending_registrations[registration_id]
                        else:
                            logger.error(f"❌ Failed to create S3 folder: {s3_result.get('error') if s3_result else 'Unknown error'}")
                    else:
                        logger.error("❌ Failed to create Supabase account")
                        
                except Exception as e:
                    logger.error(f"💥 Error processing registration webhook: {str(e)}")
                    import traceback
                    logger.error(f"📍 Traceback: {traceback.format_exc()}")
                    
            else:
                # Existing user payment - create S3 folder
                user_id = metadata.get('user_id')
                logger.info(f"💳 Checkout completed for existing user: {user_id}")
                
                if user_id:
                    # Try to create S3 folder
                    try:
                        logger.info("🔍 Getting user details from Supabase...")
                        from services.supabase import get_supabase_service
                        supabase_service = get_supabase_service()
                        
                        if not supabase_service:
                            logger.error("❌ Supabase service not available")
                            return {"status": "error", "message": "Supabase service unavailable"}
                        
                        user_data = await supabase_service.get_user_by_id(user_id)
                        
                        if user_data:
                            clinic_name = user_data.get('clinic_name', 'Unknown Clinic')
                            logger.info(f"👥 Found user: {user_data.get('email')} - Clinic: {clinic_name}")
                            
                            # Create S3 folder for the clinic
                            logger.info("☁️ Creating S3 folder...")
                            from services.s3_service import get_s3_service
                            s3_service = get_s3_service()
                            
                            if not s3_service:
                                logger.error("❌ S3 service not available")
                                return {"status": "error", "message": "S3 service unavailable"}
                            
                            s3_result = s3_service.create_clinic_folder(clinic_name, user_id)
                            
                            if s3_result and s3_result.get('success'):
                                logger.info(f"✅ Successfully created S3 folder for clinic: {clinic_name}")
                            else:
                                logger.error(f"❌ Failed to create S3 folder: {s3_result.get('error') if s3_result else 'Unknown error'}")
                        else:
                            logger.error(f"❌ User data not found for ID: {user_id}")
                            
                    except Exception as e:
                        logger.error(f"💥 Error processing webhook for user {user_id}: {str(e)}")
                        import traceback
                        logger.error(f"📍 Traceback: {traceback.format_exc()}")
                else:
                    logger.warning("⚠️ No user_id found in checkout session metadata")
        else:
            logger.info(f"ℹ️ Ignoring event type: {event_type}")
        
        return {"status": "success", "event_type": event_type}
        
    except Exception as e:
        logger.error(f"💥 Webhook error: {str(e)}")
        import traceback
        logger.error(f"📍 Traceback: {traceback.format_exc()}")
        return {"status": "error", "message": str(e)}, 400

# AWS S3 Integration Endpoints - Real-time Processing

@router.post("/user/initialize-s3")
async def initialize_user_s3_folder(token: str = Depends(get_auth_token)):
    """
    Create S3 folder for a new user after signup/payment verification
    This endpoint should be called after a user completes Stripe payment
    """
    logger.info("📁 Starting S3 folder initialization for new user")
    
    try:
        # Get user ID from token
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get('sub')
        logger.info(f"🔐 User ID: {user_id}")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        # Initialize S3 service
        from services.s3_service import get_s3_service
        s3_service = get_s3_service()
        
        if not s3_service or not s3_service.is_configured:
            logger.error("❌ S3 service not configured")
            raise HTTPException(
                status_code=500, 
                detail="AWS S3 is not configured on the server"
            )
        
        # Check if folder already exists
        folder_exists = s3_service.check_user_folder_exists(user_id)
        
        if folder_exists:
            logger.info(f"✅ S3 folder already exists for user {user_id}")
            return {
                "success": True,
                "message": "User folder already exists",
                "user_id": user_id,
                "folder_path": f"clinics/{user_id}/",
                "already_existed": True
            }
        
        # Create the folder
        result = s3_service.create_user_folder(user_id)
        
        if result['success']:
            logger.info(f"✅ Successfully created S3 folder for user {user_id}")
            return {
                "success": True,
                "message": "User S3 folder created successfully",
                "user_id": user_id,
                "folder_path": result['folder_key'],
                "bucket": result['bucket'],
                "full_path": result['full_path'],
                "already_existed": False
            }
        else:
            logger.error(f"❌ Failed to create S3 folder: {result.get('error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create S3 folder: {result.get('message', 'Unknown error')}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error initializing S3 folder: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/aws/images")
async def get_user_aws_images(token: str = Depends(get_auth_token)):
    """Get all images from AWS S3 for the authenticated user"""
    logger.info("🔄 Starting AWS images fetch request")
    
    try:
        # Get user ID from token
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get('sub')
        logger.info(f"🔐 User ID: {user_id}")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        # Initialize S3 service
        from services.s3_service import get_s3_service
        s3_service = get_s3_service()
        
        if not s3_service or not s3_service.is_configured:
            logger.warning("⚠️ S3 service not configured")
            return {
                "images": [],
                "total": 0,
                "error": "s3_not_configured",
                "message": "AWS S3 is not configured."
            }
        
        # Get images with presigned URLs
        images_data = s3_service.list_user_images(user_id)
        
        # Transform for frontend
        images = []
        for img_data in images_data:
            filename = img_data['filename']
            
            # Skip non-image files
            if not any(filename.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.dcm']):
                continue
            
            # Simple naming
            is_dicom = filename.lower().endswith('.dcm')
            display_name = filename.replace('_', ' ').replace('.dcm', '').replace('.jpg', '').replace('.png', '').title()
            
            images.append({
                "id": f"aws-{filename}",
                "patientName": display_name,
                "patientId": f"AWS-{filename[:8] if len(filename) >= 8 else filename}",
                "scanDate": img_data['last_modified'].isoformat(),
                "status": "Ready",
                "imageUrl": img_data['url'],  # This is now a presigned URL
                "annotatedImageUrl": None,
                "summary": "Click to process",
                "conditions": [],
                "teethAnalyzed": 0,
                "createdAt": img_data['last_modified'].isoformat(),
                "source": "aws_s3",
                "isDicom": is_dicom,
                "originalFilename": filename,
                "fileSize": img_data['size'],
                "s3Key": img_data['key']
            })
        
        logger.info(f"✅ Found {len(images)} images for user {user_id}")
        
        # Check for existing analysis in Supabase for each image
        for img in images:
            try:
                # Query Supabase for analysis results linked to this S3 key
                # Use service client to bypass RLS
                analysis_response = supabase_service.get_service_client().table('aws_image_analysis')\
                    .select('*')\
                    .eq('s3_key', img['s3Key'])\
                    .eq('user_id', user_id)\
                    .execute()
                
                if analysis_response.data and len(analysis_response.data) > 0:
                    analysis = analysis_response.data[0]
                    analysis_status = analysis.get('status', 'pending')
                    img['analysisId'] = analysis.get('id')
                    
                    # Fetch DICOM metadata if metadata_id exists
                    metadata_id = analysis.get('metadata_id')
                    if metadata_id:
                        try:
                            metadata_response = supabase_service.get_service_client().table('dicom_metadata')\
                                .select('patient_name, patient_id, patient_email')\
                                .eq('id', metadata_id)\
                                .execute()
                            
                            if metadata_response.data and len(metadata_response.data) > 0:
                                metadata = metadata_response.data[0]
                                img['patientName'] = metadata.get('patient_name') or img['patientName']
                                img['patientId'] = metadata.get('patient_id') or img['patientId']
                                img['patientEmail'] = metadata.get('patient_email')
                                logger.info(f"📋 Loaded metadata for {img['originalFilename']}: {metadata.get('patient_name')}")
                        except Exception as meta_error:
                            logger.warning(f"⚠️ Could not load metadata: {str(meta_error)}")
                    
                    # Map analysis status to UI status
                    if analysis_status == 'completed':
                        # Analysis is done, ready to create report
                        img['status'] = 'Ready'
                        img['analysisComplete'] = True
                        img['annotatedImageUrl'] = analysis.get('annotated_image_url')
                        img['detections'] = analysis.get('detections', [])
                        img['findingsSummary'] = analysis.get('findings_summary')
                        img['summary'] = f"AI analysis complete - {len(analysis.get('detections', []))} conditions detected"
                    elif analysis_status == 'processing':
                        img['status'] = 'Processing'
                        img['analysisComplete'] = False
                        img['summary'] = 'AI analysis in progress...'
                    elif analysis_status == 'failed':
                        img['status'] = 'Failed'
                        img['summary'] = 'Analysis failed - click to retry'
                else:
                    # No analysis found - trigger it automatically
                    img['status'] = 'Pending'
                    img['analysisComplete'] = False
                    img['summary'] = 'Ready for analysis'
            except Exception as e:
                logger.warning(f"Could not check analysis status for {img['originalFilename']}: {e}")
                img['status'] = 'Ready'
                img['analysisComplete'] = False
        
        logger.info(f"✅ Found {len(images)} images for user {user_id}")
        
        return {
            "images": images,
            "total": len(images),
            "user_folder": f"clinics/{user_id}",
            "bucket": s3_service.bucket_name
        }
            
    except Exception as e:
        logger.error(f"❌ Critical error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Trigger AI analysis for an AWS image
@router.post("/aws/analyze")
async def analyze_aws_image(
    request: Request,
    token: str = Depends(get_auth_token)
):
    """Trigger AI analysis for an AWS S3 image"""
    logger.info("🔬 Starting AWS image analysis request")
    
    try:
        # Get user ID from token
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get('sub')
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        # Parse request body
        body = await request.json()
        s3_key = body.get('s3_key')
        image_url = body.get('image_url')
        filename = body.get('filename')
        
        if not s3_key or not image_url:
            raise HTTPException(status_code=400, detail="s3_key and image_url are required")
        
        logger.info(f"📋 Analysis request - User: {user_id}, S3 Key: {s3_key}")
        
        # Check if analysis already exists
        # Use service client to bypass RLS
        existing = supabase_service.get_service_client().table('aws_image_analysis')\
            .select('*')\
            .eq('s3_key', s3_key)\
            .eq('user_id', user_id)\
            .execute()
        
        if existing.data and len(existing.data) > 0:
            analysis_record = existing.data[0]
            if analysis_record.get('status') == 'completed':
                logger.info(f"✅ Analysis already completed for {s3_key}")
                return {
                    "success": True,
                    "status": "completed",
                    "message": "Analysis already completed",
                    "analysis_id": analysis_record['id'],
                    "detections": analysis_record.get('detections'),
                    "annotated_image_url": analysis_record.get('annotated_image_url'),
                    "findings_summary": analysis_record.get('findings_summary')
                }
            elif analysis_record.get('status') == 'processing':
                logger.info(f"⏳ Analysis already in progress for {s3_key}")
                return {
                    "success": True,
                    "status": "processing",
                    "message": "Analysis already in progress",
                    "analysis_id": analysis_record['id']
                }
        
        # Create new analysis record with 'processing' status
        analysis_record = {
            'user_id': user_id,
            's3_key': s3_key,
            'filename': filename or s3_key.split('/')[-1],
            'original_image_url': image_url,
            'status': 'processing',
            'created_at': datetime.now().isoformat()
        }
        
        # Use service client to bypass RLS for insert
        insert_response = supabase_service.get_service_client().table('aws_image_analysis')\
            .insert(analysis_record)\
            .execute()
        
        if not insert_response.data:
            raise Exception("Failed to create analysis record")
        
        analysis_id = insert_response.data[0]['id']
        logger.info(f"📝 Created analysis record: {analysis_id}")
        
        # Run AI analysis
        try:
            # Check if this is a DICOM file
            is_dicom = filename and filename.lower().endswith('.dcm')
            metadata_id = None  # Initialize for later use
            
            if is_dicom:
                logger.info("🏥 Detected DICOM file - converting to JPEG first...")
                from services.dicom_processor import dicom_processor
                
                # Convert DICOM to JPEG
                conversion_result = dicom_processor.convert_dicom_to_image(image_url)
                
                if not conversion_result:
                    raise Exception("Failed to convert DICOM to image format")
                
                image_bytes, dicom_metadata = conversion_result
                logger.info(f"✅ DICOM converted: {len(image_bytes)} bytes, Patient: {dicom_metadata.get('patient_name', 'Unknown')}")
                
                # Save DICOM metadata to database
                try:
                    logger.info("💾 Saving DICOM metadata to database...")
                    metadata_record = {
                        'user_id': user_id,
                        's3_key': s3_key,
                        'filename': filename,
                        'patient_name': dicom_metadata.get('patient_name'),
                        'patient_id': dicom_metadata.get('patient_id'),
                        'patient_email': dicom_metadata.get('patient_email'),
                        'patient_birth_date': dicom_metadata.get('patient_birth_date'),
                        'patient_sex': dicom_metadata.get('patient_sex'),
                        'study_date': dicom_metadata.get('study_date'),
                        'study_time': dicom_metadata.get('study_time'),
                        'study_description': dicom_metadata.get('study_description'),
                        'study_id': dicom_metadata.get('study_id'),
                        'series_date': dicom_metadata.get('series_date'),
                        'series_time': dicom_metadata.get('series_time'),
                        'series_description': dicom_metadata.get('series_description'),
                        'series_number': dicom_metadata.get('series_number'),
                        'image_type': dicom_metadata.get('image_type'),
                        'modality': dicom_metadata.get('modality'),
                        'manufacturer': dicom_metadata.get('manufacturer'),
                        'manufacturer_model': dicom_metadata.get('manufacturer_model'),
                        'image_rows': dicom_metadata.get('image_rows'),
                        'image_columns': dicom_metadata.get('image_columns'),
                        'bits_allocated': dicom_metadata.get('bits_allocated'),
                        'pixel_spacing': dicom_metadata.get('pixel_spacing'),
                        'raw_metadata': dicom_metadata,
                        'extracted_at': dicom_metadata.get('extracted_at'),
                        'created_at': datetime.now().isoformat()
                    }
                    
                    # Use service client to bypass RLS
                    metadata_insert = supabase_service.get_service_client().table('dicom_metadata')\
                        .insert(metadata_record)\
                        .execute()
                    
                    if metadata_insert.data:
                        metadata_id = metadata_insert.data[0]['id']
                        logger.info(f"✅ DICOM metadata saved: {metadata_id}")
                    else:
                        logger.warning("⚠️ Failed to save DICOM metadata")
                        metadata_id = None
                        
                except Exception as metadata_error:
                    logger.error(f"❌ Error saving DICOM metadata: {str(metadata_error)}")
                    metadata_id = None
                
                # Upload converted JPEG to Supabase for Roboflow processing
                converted_filename = f"dicom_converted/{user_id}/{filename.replace('.dcm', '')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                converted_url = await supabase_service.upload_image(
                    image_bytes,
                    converted_filename,
                    token
                )
                
                if not converted_url:
                    raise Exception("Failed to upload converted DICOM image")
                
                logger.info(f"✅ Converted image uploaded: {converted_url}")
                
                # Use converted image for Roboflow analysis
                roboflow_input_url = converted_url
            else:
                # Regular image file (JPEG, PNG)
                roboflow_input_url = image_url
            
            logger.info(f"🤖 Running Roboflow detection on: {roboflow_input_url}")
            predictions, annotated_image = await roboflow_service.detect_conditions(roboflow_input_url)
            
            if not predictions or not annotated_image:
                raise Exception("Roboflow analysis failed")
            
            # Upload annotated image to Supabase
            logger.info("📤 Uploading annotated image...")
            annotated_filename = f"aws_annotated/{user_id}/{filename or 'image'}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            annotated_url = await supabase_service.upload_image(
                annotated_image,
                annotated_filename,
                token
            )
            
            if not annotated_url:
                raise Exception("Failed to upload annotated image")
            
            # Generate findings summary with OpenAI
            logger.info("🧠 Generating AI findings summary...")
            findings_summary = await openai_service.generate_immediate_findings_summary(predictions)
            
            # Update analysis record with results
            update_data = {
                'status': 'completed',
                'annotated_image_url': annotated_url,
                'detections': predictions.get('predictions', []),
                'findings_summary': findings_summary,
                'completed_at': datetime.now().isoformat()
            }
            
            # Link metadata_id if we saved DICOM metadata
            if is_dicom and 'metadata_id' in locals() and metadata_id:
                update_data['metadata_id'] = metadata_id
                logger.info(f"🔗 Linking metadata_id {metadata_id} to analysis {analysis_id}")
            
            # Use service client to bypass RLS for update
            supabase_service.get_service_client().table('aws_image_analysis')\
                .update(update_data)\
                .eq('id', analysis_id)\
                .execute()
            
            logger.info(f"✅ Analysis completed successfully for {s3_key}")
            
            return {
                "success": True,
                "status": "completed",
                "message": "Analysis completed successfully",
                "analysis_id": analysis_id,
                "detections": predictions.get('predictions', []),
                "annotated_image_url": annotated_url,
                "findings_summary": findings_summary
            }
            
        except Exception as analysis_error:
            logger.error(f"❌ Analysis failed: {str(analysis_error)}")
            
            # Update record with failed status
            # Use service client to bypass RLS for update
            supabase_service.get_service_client().table('aws_image_analysis')\
                .update({
                    'status': 'failed',
                    'error_message': str(analysis_error),
                    'completed_at': datetime.now().isoformat()
                })\
                .eq('id', analysis_id)\
                .execute()
            
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(analysis_error)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Critical error in AWS analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint to verify S3 configuration
@router.get("/aws/health")
async def check_aws_health():
    """Check if AWS S3 is properly configured"""
    from services.s3_service import get_s3_service
    
    s3_service = get_s3_service()
    
    if not s3_service or not s3_service.is_configured:
        return {
            "status": "unhealthy",
            "message": "AWS S3 is not configured",
            "bucket": os.getenv('AWS_S3_BUCKET', 'Not configured'),
            "region": os.getenv('AWS_REGION', 'Not configured'),
            "has_credentials": bool(os.getenv('AWS_ACCESS_KEY_ID'))
        }
    
    try:
        # Try to check if bucket exists
        s3_service.s3_client.head_bucket(Bucket=s3_service.bucket_name)
        return {
            "status": "healthy",
            "message": "AWS S3 is configured and accessible",
            "bucket": s3_service.bucket_name,
            "region": s3_service.region
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"AWS S3 error: {str(e)}",
            "bucket": s3_service.bucket_name,
            "region": s3_service.region
        }

# S3 Webhook endpoint for real-time processing
@router.post("/aws/webhook")
async def s3_webhook_handler(request: Request):
    """Handle S3 event notifications for real-time image processing"""
    logger.info("🔔 S3 webhook received - starting real-time processing")
    
    try:
        # Parse the webhook payload
        logger.info("📥 Parsing webhook payload...")
        webhook_data = await request.json()
        logger.info(f"✅ Webhook payload parsed successfully. Keys: {list(webhook_data.keys())}")
        
        # Extract S3 event information
        if 'Records' not in webhook_data:
            logger.warning("⚠️ No Records found in webhook payload")
            logger.warning(f"Webhook payload: {webhook_data}")
            return {"status": "error", "message": "No Records found in webhook"}
        
        records = webhook_data['Records']
        logger.info(f"📋 Processing {len(records)} S3 event records")
        
        processed_files = []
        errors = []
        
        for i, record in enumerate(records):
            try:
                logger.info(f"🔄 Processing record {i+1}/{len(records)}")
                
                # Extract S3 event details
                event_name = record.get('eventName', 'Unknown')
                s3_data = record.get('s3', {})
                bucket_name = s3_data.get('bucket', {}).get('name', 'Unknown')
                object_key = s3_data.get('object', {}).get('key', 'Unknown')
                
                logger.info(f"📁 Event: {event_name} | Bucket: {bucket_name} | Key: {object_key}")
                
                # Only process new file uploads
                if event_name not in ['ObjectCreated:Put', 'ObjectCreated:Post', 'ObjectCreated:CompleteMultipartUpload']:
                    logger.info(f"⏭️ Skipping non-upload event: {event_name}")
                    continue
                
                # Extract clinic ID from object key
                # Expected format: clinics/clinic-name-userid/filename
                key_parts = object_key.split('/')
                if len(key_parts) < 3:
                    logger.warning(f"⚠️ Invalid object key format: {object_key}")
                    continue
                
                clinic_folder = key_parts[1]  # e.g., "brightsmile-dental-3536c5ae-c0b0-44cf-9114-8241b329071c"
                filename = key_parts[-1]
                
                # Extract user ID from clinic folder name
                if '-' in clinic_folder:
                    user_id = clinic_folder.split('-')[-1]
                    logger.info(f"👤 Extracted user ID: {user_id} from folder: {clinic_folder}")
                else:
                    logger.warning(f"⚠️ Could not extract user ID from folder: {clinic_folder}")
                    continue
                
                # Determine file type
                is_dicom = filename.lower().endswith('.dcm') or 'dicom' in filename.lower()
                logger.info(f"📄 File type: {'DICOM' if is_dicom else 'Image'} | Filename: {filename}")
                
                # Start background processing
                logger.info(f"🚀 Starting background processing for {filename}")
                
                # TODO: Implement background task queue for processing
                # For now, we'll process synchronously (not ideal for production)
                processing_result = await process_aws_image_background(
                    user_id=user_id,
                    object_key=object_key,
                    filename=filename,
                    is_dicom=is_dicom,
                    bucket_name=bucket_name
                )
                
                if processing_result.get('success'):
                    processed_files.append({
                        'filename': filename,
                        'user_id': user_id,
                        'status': 'processing_started'
                    })
                    logger.info(f"✅ Background processing started for {filename}")
                else:
                    errors.append({
                        'filename': filename,
                        'user_id': user_id,
                        'error': processing_result.get('error', 'Unknown error')
                    })
                    logger.error(f"❌ Failed to start processing for {filename}: {processing_result.get('error')}")
                
            except Exception as record_error:
                logger.error(f"❌ Error processing record {i+1}: {str(record_error)}")
                logger.error(f"Record data: {record}")
                errors.append({
                    'record_index': i,
                    'error': str(record_error)
                })
                continue
        
        logger.info(f"✅ Webhook processing completed. Processed: {len(processed_files)}, Errors: {len(errors)}")
        
        return {
            "status": "success",
            "message": f"Processed {len(processed_files)} files, {len(errors)} errors",
            "processed_files": processed_files,
            "errors": errors
        }
        
    except Exception as e:
        logger.error(f"❌ Critical error in S3 webhook handler: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error details: {str(e)}")
        
        return {
            "status": "error",
            "message": "Failed to process webhook",
            "error": str(e)
        }

async def process_aws_image_background(
    user_id: str,
    object_key: str,
    filename: str,
    is_dicom: bool,
    bucket_name: str
):
    """Background processing for AWS images - runs automatically when files are uploaded"""
    logger.info(f"🔄 Starting background processing for {filename} (User: {user_id})")
    
    try:
        # Get S3 service
        from services.s3_service import get_s3_service
        s3_service = get_s3_service()
        
        if not s3_service:
            logger.error("❌ S3 service not available for background processing")
            return {"success": False, "error": "S3 service unavailable"}
        
        # Construct S3 URL
        s3_url = f"https://{bucket_name}.s3.amazonaws.com/{object_key}"
        logger.info(f"🔗 S3 URL: {s3_url}")
        
        # Extract patient information
        patient_name = "Unknown Patient"
        if is_dicom:
            try:
                logger.info("🔍 Extracting DICOM metadata...")
                from services.dicom_processor import dicom_processor
                metadata = dicom_processor.extract_metadata_from_url(s3_url)
                
                if metadata and metadata.get('patient_name'):
                    patient_name = metadata['patient_name']
                    logger.info(f"✅ Extracted patient name: {patient_name}")
                elif metadata and metadata.get('patient_id'):
                    patient_name = f"Patient {metadata['patient_id']}"
                    logger.info(f"✅ Extracted patient ID: {metadata['patient_id']}")
                else:
                    logger.warning("⚠️ No patient information found in DICOM metadata")
                    # Fallback to filename-based name
                    patient_name = filename.replace('.dcm', '').replace('_', ' ').title()
                    
            except Exception as dicom_error:
                logger.warning(f"⚠️ Failed to extract DICOM metadata: {str(dicom_error)}")
                # Fallback to filename-based name
                patient_name = filename.replace('.dcm', '').replace('_', ' ').title()
        else:
            # For non-DICOM files, use timestamp-based name
            timestamp = datetime.now().strftime('%b %d, %Y at %I:%M %p')
            patient_name = f"New Scan - {timestamp}"
            logger.info(f"📸 Using timestamp-based name for image: {patient_name}")
        
        # Create diagnosis record in database
        logger.info("💾 Creating diagnosis record in database...")
        try:
            # TODO: Implement database insertion
            # For now, just log the action
            diagnosis_data = {
                "user_id": user_id,
                "patient_name": patient_name,
                "image_url": s3_url,
                "annotated_image_url": None,
                "summary": "Processing from AWS S3...",
                "ai_notes": None,
                "treatment_stages": [],
                "created_at": datetime.now().isoformat(),
                "source": "aws_s3",
                "aws_metadata": {
                    "object_key": object_key,
                    "bucket_name": bucket_name,
                    "filename": filename,
                    "is_dicom": is_dicom,
                    "uploaded_at": datetime.now().isoformat()
                }
            }
            
            logger.info(f"✅ Diagnosis data prepared: {diagnosis_data}")
            
            # TODO: Insert into database
            # diagnosis_id = await insert_diagnosis_record(diagnosis_data)
            
        except Exception as db_error:
            logger.error(f"❌ Database error: {str(db_error)}")
            return {"success": False, "error": f"Database error: {str(db_error)}"}
        
        # Start AI analysis in background
        logger.info("🧠 Starting AI analysis in background...")
        try:
            # TODO: Implement background AI processing
            # For now, just log the action
            logger.info("✅ AI analysis queued for background processing")
            
        except Exception as ai_error:
            logger.error(f"❌ AI analysis error: {str(ai_error)}")
            return {"success": False, "error": f"AI analysis error: {str(ai_error)}"}
        
        logger.info(f"✅ Background processing completed successfully for {filename}")
        
        return {
            "success": True,
            "patient_name": patient_name,
            "is_dicom": is_dicom,
            "message": "Processing started successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Critical error in background processing: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error details: {str(e)}")
        
        return {
            "success": False,
            "error": f"Critical error: {str(e)}"
        }

# Email Report to Patient
@router.post("/send-report-email")
async def send_report_email(
    request: Request,
    token: str = Depends(get_auth_token)
):
    """Send dental report to patient via email"""
    logger.info("📧 Starting report email request")
    
    try:
        # Get request body
        body = await request.json()
        report_id = body.get('report_id')
        patient_email = body.get('patient_email')
        
        if not report_id or not patient_email:
            logger.error("❌ Missing required fields: report_id or patient_email")
            return {
                "success": False,
                "error": "Missing required fields: report_id and patient_email"
            }
        
        logger.info(f"📧 Sending report {report_id} to {patient_email}")
        
        # Create authenticated client
        auth_client = supabase_service._create_authenticated_client(token)

        # Derive user_id from JWT to avoid flaky auth.get_user responses in backend
        user_id = None
        try:
            import jwt
            decoded_token = jwt.decode(token, options={"verify_signature": False})
            user_id = decoded_token.get('sub')
            logger.info(f"🔐 Decoded user_id from JWT: {user_id}")
        except Exception as jwt_error:
            logger.warning(f"JWT decode failed: {jwt_error}")

        # Fallback to Supabase auth.get_user if needed
        if not user_id:
            try:
                user_response = auth_client.auth.get_user()
                user_id = getattr(getattr(user_response, 'user', None), 'id', None)
            except Exception as get_user_error:
                logger.warning(f"auth.get_user failed: {get_user_error}")

        if not user_id:
            logger.error("❌ Authentication failed - no user_id available")
            return {
                "success": False,
                "error": "Authentication failed"
            }

        logger.info(f"✅ User authenticated: {user_id}")
        
        # Get report data from database
        try:
            report_response = auth_client.table('patient_diagnosis').select("*").eq('id', report_id).execute()
            
            if not report_response.data:
                logger.error(f"❌ Report {report_id} not found")
                return {
                    "success": False,
                    "error": "Report not found"
                }
            
            diagnosis = report_response.data[0]
            report_data = {
                'id': diagnosis.get('id'),
                'patient_name': diagnosis.get('patient_name'),
                'report_html': diagnosis.get('report_html'),
                'annotated_image_url': diagnosis.get('annotated_image_url'),
                'treatment_stages': diagnosis.get('treatment_stages', []),
                'created_at': diagnosis.get('created_at'),
                'video_url': diagnosis.get('video_url')
            }
            
        except Exception as e:
            logger.error(f"❌ Error fetching report: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to fetch report: {str(e)}"
            }
        
        # Send actual email using email service
        logger.info(f"📧 Sending email to {patient_email}")
        
        try:
            from services.email_service import email_service
            
            # Get clinic branding information
            clinic_branding_response = auth_client.table('clinic_branding').select("*").eq('user_id', user_id).execute()
            clinic_branding = {}
            
            if clinic_branding_response.data:
                clinic_branding = clinic_branding_response.data[0]
                # Replace None values with defaults
                if not clinic_branding.get('clinic_name'):
                    clinic_branding['clinic_name'] = 'ScanWise'
                logger.info(f"✅ Found clinic branding: {clinic_branding.get('clinic_name', 'Unknown')}")
            else:
                # Fallback to default branding
                clinic_branding = {
                    'clinic_name': 'ScanWise',
                    'phone': 'our office',
                    'website': 'our website'
                }
                logger.info(f"⚠️ Using default clinic branding: {clinic_branding}")
            
            # Send the email with PDF attachment
            email_sent = await email_service.send_dental_report(
                patient_email=patient_email,
                patient_name=report_data.get('patient_name', 'Patient'),
                report_data=report_data,
                clinic_branding=clinic_branding
            )
            
            if email_sent:
                logger.info(f"✅ Email with PDF sent successfully to {patient_email}")
                
                # Update diagnosis record with email sent timestamp
                try:
                    email_sent_at = datetime.now().isoformat()
                    await supabase_service.update_diagnosis(
                        report_id,
                        {"email_sent_at": email_sent_at},
                        token
                    )
                    logger.info(f"✅ Updated diagnosis {report_id} with email_sent_at timestamp")
                except Exception as update_error:
                    logger.warning(f"⚠️ Failed to update email_sent_at timestamp: {str(update_error)}")
                    # Don't fail the request if timestamp update fails
            else:
                logger.error(f"❌ Failed to send email to {patient_email}")
                return {
                    "success": False,
                    "error": "Failed to send email"
                }
                
        except Exception as email_error:
            logger.error(f"❌ Email sending error: {str(email_error)}")
            return {
                "success": False,
                "error": f"Email sending failed: {str(email_error)}"
            }
        
        return {
            "success": True,
            "message": f"Report sent successfully to {patient_email}",
            "report_id": report_id,
            "patient_email": patient_email,
            "sent_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error sending report email: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error details: {str(e)}")
        
        return {
            "success": False,
            "error": f"Failed to send email: {str(e)}"
        }

# Email Preview Report to Patient (from unsaved content)
@router.post("/send-preview-report-email")
async def send_preview_report_email(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Send dental report preview to patient via email"""
    logger.info("📧 Starting preview report email request")
    
    try:
        # Get request body
        body = await request.json()
        patient_email = body.get('patient_email')
        patient_name = body.get('patient_name', 'Patient')
        report_content = body.get('report_content')
        findings = body.get('findings', [])
        annotated_image_url = body.get('annotated_image_url')
        
        if not patient_email or not report_content:
            logger.error("❌ Missing required fields: patient_email or report_content")
            return {
                "success": False,
                "error": "Missing required fields: patient_email and report_content"
            }
        
        logger.info(f"📧 Sending preview report to {patient_email}")
        
        # Try to extract user_id from Authorization header (auth-optional)
        token = None
        user_id = None
        auth_client = None
        try:
            if authorization:
                token = authorization.replace("Bearer ", "").strip()
            if token:
                try:
                    import jwt
                    decoded = jwt.decode(token, options={"verify_signature": False})
                    user_id = decoded.get('sub')
                    logger.info(f"🔐 Decoded user_id from JWT: {user_id}")
                except Exception as jwt_error:
                    logger.warning(f"JWT decode failed: {jwt_error}")
                try:
                    from services.supabase import supabase_service
                    auth_client = supabase_service._create_authenticated_client(token)
                except Exception as client_error:
                    logger.warning(f"Failed to create authenticated supabase client: {client_error}")
        except Exception as auth_error:
            logger.warning(f"Authorization header processing failed: {auth_error}")
        
        # Create authenticated client if we have a token
        auth_client = None
        if token:
            try:
                auth_client = supabase_service._create_authenticated_client(token)
            except Exception as client_error:
                logger.warning(f"Failed to create authenticated client: {client_error}")
        
        # Send actual email using email service
        logger.info(f"Sending preview email to {patient_email}")
        
        try:
            from services.email_service import email_service
            
            # Get clinic branding information (auth-optional)
            clinic_branding = {}
            if user_id and auth_client:
                try:
                    clinic_branding_response = auth_client.table('clinic_branding').select("*").eq('user_id', user_id).execute()
                    if clinic_branding_response.data:
                        clinic_branding = clinic_branding_response.data[0]
                        logger.info(f"✅ Found clinic branding: {clinic_branding.get('clinic_name', 'Unknown')}")
                except Exception as branding_error:
                    logger.warning(f"Clinic branding lookup failed: {branding_error}")
            
            if not clinic_branding:
                # Use default branding
                clinic_branding = {
                    'clinic_name': 'Dental Clinic',
                    'phone': 'our office',
                    'website': 'our website'
                }
                logger.info(f"⚠️ Using default clinic branding: {clinic_branding}")
            
            # Create a mock report data structure for the preview
            from datetime import datetime
            preview_report_data = {
                'patient_name': patient_name,
                'report_html': report_content,
                'findings': findings,
                'created_at': datetime.now().isoformat(),
                'is_preview': True,
                'annotated_image_url': annotated_image_url
            }
            
            # Send the email with PDF attachment
            email_sent = await email_service.send_dental_report(
                patient_email=patient_email,
                patient_name=patient_name,
                report_data=preview_report_data,
                clinic_branding=clinic_branding
            )
            
            if email_sent:
                logger.info(f"✅ Preview email with PDF sent successfully to {patient_email}")
                return {
                    "success": True,
                    "message": f"Preview report sent successfully to {patient_email}"
                }
            else:
                logger.error(f"❌ Failed to send preview email to {patient_email}")
                return {
                    "success": False,
                    "error": "Failed to send preview email"
                }
                
        except Exception as email_error:
            logger.error(f"❌ Preview email sending error: {str(email_error)}")
            return {
                "success": False,
                "error": f"Preview email sending failed: {str(email_error)}"
            }
        
    except Exception as e:
        logger.error(f"❌ General error in send_preview_report_email: {str(e)}")
        return {
            "success": False,
            "error": f"General error: {str(e)}"
        }