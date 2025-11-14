-- ============================================================================
-- MIGRATION: Create custom_treatments table for clinic-specific treatments
-- Description: Allows clinics to add treatments not in the master database
-- Date: 2025-01-13
-- ============================================================================

-- Create custom_treatments table
CREATE TABLE IF NOT EXISTS public.custom_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  friendly_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  insurance_code VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_treatments_user_id 
ON public.custom_treatments(user_id);

CREATE INDEX IF NOT EXISTS idx_custom_treatments_category 
ON public.custom_treatments(category);

CREATE INDEX IF NOT EXISTS idx_custom_treatments_is_active 
ON public.custom_treatments(is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE public.custom_treatments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own custom treatments"
ON public.custom_treatments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom treatments"
ON public.custom_treatments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom treatments"
ON public.custom_treatments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom treatments"
ON public.custom_treatments FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_custom_treatments_updated_at
BEFORE UPDATE ON public.custom_treatments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Verify the table was created
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'custom_treatments'
ORDER BY ordinal_position;

-- Verify indexes were created
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'custom_treatments';

-- Verify RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables
WHERE tablename = 'custom_treatments';

-- Verify policies were created
SELECT 
  policyname, 
  cmd, 
  qual
FROM pg_policies
WHERE tablename = 'custom_treatments';

