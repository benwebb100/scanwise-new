import pydicom
import logging
from typing import Optional, Dict, Any, Tuple
import tempfile
import os
import requests
from io import BytesIO
import numpy as np
from PIL import Image

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
    
    def convert_dicom_to_image(self, dicom_url: str) -> Optional[Tuple[bytes, Dict[str, Any]]]:
        """
        Convert a DICOM file to JPEG/PNG image format suitable for AI analysis
        
        Args:
            dicom_url: URL to the DICOM file
            
        Returns:
            Tuple of (image_bytes, metadata) or None if conversion failed
        """
        try:
            logger.info(f"🔄 Converting DICOM from URL: {dicom_url}")
            
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
                logger.info(f"✅ Extracted metadata: {metadata.get('patient_name', 'Unknown')}")
                
                # Get pixel array
                if not hasattr(ds, 'pixel_array'):
                    logger.error("❌ DICOM file has no pixel data")
                    return None
                
                pixel_array = ds.pixel_array
                logger.info(f"📊 Pixel array shape: {pixel_array.shape}, dtype: {pixel_array.dtype}")
                
                # Normalize pixel values to 0-255 range
                pixel_array = pixel_array.astype(np.float32)
                
                # Handle different photometric interpretations
                if hasattr(ds, 'PhotometricInterpretation'):
                    photo_interp = ds.PhotometricInterpretation
                    logger.info(f"📷 Photometric Interpretation: {photo_interp}")
                    
                    # Invert if MONOCHROME1 (where 0 is white, max is black)
                    if photo_interp == 'MONOCHROME1':
                        pixel_array = np.max(pixel_array) - pixel_array
                
                # Normalize to 0-255
                pixel_min = np.min(pixel_array)
                pixel_max = np.max(pixel_array)
                
                if pixel_max > pixel_min:
                    pixel_array = ((pixel_array - pixel_min) / (pixel_max - pixel_min)) * 255.0
                else:
                    pixel_array = np.zeros_like(pixel_array)
                
                pixel_array = pixel_array.astype(np.uint8)
                
                # Convert to PIL Image
                if len(pixel_array.shape) == 2:
                    # Grayscale image - convert to RGB for consistency
                    image = Image.fromarray(pixel_array, mode='L')
                    image = image.convert('RGB')
                elif len(pixel_array.shape) == 3:
                    # Already RGB/color image
                    image = Image.fromarray(pixel_array, mode='RGB')
                else:
                    logger.error(f"❌ Unsupported pixel array shape: {pixel_array.shape}")
                    return None
                
                logger.info(f"🖼️ Image created: {image.size}, mode: {image.mode}")
                
                # Convert to JPEG bytes
                buffer = BytesIO()
                image.save(buffer, format='JPEG', quality=95)
                image_bytes = buffer.getvalue()
                
                logger.info(f"✅ DICOM converted to JPEG: {len(image_bytes)} bytes")
                
                return (image_bytes, metadata)
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            logger.error(f"❌ Error converting DICOM to image: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    def convert_dicom_bytes_to_image(self, dicom_bytes: bytes) -> Optional[Tuple[bytes, Dict[str, Any]]]:
        """
        Convert DICOM bytes to JPEG/PNG image format
        
        Args:
            dicom_bytes: Raw DICOM file bytes
            
        Returns:
            Tuple of (image_bytes, metadata) or None if conversion failed
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
                
                # Get pixel array
                if not hasattr(ds, 'pixel_array'):
                    logger.error("DICOM file has no pixel data")
                    return None
                
                pixel_array = ds.pixel_array
                
                # Normalize pixel values to 0-255 range
                pixel_array = pixel_array.astype(np.float32)
                
                # Handle photometric interpretation
                if hasattr(ds, 'PhotometricInterpretation') and ds.PhotometricInterpretation == 'MONOCHROME1':
                    pixel_array = np.max(pixel_array) - pixel_array
                
                # Normalize to 0-255
                pixel_min = np.min(pixel_array)
                pixel_max = np.max(pixel_array)
                
                if pixel_max > pixel_min:
                    pixel_array = ((pixel_array - pixel_min) / (pixel_max - pixel_min)) * 255.0
                else:
                    pixel_array = np.zeros_like(pixel_array)
                
                pixel_array = pixel_array.astype(np.uint8)
                
                # Convert to PIL Image
                if len(pixel_array.shape) == 2:
                    image = Image.fromarray(pixel_array, mode='L').convert('RGB')
                elif len(pixel_array.shape) == 3:
                    image = Image.fromarray(pixel_array, mode='RGB')
                else:
                    logger.error(f"Unsupported pixel array shape: {pixel_array.shape}")
                    return None
                
                # Convert to JPEG bytes
                buffer = BytesIO()
                image.save(buffer, format='JPEG', quality=95)
                image_bytes = buffer.getvalue()
                
                return (image_bytes, metadata)
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            self.logger.error(f"Error converting DICOM bytes to image: {str(e)}")
            return None

# Create global instance
dicom_processor = DICOMProcessor()
