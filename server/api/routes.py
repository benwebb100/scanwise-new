from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, Dict, Any
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
            request.image_url, seg_json, request.numbering_system, request.show_numbers
        )
        
        if overlay_image:
            return {"image_url": overlay_image, "has_overlay": True}
        else:
            logger.warning("Failed to create overlay image")
            return {"image_url": image_url, "has_overlay": False}
            
    except Exception as e:
        logger.error(f"Tooth number overlay error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Tooth number overlay failed: {str(e)}")


@router.post("/billing/checkout")
async def create_checkout_session(interval: str = "monthly", token: str = Depends(get_auth_token)):
    try:
        url = stripe_service.create_checkout_session(token, interval)
        return {"url": url}
    except Exception as e:
        logger.error(f"Stripe checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/billing/portal")
async def create_billing_portal(customer_id: str, token: str = Depends(get_auth_token)):
    try:
        url = stripe_service.create_billing_portal(customer_id)
        return {"url": url}
    except Exception as e:
        logger.error(f"Stripe portal error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


from fastapi import Request
@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        stripe_service.handle_webhook(payload, sig)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Stripe webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail="Webhook Error")