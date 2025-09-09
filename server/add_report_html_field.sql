-- Add missing report_html field to patient_diagnosis table
-- This field is needed to store the generated HTML report content

ALTER TABLE public.patient_diagnosis 
ADD COLUMN IF NOT EXISTS report_html text;

-- Add index for better performance when querying reports
CREATE INDEX IF NOT EXISTS idx_patient_diagnosis_report_html 
ON public.patient_diagnosis USING btree (id) 
WHERE report_html IS NOT NULL;

-- Add fields for video generation error tracking
ALTER TABLE public.patient_diagnosis 
ADD COLUMN IF NOT EXISTS video_generation_failed boolean DEFAULT false;

ALTER TABLE public.patient_diagnosis 
ADD COLUMN IF NOT EXISTS video_error text;

-- Add index for video status queries
CREATE INDEX IF NOT EXISTS idx_patient_diagnosis_video_status 
ON public.patient_diagnosis USING btree (video_generated_at, video_generation_failed) 
WHERE video_url IS NOT NULL OR video_generation_failed = true;