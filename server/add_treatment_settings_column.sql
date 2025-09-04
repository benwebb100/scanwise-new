-- Add treatment_settings column to clinic_pricing table
-- This allows storing both pricing and duration data for treatments

ALTER TABLE public.clinic_pricing 
ADD COLUMN IF NOT EXISTS treatment_settings jsonb DEFAULT '{}'::jsonb;

-- Add comment to document the new field
COMMENT ON COLUMN public.clinic_pricing.treatment_settings IS 'Treatment settings including both pricing and duration data in format: {"treatment_key": {"price": number, "duration": number}}';
