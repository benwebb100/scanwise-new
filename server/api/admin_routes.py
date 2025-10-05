from fastapi import APIRouter, HTTPException, Depends, Header, Request
from typing import Optional, Dict, Any, List
import logging
from services.s3_service import get_s3_service
from services.dicom_processor import dicom_processor
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)
admin_router = APIRouter(prefix="/admin", tags=["admin"])

# Simple admin authentication (you can enhance this later)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "scanwise2025"

def verify_admin_auth(username: str = Header(...), password: str = Header(...)):
    """Verify admin credentials"""
    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return True

@admin_router.get("/health")
async def admin_health_check():
    """Admin health check endpoint"""
    return {"status": "healthy", "admin": True}

@admin_router.get("/clinics")
async def list_clinics(auth: bool = Depends(verify_admin_auth)):
    """
    List all clinics and their setup status
    
    Returns:
        List of clinic information from S3
    """
    try:
        s3_service = get_s3_service()
        if not s3_service:
            raise HTTPException(status_code=500, detail="S3 service not available")
        
        clinics = s3_service.list_clinic_folders()
        return {
            "success": True,
            "clinics": clinics,
            "total": len(clinics)
        }
    except Exception as e:
        logger.error(f"Error listing clinics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list clinics: {str(e)}")

@admin_router.get("/clinics/{clinic_id}")
async def get_clinic_details(clinic_id: str, auth: bool = Depends(verify_admin_auth)):
    """
    Get detailed information about a specific clinic
    
    Args:
        clinic_id: Unique clinic identifier
        
    Returns:
        Clinic details and status
    """
    try:
        s3_service = get_s3_service()
        if not s3_service:
            raise HTTPException(status_code=500, detail="S3 service not available")
        
        clinic = s3_service.get_clinic_status(clinic_id)
        if not clinic:
            raise HTTPException(status_code=404, detail="Clinic not found")
        
        # Get DICOM files for this clinic
        dicom_files = s3_service.list_dicom_files(clinic_id)
        
        return {
            "success": True,
            "clinic": clinic,
            "dicom_files": dicom_files,
            "dicom_count": len(dicom_files)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting clinic details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get clinic details: {str(e)}")

@admin_router.post("/clinics/{clinic_id}/status")
async def update_clinic_status(
    clinic_id: str, 
    updates: Dict[str, Any],
    auth: bool = Depends(verify_admin_auth)
):
    """
    Update clinic status (e.g., mark as setup completed)
    
    Args:
        clinic_id: Unique clinic identifier
        updates: Dictionary of fields to update
        
    Returns:
        Success status
    """
    try:
        s3_service = get_s3_service()
        if not s3_service:
            raise HTTPException(status_code=500, detail="S3 service not available")
        
        success = s3_service.update_clinic_status(clinic_id, updates)
        if not success:
            raise HTTPException(status_code=404, detail="Clinic not found or update failed")
        
        return {
            "success": True,
            "message": f"Clinic {clinic_id} status updated successfully",
            "updates": updates
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating clinic status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update clinic status: {str(e)}")

@admin_router.post("/clinics/{clinic_id}/setup-complete")
async def mark_setup_complete(
    clinic_id: str,
    request: Request,
    auth: bool = Depends(verify_admin_auth)
):
    """
    Mark a clinic as setup completed
    
    Args:
        clinic_id: Unique clinic identifier
        request: Request body containing imaging_provider and optional notes
        
    Returns:
        Success status
    """
    try:
        # Parse request body
        body = await request.json()
        imaging_provider = body.get('imaging_provider')
        notes = body.get('notes')
        
        if not imaging_provider:
            raise HTTPException(status_code=422, detail="imaging_provider is required")
        
        updates = {
            'status': 'setup_completed',
            'setup_completed': True,
            'imaging_provider': imaging_provider,
            'setup_notes': notes,
            'setup_completed_at': datetime.utcnow().isoformat()
        }
        
        s3_service = get_s3_service()
        if not s3_service:
            raise HTTPException(status_code=500, detail="S3 service not available")
        
        success = s3_service.update_clinic_status(clinic_id, updates)
        if not success:
            raise HTTPException(status_code=404, detail="Clinic not found or update failed")
        
        return {
            "success": True,
            "message": f"Clinic {clinic_id} marked as setup completed",
            "imaging_provider": imaging_provider,
            "setup_completed_at": updates['setup_completed_at']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking setup complete: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to mark setup complete: {str(e)}")

@admin_router.get("/s3/status")
async def get_s3_status(auth: bool = Depends(verify_admin_auth)):
    """
    Get S3 connection status and bucket information
    
    Returns:
        S3 connection status and bucket details
    """
    try:
        s3_service = get_s3_service()
        if not s3_service:
            return {
                "success": False,
                "s3_connection": "error",
                "error": "S3 service not available"
            }
        
        connection_ok = s3_service.test_connection()
        
        return {
            "success": True,
            "s3_connection": "connected" if connection_ok else "disconnected",
            "bucket_name": s3_service.bucket_name,
            "region": s3_service.region,
            "connection_test": connection_ok
        }
    except Exception as e:
        logger.error(f"Error checking S3 status: {str(e)}")
        return {
            "success": False,
            "s3_connection": "error",
            "error": str(e)
        }

@admin_router.get("/dashboard")
async def get_admin_dashboard(auth: bool = Depends(verify_admin_auth)):
    """
    Get admin dashboard overview
    
    Returns:
        Dashboard statistics and summary
    """
    try:
        s3_service = get_s3_service()
        if not s3_service:
            raise HTTPException(status_code=500, detail="S3 service not available")
        
        # Get all clinics
        clinics = s3_service.list_clinic_folders()
        
        # Calculate statistics
        total_clinics = len(clinics)
        pending_setup = len([c for c in clinics if c.get('status') == 'pending_setup'])
        setup_completed = len([c for c in clinics if c.get('setup_completed', False)])
        active_clinics = len([c for c in clinics if c.get('status') == 'active'])
        
        # Get recent activity (clinics created in last 7 days)
        recent_clinics = []
        for clinic in clinics:
            if 'created_at' in clinic:
                try:
                    created_date = datetime.fromisoformat(clinic['created_at'].replace('Z', '+00:00'))
                    if (datetime.utcnow() - created_date).days <= 7:
                        recent_clinics.append(clinic)
                except:
                    pass
        
        return {
            "success": True,
            "dashboard": {
                "total_clinics": total_clinics,
                "pending_setup": pending_setup,
                "setup_completed": setup_completed,
                "active_clinics": active_clinics,
                "recent_clinics": len(recent_clinics)
            },
            "recent_activity": recent_clinics[:5],  # Last 5 recent clinics
            "summary": {
                "message": f"Total clinics: {total_clinics}, {pending_setup} pending setup, {setup_completed} completed"
            }
        }
    except Exception as e:
        logger.error(f"Error getting admin dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard: {str(e)}")

@admin_router.post("/dicom/process")
async def process_dicom_file(
    dicom_url: str,
    clinic_id: str,
    auth: bool = Depends(verify_admin_auth)
):
    """
    Process a DICOM file and extract metadata
    
    Args:
        dicom_url: URL to the DICOM file
        clinic_id: ID of the clinic this DICOM belongs to
        
    Returns:
        Extracted metadata and processing status
    """
    try:
        # Extract metadata from DICOM
        metadata = dicom_processor.extract_metadata_from_url(dicom_url)
        
        if not metadata:
            raise HTTPException(status_code=400, detail="Failed to extract DICOM metadata")
        
        # Add clinic information
        metadata['clinic_id'] = clinic_id
        metadata['processed_at'] = datetime.utcnow().isoformat()
        
        return {
            "success": True,
            "metadata": metadata,
            "message": "DICOM metadata extracted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing DICOM: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process DICOM: {str(e)}")
