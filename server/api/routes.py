from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, Dict
from datetime import datetime
import logging
import os

import requests

from models.analyze import AnalyzeXrayRequest, AnalyzeXrayResponse, SuggestChangesRequest, SuggestChangesResponse
from services.supabase import supabase_service
from services.roboflow import roboflow_service
from services.openai_analysis import openai_service
from utils.image import generate_annotated_filename

from services.video_generator import video_generator_service
from services.elevenlabs_service import elevenlabs_service
import tempfile
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

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

# @router.post("/analyze-xray", response_model=AnalyzeXrayResponse)
# async def analyze_xray(
#     request: AnalyzeXrayRequest,
#     token: str = Depends(get_auth_token)
# ):
#     """
#     Main endpoint to analyze dental X-ray
#     Note: Supabase handles user authentication and RLS automatically
#     """
#     try:
#         logger.info(f"Starting X-ray analysis for patient: {request.patient_name}")
        
#         # Step 1: Send image to Roboflow for detection
#         predictions, annotated_image = await roboflow_service.detect_conditions(str(request.image_url))
        
#         if not predictions or not annotated_image:
#             raise HTTPException(status_code=500, detail="Failed to process image with Roboflow")
        
#         # Step 2: Upload annotated image to Supabase Storage
#         annotated_filename = generate_annotated_filename(str(request.image_url), request.patient_name)
#         annotated_url = await supabase_service.upload_image(
#             annotated_image,
#             f"{annotated_filename}",
#             token
#         )
        
#         if not annotated_url:
#             raise HTTPException(status_code=500, detail="Failed to upload annotated image")
        
#         # Step 3: Analyze with OpenAI
#         findings_dict = [f.model_dump() for f in request.findings] if request.findings else []
#         ai_analysis = await openai_service.analyze_dental_conditions(predictions, findings_dict)
        
#         # Step 4: Save to database (Supabase handles user_id via RLS)
#         diagnosis_data = {
#             'patient_name': request.patient_name,
#             'image_url': str(request.image_url),
#             'annotated_image_url': annotated_url,
#             'summary': ai_analysis.get('summary', ''),
#             'ai_notes': ai_analysis.get('ai_notes', ''),
#             'treatment_stages': ai_analysis.get('treatment_stages', [])
#         }
        
#         saved_diagnosis = await supabase_service.save_diagnosis(diagnosis_data, token)
        
#         # Step 5: Prepare response
#         response = AnalyzeXrayResponse(
#             status="success",
#             summary=ai_analysis.get('summary', ''),
#             treatment_stages=ai_analysis.get('treatment_stages', []),
#             ai_notes=ai_analysis.get('ai_notes', ''),
#             diagnosis_timestamp=datetime.now(),
#             annotated_image_url=annotated_url
#         )
        
#         logger.info(f"Successfully completed X-ray analysis for patient: {request.patient_name}")
#         return response
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Unexpected error in analyze_xray: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/analyze-xray", response_model=AnalyzeXrayResponse)
async def analyze_xray(
    request: AnalyzeXrayRequest,
    generate_video: bool = False,  # Add this parameter
    token: str = Depends(get_auth_token)
):
    """
    Main endpoint to analyze dental X-ray
    Note: Supabase handles user authentication and RLS automatically
    """
    try:
        logger.info(f"Starting X-ray analysis for patient: {request.patient_name}")
        
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
        
        # Step 4: Save to database (Supabase handles user_id via RLS)
        diagnosis_data = {
            'patient_name': request.patient_name,
            'image_url': str(request.image_url),
            'annotated_image_url': annotated_url,
            'summary': ai_analysis.get('summary', ''),
            'ai_notes': ai_analysis.get('ai_notes', ''),
            'treatment_stages': ai_analysis.get('treatment_stages', [])
        }
        
        saved_diagnosis = await supabase_service.save_diagnosis(diagnosis_data, token)
        diagnosis_id = saved_diagnosis.get('id')
        
        # Step 5: Generate video if requested
        video_url = None
        if generate_video and diagnosis_id:
            try:
                logger.info("Generating patient education video...")
                
                # Convert annotated image to base64
                image_base64 = video_generator_service.image_to_base64(annotated_url)
                
                # Generate video script
                video_script = await openai_service.generate_video_script(
                    ai_analysis.get('treatment_stages', []), 
                    image_base64
                )
                
                # Generate voice audio
                audio_bytes = await elevenlabs_service.generate_voice(video_script)
                
                # Create temporary files
                temp_dir = tempfile.mkdtemp()
                unique_id = str(uuid.uuid4())[:8]
                
                # Save image
                image_response = requests.get(annotated_url)
                image_path = os.path.join(temp_dir, f"image_{unique_id}.jpg")
                with open(image_path, 'wb') as f:
                    f.write(image_response.content)
                
                # Save audio
                audio_path = os.path.join(temp_dir, f"audio_{unique_id}.mp3")
                with open(audio_path, 'wb') as f:
                    f.write(audio_bytes)
                
                # Create video
                video_path = os.path.join(temp_dir, f"patient_video_{unique_id}.mp4")
                video_generator_service.create_video_with_subtitles(
                    image_path, 
                    audio_path, 
                    video_path
                )
                
                # Upload video
                with open(video_path, 'rb') as video_file:
                    video_data = video_file.read()
                
                video_filename = f"patient_videos/{request.patient_name.replace(' ', '_')}_{unique_id}.mp4"
                video_url = await supabase_service.upload_video(
                    video_data,
                    video_filename,
                    token
                )
                
                # Update diagnosis with video URL
                if video_url:
                    auth_client = supabase_service._create_authenticated_client(token)
                    auth_client.table('patient_diagnosis').update({
                        'video_url': video_url,
                        'video_script': video_script,
                        'video_generated_at': datetime.now().isoformat()
                    }).eq('id', diagnosis_id).execute()
                
                # Cleanup
                import shutil
                shutil.rmtree(temp_dir)
                
            except Exception as e:
                logger.error(f"Error generating video: {str(e)}")
                # Don't fail the whole request if video generation fails
                video_url = None
        
        # Step 6: Prepare response
        response_data = {
            "status": "success",
            "summary": ai_analysis.get('summary', ''),
            "treatment_stages": ai_analysis.get('treatment_stages', []),
            "ai_notes": ai_analysis.get('ai_notes', ''),
            "diagnosis_timestamp": datetime.now(),
            "annotated_image_url": annotated_url
        }
        
        # Add video URL to response if available
        if video_url:
            response_data["video_url"] = video_url
        
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
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=2000
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