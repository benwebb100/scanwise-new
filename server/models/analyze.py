from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional
from datetime import datetime

class Finding(BaseModel):
    tooth: str
    condition: str
    treatment: str
    replacement: Optional[str] = None

class AnalyzeXrayRequest(BaseModel):
    patient_name: Optional[str] = None
    image_url: HttpUrl
    findings: Optional[List[Finding]] = []
    generate_video: Optional[bool] = False

class TreatmentItem(BaseModel):
    tooth: str
    condition: str
    recommended_treatment: str

class TreatmentStage(BaseModel):
    stage: str
    focus: str
    items: List[TreatmentItem]

class Detection(BaseModel):
    class_name: str = Field(alias="class")
    confidence: float
    x: float
    y: float
    width: float
    height: float

class AnalyzeXrayResponse(BaseModel):
    status: str
    summary: str
    treatment_stages: List[TreatmentStage]
    ai_notes: str
    diagnosis_timestamp: datetime
    annotated_image_url: Optional[str] = None
    video_url: Optional[str] = None
    detections: Optional[List[Detection]] = None
    report_html: Optional[str] = None  # Add report HTML field
    diagnosis_id: Optional[str] = None  # Add diagnosis ID for video polling

class SuggestChangesRequest(BaseModel):
    previous_report_html: str
    change_request_text: str

class SuggestChangesResponse(BaseModel):
    updated_html: str

