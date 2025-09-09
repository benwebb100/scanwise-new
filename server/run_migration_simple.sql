-- Simple SQL migration script that can be run directly in Supabase SQL Editor
-- Copy and paste this into your Supabase SQL Editor and run it

-- Add missing report_html field to patient_diagnosis table
ALTER TABLE public.patient_diagnosis 
ADD COLUMN IF NOT EXISTS report_html text;

-- Add fields for video generation error tracking
ALTER TABLE public.patient_diagnosis 
ADD COLUMN IF NOT EXISTS video_generation_failed boolean DEFAULT false;

ALTER TABLE public.patient_diagnosis 
ADD COLUMN IF NOT EXISTS video_error text;

-- Add index for better performance when querying reports
CREATE INDEX IF NOT EXISTS idx_patient_diagnosis_report_html 
ON public.patient_diagnosis USING btree (id) 
WHERE report_html IS NOT NULL;

-- Add index for video status queries
CREATE INDEX IF NOT EXISTS idx_patient_diagnosis_video_status 
ON public.patient_diagnosis USING btree (video_generated_at, video_generation_failed) 
WHERE video_url IS NOT NULL OR video_generation_failed = true;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'patient_diagnosis' 
AND table_schema = 'public'
ORDER BY ordinal_position;