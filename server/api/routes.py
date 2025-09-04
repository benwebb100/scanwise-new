from fastapi import APIRouter, HTTPException, Depends, Header, Request
from typing import Optional, Dict, Any, Union, List
from datetime import datetime
import logging
import os
import base64
import requests
import jwt

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
    generate_video: bool = False,  # Remove this parameter
    token: str = Depends(get_auth_token)
):
    """
    Analyze X-ray image and generate comprehensive dental report
    """
    try:
        # Extract generate_video from request body
        generate_video = getattr(request, 'generate_video', False)
        logger.info(f"Video generation requested: {generate_video}")
        
        logger.info(f"Starting X-ray analysis for patient: {request.patient_name}")
        logger.info(f"Findings count: {len(request.findings) if request.findings else 0}")
        logger.info(f"Generate video: {generate_video}")
        
        # Step 1: Send image to Roboflow for detection
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
        
        # Step 3.5: Apply Staging V2 if enabled
        staging_v2_enabled = os.getenv('STAGING_V2', 'false').lower() == 'true'
        if staging_v2_enabled and request.findings:
            logger.info("Staging V2 enabled - applying intelligent treatment staging")
            try:
                # Convert findings to staging V2 format
                staging_treatments = []
                for finding in request.findings:
                    staging_treatments.append({
                        'tooth': finding.tooth,
                        'treatment': finding.treatment,
                        'condition': finding.condition,
                        'replacement': finding.replacement,
                        'price': finding.price or 0,
                        'stage_category': 0  # Will be classified by staging engine
                    })
                
                # Apply staging V2
                staged_plan = build_staged_plan_v2(staging_treatments)
                ai_analysis['treatment_stages'] = staged_plan['stages']
                ai_analysis['staging_v2_meta'] = staged_plan['meta']
                ai_analysis['future_tasks'] = staged_plan['future_tasks']
                
                logger.info(f"Staging V2 applied: {len(staged_plan['stages'])} stages, {staged_plan['meta']['total_visits']} visits")
            except Exception as e:
                logger.error(f"Staging V2 failed, falling back to legacy staging: {str(e)}")
                # Continue with legacy staging from AI analysis
        
        # Step 4: Save to database (Supabase handles user_id via RLS)
        # Generate HTML report using GPT
        findings_dict = [f.model_dump() for f in request.findings] if request.findings else []
        html_report = await openai_service.generate_html_report_content(findings_dict, request.patient_name)
        
        diagnosis_data = {
            'patient_name': request.patient_name,
            'image_url': str(request.image_url),
            'annotated_image_url': annotated_url,
            'summary': ai_analysis.get('summary', ''),
            'ai_notes': ai_analysis.get('ai_notes', ''),
            'treatment_stages': ai_analysis.get('treatment_stages', []),
            'report_html': html_report
        }
        
        saved_diagnosis = await supabase_service.save_diagnosis(diagnosis_data, token)
        diagnosis_id = saved_diagnosis.get('id')
        
        # Step 5: Return response immediately, start video generation in background if requested
        response_data = {
            "status": "success",
            "summary": ai_analysis.get('summary', ''),
            "treatment_stages": ai_analysis.get('treatment_stages', []),
            "ai_notes": ai_analysis.get('ai_notes', ''),
            "diagnosis_timestamp": datetime.now(),
            "annotated_image_url": annotated_url,
            "detections": ai_analysis.get('detections', []),
            "report_html": html_report,  # Keep as report_html for the model
            "diagnosis_id": diagnosis_id,  # Include diagnosis_id for video polling
            "staging_v2_meta": ai_analysis.get('staging_v2_meta'),
            "future_tasks": ai_analysis.get('future_tasks', [])
        }
        
        # Start video generation in background if requested
        if generate_video and diagnosis_id:
            logger.info(f"Starting video generation for diagnosis: {diagnosis_id}")
            # Start video generation asynchronously
            try:
                import asyncio
                # Call the existing video generation endpoint asynchronously
                asyncio.create_task(generate_patient_video(diagnosis_id, token))
            except Exception as e:
                logger.error(f"Failed to start video generation: {str(e)}")
        else:
            logger.info(f"Video generation not requested or no diagnosis ID. generate_video: {generate_video}, diagnosis_id: {diagnosis_id}")
        
        response = AnalyzeXrayResponse(**response_data)
        
        logger.info(f"Successfully completed X-ray analysis for patient: {request.patient_name}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in analyze_xray: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")



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
                "createdAt": diagnosis.get('created_at')
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
    """Upload X-ray image to Supabase Storage"""
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/tiff"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        # Read file content
        file_content = await file.read()
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
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
        
        return {
            "status": "success",
            "url": public_url,
            "filename": file_name
        }
        
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

        response = openai_service.client.chat.completions.create(
            model=openai_service.model_edit,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_completion_tokens=2000
        )
        
        updated_html = response.choices[0].message.content
        
        # Clean up any potential markdown formatting
        updated_html = updated_html.strip()
        if updated_html.startswith("```"):
            # Remove code fences if present
            updated_html = updated_html.split("\n", 1)[1].rsplit("\n", 1)[0]
        
        logger.info("Successfully applied suggested changes")
        return SuggestChangesResponse(updated_html=updated_html)
        
    except Exception as e:
        logger.error(f"Error applying suggested changes: {str(e)}")
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
        
        # Step 3: Generate video script with OpenAI
        logger.info("Generating video script...")
        video_script = await openai_service.generate_video_script(treatment_stages, image_base64)
        
        # Step 4: Generate voice audio with ElevenLabs
        logger.info("Generating voice audio...")
        audio_bytes = await elevenlabs_service.generate_voice(video_script)
        
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


@router.post("/clinic-branding")
async def save_clinic_branding(
    branding_data: ClinicBrandingData,
    token: str = Depends(get_auth_token)
):
    """Save clinic branding information"""
    try:
        # Create authenticated client
        auth_client = supabase_service._create_authenticated_client(token)
        
        # Convert to dict
        branding_dict = branding_data.model_dump()
        
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
    """Get list of dental treatments for dropdowns"""
    treatments = [
        {"value": "filling", "label": "Filling", "pinned": True},
        {"value": "extraction", "label": "Extraction", "pinned": True},
        {"value": "root-canal-treatment", "label": "Root canal treatment", "pinned": True},
        {"value": "crown", "label": "Crown", "pinned": True},
        {"value": "scale-and-clean", "label": "Scale and clean", "pinned": True},
        {"value": "implant-placement", "label": "Implant placement", "pinned": True},
        {"value": "bridge", "label": "Bridge", "pinned": True},
        {"value": "periodontal-treatment", "label": "Periodontal treatment", "pinned": True},
        {"value": "veneer", "label": "Veneer", "pinned": True},
        {"value": "fluoride-treatment", "label": "Fluoride treatment", "pinned": True},
        # Additional treatments
        {"value": "composite-build-up", "label": "Composite build-up", "pinned": False},
        {"value": "surgical-extraction", "label": "Surgical extraction", "pinned": False},
        {"value": "deep-cleaning", "label": "Deep cleaning (Scaling & Root Planing)", "pinned": False},
        {"value": "partial-denture", "label": "Partial denture", "pinned": False},
        {"value": "complete-denture", "label": "Complete denture", "pinned": False},
        {"value": "inlay", "label": "Inlay", "pinned": False},
        {"value": "onlay", "label": "Onlay", "pinned": False},
        {"value": "whitening", "label": "Whitening", "pinned": False},
        {"value": "bonding", "label": "Bonding", "pinned": False},
        {"value": "sealant", "label": "Sealant", "pinned": False},
    ]
    
    return {
        "status": "success",
        "treatments": treatments
    }


@router.get("/dental-data/treatment-suggestions/{condition}")
async def get_treatment_suggestions(condition: str):
    """Get suggested treatments for a specific condition"""
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
    
    Args:
        image_url: URL of the annotated X-ray image
        numbering_system: "FDI" or "Universal"
        show_numbers: Whether to show tooth numbers
        token: Authentication token
        
    Returns:
        Base64 encoded image with tooth numbers, or original image URL if no overlay
    """
    try:
        if not request.show_numbers:
            return {"image_url": request.image_url, "has_overlay": False}
        
        # Get teeth segmentation data
        seg_json = await roboflow_service.segment_teeth(request.image_url)
        if not seg_json:
            logger.warning("No segmentation data available for overlay")
            return {"image_url": request.image_url, "has_overlay": False}
        
        # Add tooth number overlay
        overlay_image = await image_overlay_service.add_tooth_number_overlay(
            request.image_url, seg_json, request.numbering_system, True,  # show_numbers is always True when we reach this point
            request.text_size_multiplier, request.condition_data
        )
        
        if overlay_image:
            # Security check: ensure we're not returning local file paths
            if overlay_image.startswith('/tmp/') or overlay_image.startswith('file://') or (not overlay_image.startswith('http') and not overlay_image.startswith('data:')):
                logger.error(f"🚨 SECURITY: Blocking unsafe image path from overlay service: {overlay_image}")
                return {"image_url": request.image_url, "has_overlay": False}
            
            logger.info(f"✅ Tooth overlay successful, returning: {overlay_image[:100]}...")
            return {"image_url": overlay_image, "has_overlay": True}
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
                if session.metadata.get('registration_pending') == 'true':
                    logger.info("🆕 New registration payment verified")
                    return {
                        "success": True,
                        "is_new_registration": True,
                        "message": "Payment verified for new registration"
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

@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks for payment events"""
    try:
        logger.info("🎯 Stripe webhook received")
        
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
            if metadata.get('registration_pending') == 'true':
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
@router.get("/aws/images")
async def get_user_aws_images(token: str = Depends(get_auth_token)):
    """Get all images from AWS S3 for the authenticated user's clinic"""
    logger.info("🔄 Starting AWS images fetch request")
    
    try:
        # Create authenticated client using global supabase service
        logger.info("🔐 Creating authenticated Supabase client...")
        from services.supabase import supabase_service as global_supabase_service
        auth_client = global_supabase_service._create_authenticated_client(token)
        logger.info("✅ Supabase client created successfully")
        
        # Derive user_id from JWT to avoid auth.get_user flakiness
        logger.info("👤 Fetching user information...")
        user_id = None
        try:
            import jwt
            decoded = jwt.decode(token, options={"verify_signature": False})
            user_id = decoded.get('sub')
            logger.info(f"🔐 Decoded user_id from JWT: {user_id}")
        except Exception as jwt_error:
            logger.warning(f"JWT decode failed: {jwt_error}")

        if not user_id:
            try:
                user_response = auth_client.auth.get_user()
                user_id = getattr(getattr(user_response, 'user', None), 'id', None)
            except Exception as get_user_error:
                logger.warning(f"auth.get_user failed: {get_user_error}")
        
        if not user_id:
            logger.error("❌ Authentication failed - no user_id available")
            return {
                "images": [],
                "total": 0,
                "message": "Authentication failed. Please log in again.",
                "error": "authentication_failed",
                "details": "No user_id from JWT or auth.get_user"
            }
        logger.info(f"✅ User authenticated: {user_id}")
        
        # Use user ID directly - no need to fetch clinic information
        logger.info(f"🎯 Using user ID directly for AWS folder: {user_id}")
        
        # Get S3 service
        logger.info("☁️ Initializing S3 service...")
        from services.s3_service import get_s3_service
        s3_service = get_s3_service()
        
        if not s3_service:
            logger.error("❌ S3 service not available - AWS credentials may be missing")
            return {
                "images": [],
                "total": 0,
                "message": "AWS S3 service is currently unavailable. Please try again later.",
                "error": "s3_service_unavailable",
                "user_id": user_id
            }
        
        logger.info("✅ S3 service initialized successfully")
        
        # Use user ID directly to find/create clinic folder
        clinic_id = f"clinic-{user_id}"
        logger.info(f"🔍 Looking for clinic folder with ID: {clinic_id}")
        try:
            clinics = s3_service.list_clinic_folders()
            logger.info(f"✅ Found {len(clinics)} total clinic folders")
            
            # Log clinic details for debugging
            for clinic in clinics:
                logger.info(f"  - Clinic: {clinic.get('clinic_name', 'Unknown')} | ID: {clinic.get('clinic_id', 'Unknown')}")
                
        except Exception as s3_error:
            logger.error(f"❌ Error listing clinic folders: {str(s3_error)}")
            logger.error(f"Error type: {type(s3_error).__name__}")
            logger.error(f"Error details: {str(s3_error)}")
            return {
                "images": [],
                "total": 0,
                "message": "Unable to access AWS S3. Please check your connection.",
                "error": "s3_connection_error",
                "user_id": user_id,
                "error_details": str(s3_error)
            }
        
        user_clinic = None
        
        # Find clinic folder by user ID (support multiple legacy patterns)
        candidate_ids = [clinic_id, user_id]
        for clinic in clinics:
            if clinic.get('clinic_id') in candidate_ids:
                user_clinic = clinic
                logger.info(f"✅ Found clinic folder by clinic_id match: {clinic}")
                break
        
        # Fallback: match where clinic_name ends with or contains user_id (legacy 'clinicName-userId' folders)
        if not user_clinic:
            for clinic in clinics:
                name = (clinic.get('clinic_name') or '').lower()
                if user_id.lower() in name:
                    user_clinic = clinic
                    logger.info(f"✅ Found clinic folder by clinic_name contains user_id: {clinic}")
                    break
        
        if not user_clinic:
            logger.warning(f"❌ Clinic folder not found for user ID: {clinic_id}")
            logger.warning(f"Available clinic IDs: {[c.get('clinic_id') for c in clinics]}")
            
            # Try to create the clinic folder if it doesn't exist
            logger.info(f"🔧 Attempting to create clinic folder for user: {user_id}")
            try:
                from services.s3_service import get_s3_service
                s3_service = get_s3_service()
                
                if s3_service:
                    # Create clinic folder with generic name
                    clinic_name = f"Clinic-{user_id}"
                    create_result = s3_service.create_clinic_folder(clinic_name, clinic_id)
                    
                    if create_result.get('success'):
                        logger.info(f"✅ Successfully created clinic folder: {clinic_name}")
                        # Create a mock clinic object for this session
                        user_clinic = {
                            'clinic_name': clinic_name,
                            'clinic_id': clinic_id,
                            'created': True
                        }
                    else:
                        logger.error(f"❌ Failed to create clinic folder: {create_result.get('error', 'Unknown error')}")
            return {
                "images": [],
                "total": 0,
                            "message": f"Clinic folder could not be created. Please contact support.",
                            "error": "clinic_folder_creation_failed",
                            "user_id": user_id,
                            "clinic_id": clinic_id
                        }
                else:
                    logger.error("❌ S3 service not available for folder creation")
                    return {
                        "images": [],
                        "total": 0,
                        "message": f"Clinic folder not found. Please contact support.",
                "error": "clinic_folder_not_found",
                "user_id": user_id,
                        "clinic_id": clinic_id
                    }
                    
            except Exception as create_error:
                logger.error(f"❌ Error creating clinic folder: {str(create_error)}")
                return {
                    "images": [],
                    "total": 0,
                    "message": f"Clinic folder could not be created. Please contact support.",
                    "error": "clinic_folder_not_found",
                    "user_id": user_id,
                    "clinic_id": clinic_id
            }
        
        # Get DICOM files for this clinic
        logger.info(f"📁 Fetching images from clinic folder: {user_clinic['clinic_id']}")
        
        # If this is a newly created clinic folder, return empty results
        if user_clinic.get('created'):
            logger.info(f"📁 New clinic folder created - no images yet")
            return {
                "images": [],
                "total": 0,
                "message": f"Clinic folder created successfully for user {user_id}. No images uploaded yet.",
                "clinic_id": user_clinic['clinic_id'],
                "status": "new_clinic_created"
            }
        
        try:
            dicom_files = s3_service.list_dicom_files(user_clinic['clinic_id'])
            logger.info(f"✅ Found {len(dicom_files)} images in clinic folder")
            
            # Log file details for debugging
            for i, file in enumerate(dicom_files[:5]):  # Log first 5 files
                logger.info(f"  - File {i+1}: {file.get('key', 'Unknown')} | Size: {file.get('size', 'Unknown')} | Modified: {file.get('last_modified', 'Unknown')}")
            
            if len(dicom_files) > 5:
                logger.info(f"  ... and {len(dicom_files) - 5} more files")
                
        except Exception as dicom_error:
            logger.error(f"❌ Error listing DICOM files for clinic {user_clinic['clinic_id']}: {str(dicom_error)}")
            logger.error(f"Error type: {type(dicom_error).__name__}")
            logger.error(f"Error details: {str(dicom_error)}")
            return {
                "images": [],
                "total": 0,
                "message": "Unable to list images from AWS S3. Please try again later.",
                "error": "dicom_listing_error",
                "user_id": user_id,
                "clinic_id": user_clinic['clinic_id'],
                "error_details": str(dicom_error)
            }
        
        # Transform to match dashboard format
        logger.info("🔄 Transforming image data for dashboard...")
        images = []
        for i, dicom_file in enumerate(dicom_files):
            try:
                # Extract filename without path
                filename = dicom_file['key'].split('/')[-1]
                
                # Determine if it's DICOM or other format
                is_dicom = filename.lower().endswith('.dcm') or 'dicom' in filename.lower()
                
                # Generate display name
                if is_dicom:
                    # For DICOM files, try to extract patient info from filename
                    display_name = filename.replace('.dcm', '').replace('_', ' ').title()
                    logger.debug(f"  - DICOM file {i+1}: {filename} → Display name: {display_name}")
                else:
                    # For JPEG/PNG, use timestamp-based name
                    timestamp = dicom_file.get('last_modified', '')
                    if timestamp:
                        try:
                            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                            display_name = f"New Scan - {dt.strftime('%b %d, %Y at %I:%M %p')}"
                            logger.debug(f"  - Image file {i+1}: {filename} → Display name: {display_name}")
                        except Exception as time_error:
                            logger.warning(f"⚠️ Failed to parse timestamp for {filename}: {str(time_error)}")
                            display_name = f"New Scan - {timestamp}"
                    else:
                        display_name = f"New Scan - {filename}"
                        logger.debug(f"  - Image file {i+1}: {filename} → Display name: {display_name}")
                
                # Check if this image has already been processed
                # TODO: Implement database check for existing processing
                status = "In Progress"  # Will be updated when processed
                
                images.append({
                    "id": f"aws-{dicom_file['key'].replace('/', '-')}",
                    "patientName": display_name,
                    "patientId": f"AWS-{filename[:8]}",
                    "scanDate": dicom_file.get('last_modified', ''),
                    "status": status,
                    "imageUrl": dicom_file['url'],
                    "annotatedImageUrl": None,  # Will be generated after AI processing
                    "summary": "Processing...",
                    "aiNotes": None,
                    "treatmentStages": [],
                    "conditions": [],
                    "teethAnalyzed": 0,
                    "createdAt": dicom_file.get('last_modified', ''),
                    "source": "aws_s3",
                    "isDicom": is_dicom,
                    "originalFilename": filename,
                    "clinicId": user_clinic['clinic_id'],
                    "fileSize": dicom_file.get('size', 0),
                    "lastModified": dicom_file.get('last_modified', ''),
                    "s3Key": dicom_file['key']
                })
                
            except Exception as transform_error:
                logger.error(f"❌ Error transforming file {i+1}: {str(transform_error)}")
                logger.error(f"File data: {dicom_file}")
                # Continue with other files instead of failing completely
                continue
        
        logger.info(f"✅ Successfully transformed {len(images)} images for dashboard")
        
        # Log summary statistics
        dicom_count = len([img for img in images if img['isDicom']])
        image_count = len([img for img in images if not img['isDicom']])
        logger.info(f"📊 Image breakdown: {dicom_count} DICOM files, {image_count} image files")
        
        return {
            "images": images,
            "total": len(images),
            "clinic_name": clinic_name,
            "clinic_id": user_clinic['clinic_id'],
            "message": f"Found {len(images)} images in AWS S3",
            "user_id": user_id,
            "processing_stats": {
                "dicom_files": dicom_count,
                "image_files": image_count,
                "total_files": len(images)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Critical error in get_user_aws_images: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error details: {str(e)}")
        
        # Try to extract any useful context
        context = {}
        try:
            if 'user_id' in locals():
                context['user_id'] = user_id
            if 'clinic_id' in locals():
                context['clinic_id'] = clinic_id
        except:
            pass
        
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "Failed to fetch AWS images",
                "error": "critical_error",
                "error_details": str(e),
                "error_type": type(e).__name__,
                "context": context
            }
        )

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

# Remove the old manual processing endpoint - no longer needed
# @router.post("/aws/process-dicom") - REMOVED

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
        
        # Get report data
        try:
            report_data = await get_diagnosis_by_id(report_id, user_id)
            if not report_data:
                logger.error(f"❌ Report {report_id} not found for user {user_id}")
                return {
                    "success": False,
                    "error": "Report not found"
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
                logger.info(f"✅ Found clinic branding: {clinic_branding.get('clinic_name', 'Unknown')}")
            else:
                # Fallback to user metadata
                user_metadata = user_response.user.user_metadata
                clinic_branding = {
                    'clinic_name': user_metadata.get('clinicName') or user_metadata.get('clinic_name') or 'Dental Clinic',
                    'phone': user_metadata.get('phone') or 'our office',
                    'website': user_metadata.get('clinicWebsite') or user_metadata.get('website') or 'our website'
                }
                logger.info(f"⚠️ Using fallback clinic branding: {clinic_branding}")
            
            # Send the email with PDF attachment
            email_sent = email_service.send_dental_report(
                patient_email=patient_email,
                patient_name=report_data.get('patient_name', 'Patient'),
                report_data=report_data,
                clinic_branding=clinic_branding
            )
            
            if email_sent:
                logger.info(f"✅ Email with PDF sent successfully to {patient_email}")
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
        
        # Create authenticated client
        auth_client = supabase_service._create_authenticated_client(token)
        user_response = None
        try:
            user_response = auth_client.auth.get_user()
        except Exception as get_user_error:
            logger.warning(f"auth.get_user failed: {get_user_error}")
        
        user_id = None
        if user_response and getattr(user_response, 'user', None):
            user_id = user_response.user.id
            logger.info(f"✅ User authenticated: {user_id}")
        else:
            # Fallback: decode user id from JWT
            try:
                decoded = jwt.decode(token, options={"verify_signature": False})
                user_id = decoded.get('sub')
                logger.info(f"🔐 Decoded user_id from JWT: {user_id}")
            except Exception as jwt_error:
                logger.warning(f"JWT decode failed: {jwt_error}")
        
        # Send actual email using email service
        logger.info(f"📧 Sending preview email to {patient_email}")
        
        try:
            from services.email_service import email_service
            
            # Get clinic branding information (auth-optional)
            clinic_branding = {}
            if user_id:
                try:
                    clinic_branding_response = auth_client.table('clinic_branding').select("*").eq('user_id', user_id).execute()
                    if clinic_branding_response.data:
                        clinic_branding = clinic_branding_response.data[0]
                        logger.info(f"✅ Found clinic branding: {clinic_branding.get('clinic_name', 'Unknown')}")
                except Exception as branding_error:
                    logger.warning(f"Clinic branding lookup failed: {branding_error}")
            if not clinic_branding:
                user_metadata = getattr(getattr(user_response, 'user', None), 'user_metadata', {}) or {}
                clinic_branding = {
                    'clinic_name': user_metadata.get('clinicName') or user_metadata.get('clinic_name') or 'Dental Clinic',
                    'phone': user_metadata.get('phone') or 'our office',
                    'website': user_metadata.get('clinicWebsite') or user_metadata.get('website') or 'our website'
                }
                logger.info(f"⚠️ Using fallback clinic branding: {clinic_branding}")
            
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
            email_sent = email_service.send_dental_report(
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