-- Migration: Add report_html column to patient_diagnosis table
-- This fixes the issue where report HTML is not being saved to the database

-- Add the missing report_html column
ALTER TABLE public.patient_diagnosis 
ADD COLUMN IF NOT EXISTS report_html text;

-- Add a comment to document the column
COMMENT ON COLUMN public.patient_diagnosis.report_html IS 'HTML content of the generated dental report';

-- Update existing records to have an empty report_html if it's NULL
UPDATE public.patient_diagnosis 
SET report_html = '' 
WHERE report_html IS NULL;

-- Make the column NOT NULL with a default empty string
ALTER TABLE public.patient_diagnosis 
ALTER COLUMN report_html SET NOT NULL,
ALTER COLUMN report_html SET DEFAULT '';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'patient_diagnosis' 
AND column_name = 'report_html';
