from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime

class Finding(BaseModel):
    tooth: str
    condition: str
    treatment: str

class AnalyzeXrayRequest(BaseModel):
    patient_name: str
    image_url: HttpUrl
    findings: Optional[List[Finding]] = []

class TreatmentItem(BaseModel):
    tooth: str
    condition: str
    recommended_treatment: str

class TreatmentStage(BaseModel):
    stage: str
    focus: str
    items: List[TreatmentItem]

class AnalyzeXrayResponse(BaseModel):
    status: str
    summary: str
    treatment_stages: List[TreatmentStage]
    ai_notes: str
    diagnosis_timestamp: datetime
    annotated_image_url: str

class SuggestChangesRequest(BaseModel):
    previous_report_html: str
    change_request_text: str

class SuggestChangesResponse(BaseModel):
    updated_html: str