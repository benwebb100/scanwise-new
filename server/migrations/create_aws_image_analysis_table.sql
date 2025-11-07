-- Migration: Create aws_image_analysis table for storing AWS image analysis results
-- Purpose: Track and store AI analysis results for images uploaded via AWS S3
-- Date: 2025-11-07

-- Create the aws_image_analysis table
CREATE TABLE IF NOT EXISTS public.aws_image_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    s3_key TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_image_url TEXT NOT NULL,
    annotated_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    detections JSONB,
    findings_summary TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT aws_image_analysis_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_aws_image_analysis_user_id ON public.aws_image_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_aws_image_analysis_s3_key ON public.aws_image_analysis(s3_key);
CREATE INDEX IF NOT EXISTS idx_aws_image_analysis_status ON public.aws_image_analysis(status);
CREATE INDEX IF NOT EXISTS idx_aws_image_analysis_created_at ON public.aws_image_analysis(created_at DESC);

-- Add unique constraint to prevent duplicate analysis for same S3 key and user
CREATE UNIQUE INDEX IF NOT EXISTS idx_aws_image_analysis_unique_s3_key_user 
ON public.aws_image_analysis(s3_key, user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.aws_image_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own analysis records
CREATE POLICY "Users can view their own AWS image analysis"
ON public.aws_image_analysis
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own analysis records
CREATE POLICY "Users can insert their own AWS image analysis"
ON public.aws_image_analysis
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own analysis records
CREATE POLICY "Users can update their own AWS image analysis"
ON public.aws_image_analysis
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own analysis records
CREATE POLICY "Users can delete their own AWS image analysis"
ON public.aws_image_analysis
FOR DELETE
USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.aws_image_analysis IS 'Stores AI analysis results for images uploaded via AWS S3 integration';
COMMENT ON COLUMN public.aws_image_analysis.id IS 'Unique identifier for the analysis record';
COMMENT ON COLUMN public.aws_image_analysis.user_id IS 'Foreign key to auth.users table';
COMMENT ON COLUMN public.aws_image_analysis.s3_key IS 'S3 object key for the image';
COMMENT ON COLUMN public.aws_image_analysis.filename IS 'Original filename of the image';
COMMENT ON COLUMN public.aws_image_analysis.original_image_url IS 'Presigned URL for the original image';
COMMENT ON COLUMN public.aws_image_analysis.annotated_image_url IS 'URL for the annotated image with AI detections';
COMMENT ON COLUMN public.aws_image_analysis.status IS 'Analysis status: pending, processing, completed, failed';
COMMENT ON COLUMN public.aws_image_analysis.detections IS 'JSON array of AI detection results from Roboflow';
COMMENT ON COLUMN public.aws_image_analysis.findings_summary IS 'AI-generated summary of findings';
COMMENT ON COLUMN public.aws_image_analysis.error_message IS 'Error message if analysis failed';
COMMENT ON COLUMN public.aws_image_analysis.created_at IS 'Timestamp when the analysis was created';
COMMENT ON COLUMN public.aws_image_analysis.completed_at IS 'Timestamp when the analysis was completed or failed';

