-- Migration: Create dicom_metadata table for storing DICOM/medical image metadata
-- Purpose: Store extracted patient information and metadata from DICOM and TIFF files
-- Date: 2025-11-08

-- Create the dicom_metadata table
CREATE TABLE IF NOT EXISTS public.dicom_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    analysis_id UUID,
    s3_key TEXT NOT NULL,
    filename TEXT NOT NULL,
    
    -- Patient Information (Primary fields)
    patient_name TEXT,
    patient_id TEXT,
    patient_email TEXT,
    patient_birth_date TEXT,
    patient_sex TEXT,
    
    -- Study Information
    study_date TEXT,
    study_time TEXT,
    study_description TEXT,
    study_id TEXT,
    
    -- Series Information
    series_date TEXT,
    series_time TEXT,
    series_description TEXT,
    series_number TEXT,
    
    -- Image/Equipment Information
    image_type TEXT,
    modality TEXT,
    manufacturer TEXT,
    manufacturer_model TEXT,
    
    -- Technical Information
    image_rows INTEGER,
    image_columns INTEGER,
    bits_allocated INTEGER,
    pixel_spacing TEXT,
    
    -- Additional metadata stored as JSON for flexibility
    raw_metadata JSONB,
    
    -- Timestamps
    extracted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT dicom_metadata_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT dicom_metadata_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.aws_image_analysis(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dicom_metadata_user_id ON public.dicom_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_dicom_metadata_analysis_id ON public.dicom_metadata(analysis_id);
CREATE INDEX IF NOT EXISTS idx_dicom_metadata_patient_id ON public.dicom_metadata(patient_id);
CREATE INDEX IF NOT EXISTS idx_dicom_metadata_patient_name ON public.dicom_metadata(patient_name);
CREATE INDEX IF NOT EXISTS idx_dicom_metadata_s3_key ON public.dicom_metadata(s3_key);
CREATE INDEX IF NOT EXISTS idx_dicom_metadata_created_at ON public.dicom_metadata(created_at DESC);

-- Add unique constraint to prevent duplicate metadata for same S3 file
CREATE UNIQUE INDEX IF NOT EXISTS idx_dicom_metadata_unique_s3_key_user 
ON public.dicom_metadata(s3_key, user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.dicom_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own metadata records
CREATE POLICY "Users can view their own DICOM metadata"
ON public.dicom_metadata
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own metadata records
CREATE POLICY "Users can insert their own DICOM metadata"
ON public.dicom_metadata
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can insert/update any metadata (for backend processing)
CREATE POLICY "Service role can manage all DICOM metadata"
ON public.dicom_metadata
FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Users can update their own metadata records
CREATE POLICY "Users can update their own DICOM metadata"
ON public.dicom_metadata
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own metadata records
CREATE POLICY "Users can delete their own DICOM metadata"
ON public.dicom_metadata
FOR DELETE
USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.dicom_metadata IS 'Stores extracted metadata from DICOM and medical imaging files';
COMMENT ON COLUMN public.dicom_metadata.id IS 'Unique identifier for the metadata record';
COMMENT ON COLUMN public.dicom_metadata.user_id IS 'Foreign key to auth.users table';
COMMENT ON COLUMN public.dicom_metadata.analysis_id IS 'Foreign key to aws_image_analysis table (nullable)';
COMMENT ON COLUMN public.dicom_metadata.s3_key IS 'S3 object key for the original DICOM/image file';
COMMENT ON COLUMN public.dicom_metadata.filename IS 'Original filename of the DICOM/image file';
COMMENT ON COLUMN public.dicom_metadata.patient_name IS 'Patient name extracted from DICOM/TIFF metadata';
COMMENT ON COLUMN public.dicom_metadata.patient_id IS 'Patient ID/MRN extracted from metadata';
COMMENT ON COLUMN public.dicom_metadata.patient_email IS 'Patient email if available in metadata (optional)';
COMMENT ON COLUMN public.dicom_metadata.patient_birth_date IS 'Patient birth date in YYYYMMDD format';
COMMENT ON COLUMN public.dicom_metadata.patient_sex IS 'Patient sex (M/F/O)';
COMMENT ON COLUMN public.dicom_metadata.study_date IS 'Date of study in YYYYMMDD format';
COMMENT ON COLUMN public.dicom_metadata.study_time IS 'Time of study in HHMMSS format';
COMMENT ON COLUMN public.dicom_metadata.study_description IS 'Description of the study/procedure';
COMMENT ON COLUMN public.dicom_metadata.modality IS 'Imaging modality (e.g., DX for digital radiography)';
COMMENT ON COLUMN public.dicom_metadata.manufacturer IS 'Equipment manufacturer name';
COMMENT ON COLUMN public.dicom_metadata.raw_metadata IS 'Complete metadata as JSON for flexibility and future use';
COMMENT ON COLUMN public.dicom_metadata.extracted_at IS 'Timestamp when metadata was extracted from file';
COMMENT ON COLUMN public.dicom_metadata.created_at IS 'Timestamp when record was created in database';

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_dicom_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_update_dicom_metadata_updated_at
BEFORE UPDATE ON public.dicom_metadata
FOR EACH ROW
EXECUTE FUNCTION update_dicom_metadata_updated_at();

-- Optional: Add a column to aws_image_analysis to link back to metadata
ALTER TABLE public.aws_image_analysis 
ADD COLUMN IF NOT EXISTS metadata_id UUID REFERENCES public.dicom_metadata(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_aws_image_analysis_metadata_id ON public.aws_image_analysis(metadata_id);

COMMENT ON COLUMN public.aws_image_analysis.metadata_id IS 'Foreign key to dicom_metadata table for DICOM/TIFF files';

