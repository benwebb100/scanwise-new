-- Fix RLS policies for clinic_pricing table to allow treatment settings operations
-- This ensures authenticated users can insert/update their own clinic pricing data

-- Enable RLS on clinic_pricing table (if not already enabled)
ALTER TABLE public.clinic_pricing ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own clinic pricing" ON public.clinic_pricing;
DROP POLICY IF EXISTS "Users can insert their own clinic pricing" ON public.clinic_pricing;
DROP POLICY IF EXISTS "Users can update their own clinic pricing" ON public.clinic_pricing;
DROP POLICY IF EXISTS "Users can delete their own clinic pricing" ON public.clinic_pricing;

-- Create comprehensive RLS policies for clinic_pricing table
-- Policy 1: Users can view their own clinic pricing data
CREATE POLICY "Users can view their own clinic pricing" ON public.clinic_pricing
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own clinic pricing data
CREATE POLICY "Users can insert their own clinic pricing" ON public.clinic_pricing
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own clinic pricing data
CREATE POLICY "Users can update their own clinic pricing" ON public.clinic_pricing
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own clinic pricing data
CREATE POLICY "Users can delete their own clinic pricing" ON public.clinic_pricing
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add comment to document the RLS setup
COMMENT ON TABLE public.clinic_pricing IS 'Clinic-specific pricing and treatment settings data. RLS policies ensure users can only access their own data.';
