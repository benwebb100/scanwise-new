-- Add email_sent_at column to patient_diagnosis table
-- This column tracks when a report was emailed to the patient

ALTER TABLE patient_diagnosis 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries filtering by email status
CREATE INDEX IF NOT EXISTS idx_patient_diagnosis_email_sent_at 
ON patient_diagnosis(email_sent_at);

-- Add comment to document the column
COMMENT ON COLUMN patient_diagnosis.email_sent_at IS 'Timestamp when the diagnosis report was emailed to the patient';

