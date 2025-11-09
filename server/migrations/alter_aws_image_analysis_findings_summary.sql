-- Migration: Change findings_summary from TEXT to JSONB
-- Purpose: findings_summary stores a JSON object, not plain text
-- Date: 2025-11-09

-- Alter the column type from TEXT to JSONB
ALTER TABLE public.aws_image_analysis 
ALTER COLUMN findings_summary TYPE JSONB USING findings_summary::jsonb;

-- Update the comment
COMMENT ON COLUMN public.aws_image_analysis.findings_summary IS 'AI-generated summary of findings (JSON object with overall_summary, detailed_findings, etc.)';

