import pydicom
import logging
from typing import Optional, Dict, Any
import tempfile
import os
import requests
from io import BytesIO

logger = logging.getLogger(__name__)

class DICOMProcessor:
    """Service for processing DICOM files and extracting metadata"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def extract_metadata_from_url(self, dicom_url: str) -> Optional[Dict[str, Any]]:
        """
        Extract metadata from a DICOM file at a given URL
        
        Args:
            dicom_url: URL to the DICOM file
            
        Returns:
            Dictionary containing extracted metadata or None if failed
        """
        try:
            # Download DICOM file
            response = requests.get(dicom_url, timeout=30)
            response.raise_for_status()
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.dcm') as temp_file:
                temp_file.write(response.content)
                temp_file_path = temp_file.name
            
            try:
                # Read DICOM file
                ds = pydicom.dcmread(temp_file_path)
                
                # Extract metadata
                metadata = self._extract_metadata(ds)
                
                return metadata
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            self.logger.error(f"Error processing DICOM from URL {dicom_url}: {str(e)}")
            return None
    
    def extract_metadata_from_bytes(self, dicom_bytes: bytes) -> Optional[Dict[str, Any]]:
        """
        Extract metadata from DICOM bytes
        
        Args:
            dicom_bytes: Raw DICOM file bytes
            
        Returns:
            Dictionary containing extracted metadata or None if failed
        """
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.dcm') as temp_file:
                temp_file.write(dicom_bytes)
                temp_file_path = temp_file.name
            
            try:
                # Read DICOM file
                ds = pydicom.dcmread(temp_file_path)
                
                # Extract metadata
                metadata = self._extract_metadata(ds)
                
                return metadata
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            self.logger.error(f"Error processing DICOM bytes: {str(e)}")
            return None
    
    def _extract_metadata(self, ds: pydicom.Dataset) -> Dict[str, Any]:
        """
        Extract metadata from a DICOM dataset
        
        Args:
            ds: Pydicom dataset
            
        Returns:
            Dictionary of extracted metadata
        """
        metadata = {}
        
        # Patient information
        try:
            if hasattr(ds, 'PatientName'):
                metadata['patient_name'] = str(ds.PatientName)
            if hasattr(ds, 'PatientID'):
                metadata['patient_id'] = str(ds.PatientID)
            if hasattr(ds, 'PatientBirthDate'):
                metadata['patient_birth_date'] = str(ds.PatientBirthDate)
            if hasattr(ds, 'PatientSex'):
                metadata['patient_sex'] = str(ds.PatientSex)
        except Exception as e:
            self.logger.warning(f"Error extracting patient info: {str(e)}")
        
        # Study information
        try:
            if hasattr(ds, 'StudyDate'):
                metadata['study_date'] = str(ds.StudyDate)
            if hasattr(ds, 'StudyTime'):
                metadata['study_time'] = str(ds.StudyTime)
            if hasattr(ds, 'StudyDescription'):
                metadata['study_description'] = str(ds.StudyDescription)
            if hasattr(ds, 'StudyID'):
                metadata['study_id'] = str(ds.StudyID)
        except Exception as e:
            self.logger.warning(f"Error extracting study info: {str(e)}")
        
        # Series information
        try:
            if hasattr(ds, 'SeriesDate'):
                metadata['series_date'] = str(ds.SeriesDate)
            if hasattr(ds, 'SeriesTime'):
                metadata['series_time'] = str(ds.SeriesTime)
            if hasattr(ds, 'SeriesDescription'):
                metadata['series_description'] = str(ds.SeriesDescription)
            if hasattr(ds, 'SeriesNumber'):
                metadata['series_number'] = str(ds.SeriesNumber)
        except Exception as e:
            self.logger.warning(f"Error extracting series info: {str(e)}")
        
        # Image information
        try:
            if hasattr(ds, 'ImageType'):
                metadata['image_type'] = str(ds.ImageType)
            if hasattr(ds, 'Modality'):
                metadata['modality'] = str(ds.Modality)
            if hasattr(ds, 'Manufacturer'):
                metadata['manufacturer'] = str(ds.Manufacturer)
            if hasattr(ds, 'ManufacturerModelName'):
                metadata['manufacturer_model'] = str(ds.ManufacturerModelName)
        except Exception as e:
            self.logger.warning(f"Error extracting image info: {str(e)}")
        
        # Technical information
        try:
            if hasattr(ds, 'Rows'):
                metadata['image_rows'] = int(ds.Rows)
            if hasattr(ds, 'Columns'):
                metadata['image_columns'] = int(ds.Columns)
            if hasattr(ds, 'BitsAllocated'):
                metadata['bits_allocated'] = int(ds.BitsAllocated)
            if hasattr(ds, 'PixelSpacing'):
                metadata['pixel_spacing'] = str(ds.PixelSpacing)
        except Exception as e:
            self.logger.warning(f"Error extracting technical info: {str(e)}")
        
        # Add extraction timestamp
        metadata['extracted_at'] = str(ds.file_meta.FileModificationDate) if hasattr(ds, 'file_meta') and hasattr(ds.file_meta, 'FileModificationDate') else None
        
        return metadata
    
    def validate_dicom(self, dicom_bytes: bytes) -> bool:
        """
        Validate if the bytes represent a valid DICOM file
        
        Args:
            dicom_bytes: Raw file bytes
            
        Returns:
            True if valid DICOM, False otherwise
        """
        try:
            # Check for DICOM magic number
            if len(dicom_bytes) < 132:
                return False
            
            # DICOM files should start with "DICM" at position 128
            magic = dicom_bytes[128:132]
            if magic == b'DICM':
                return True
            
            # Alternative: check for common DICOM prefixes
            prefixes = [b'DICM', b'DICOM', b'DCM']
            for prefix in prefixes:
                if dicom_bytes.startswith(prefix):
                    return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error validating DICOM: {str(e)}")
            return False

# Create global instance
dicom_processor = DICOMProcessor()
