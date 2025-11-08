# DICOM Metadata Table Setup Guide

## Overview
This guide walks you through setting up the `dicom_metadata` table in Supabase to store patient information and metadata extracted from DICOM files.

## Database Migration

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**

### Step 2: Run the Migration

Copy and paste the entire contents of `server/migrations/create_dicom_metadata_table.sql` into the SQL Editor and click **Run**.

The migration will create:
- ✅ `dicom_metadata` table with all necessary columns
- ✅ Indexes for fast queries
- ✅ Row Level Security (RLS) policies
- ✅ Foreign key relationships
- ✅ Auto-update trigger for `updated_at` column
- ✅ Link column in `aws_image_analysis` table

### Step 3: Verify Table Creation

Run this query to verify the table was created successfully:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'dicom_metadata'
ORDER BY ordinal_position;
```

You should see all the columns listed.

### Step 4: Test RLS Policies

Verify RLS policies are active:

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'dicom_metadata';
```

You should see policies for SELECT, INSERT, UPDATE, DELETE.

## Table Structure

### Primary Fields

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to `auth.users` |
| `analysis_id` | UUID | Foreign key to `aws_image_analysis` (nullable) |
| `s3_key` | TEXT | S3 object key for original file |
| `filename` | TEXT | Original filename |

### Patient Information

| Column | Type | Description | Usage |
|--------|------|-------------|-------|
| `patient_name` | TEXT | Patient full name | **Auto-fill dental findings form** |
| `patient_id` | TEXT | Patient ID/MRN | **Display on dashboard** |
| `patient_email` | TEXT | Patient email (optional) | **Auto-fill email for report sending** |
| `patient_birth_date` | TEXT | Birth date (YYYYMMDD) | Future: Age calculation |
| `patient_sex` | TEXT | Sex (M/F/O) | Future: Demographics |

### Study Information

| Column | Type | Description |
|--------|------|-------------|
| `study_date` | TEXT | Date of study (YYYYMMDD) |
| `study_time` | TEXT | Time of study (HHMMSS) |
| `study_description` | TEXT | Study/procedure description |
| `study_id` | TEXT | Study identifier |

### Image/Equipment Information

| Column | Type | Description |
|--------|------|-------------|
| `image_type` | TEXT | Type of image |
| `modality` | TEXT | Imaging modality (e.g., DX) |
| `manufacturer` | TEXT | Equipment manufacturer |
| `manufacturer_model` | TEXT | Equipment model name |

### Technical Information

| Column | Type | Description |
|--------|------|-------------|
| `image_rows` | INTEGER | Image height in pixels |
| `image_columns` | INTEGER | Image width in pixels |
| `bits_allocated` | INTEGER | Bits per pixel |
| `pixel_spacing` | TEXT | Physical pixel spacing |

### Flexible Storage

| Column | Type | Description |
|--------|------|-------------|
| `raw_metadata` | JSONB | Complete metadata as JSON |

### Timestamps

| Column | Type | Description |
|--------|------|-------------|
| `extracted_at` | TIMESTAMP | When metadata was extracted |
| `created_at` | TIMESTAMP | When record was created |
| `updated_at` | TIMESTAMP | Auto-updated on changes |

## Example Queries

### Find metadata for a specific analysis
```sql
SELECT * FROM dicom_metadata
WHERE analysis_id = 'your-analysis-id';
```

### Find all DICOM files for a user
```sql
SELECT 
    filename,
    patient_name,
    patient_id,
    study_date,
    created_at
FROM dicom_metadata
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC;
```

### Find patient by ID
```sql
SELECT * FROM dicom_metadata
WHERE patient_id = 'PATIENT-123'
AND user_id = auth.uid();
```

### Get metadata with analysis details
```sql
SELECT 
    dm.patient_name,
    dm.patient_id,
    dm.patient_email,
    aia.status,
    aia.annotated_image_url,
    aia.findings_summary
FROM dicom_metadata dm
LEFT JOIN aws_image_analysis aia ON dm.analysis_id = aia.id
WHERE dm.user_id = auth.uid()
ORDER BY dm.created_at DESC;
```

## Row Level Security (RLS)

### Policies Created

1. **Users can view their own DICOM metadata**
   - Users can only SELECT records where `user_id` matches their auth ID

2. **Users can insert their own DICOM metadata**
   - Users can only INSERT records with their own `user_id`

3. **Service role can manage all DICOM metadata**
   - Backend service can INSERT/UPDATE any record

4. **Users can update their own DICOM metadata**
   - Users can only UPDATE their own records

5. **Users can delete their own DICOM metadata**
   - Users can only DELETE their own records

## Indexes Created

For optimal query performance:

- `idx_dicom_metadata_user_id` - Fast user lookups
- `idx_dicom_metadata_analysis_id` - Fast analysis joins
- `idx_dicom_metadata_patient_id` - Fast patient ID searches
- `idx_dicom_metadata_patient_name` - Fast patient name searches
- `idx_dicom_metadata_s3_key` - Fast S3 key lookups
- `idx_dicom_metadata_created_at` - Fast date sorting
- `idx_dicom_metadata_unique_s3_key_user` - Prevent duplicates

## Next Steps (Backend Implementation)

After creating the table, the backend needs to:

1. **Save metadata when DICOM is converted** (`/aws/analyze` endpoint)
   ```python
   # After converting DICOM
   metadata_record = {
       'user_id': user_id,
       'analysis_id': analysis_id,
       's3_key': s3_key,
       'filename': filename,
       'patient_name': metadata.get('patient_name'),
       'patient_id': metadata.get('patient_id'),
       'patient_email': metadata.get('patient_email'),  # If available
       'raw_metadata': metadata,
       # ... other fields
   }
   # Insert into dicom_metadata table
   ```

2. **Return metadata in `/aws/images` endpoint**
   - Include patient_name, patient_id, patient_email in response

3. **Frontend auto-fill patient information**
   - Patient name → Dental findings form
   - Patient ID → Dashboard display
   - Patient email → Email report form

## Testing the Table

### Insert Test Data
```sql
INSERT INTO public.dicom_metadata (
    user_id,
    s3_key,
    filename,
    patient_name,
    patient_id,
    patient_email,
    modality,
    study_date,
    raw_metadata
) VALUES (
    auth.uid(),
    'clinics/test-user/001.dcm',
    '001.dcm',
    'John Smith',
    'PAT-001',
    'john.smith@example.com',
    'DX',
    '20250108',
    '{"test": true}'::jsonb
);
```

### Verify Insert
```sql
SELECT * FROM dicom_metadata
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 1;
```

### Test RLS
Try accessing as different user (should return empty):
```sql
SELECT * FROM dicom_metadata
WHERE user_id != auth.uid();
```

## Troubleshooting

### Issue: Foreign key constraint fails
**Solution:** Ensure `auth.users` table exists and user_id is valid

### Issue: RLS blocks inserts
**Solution:** Verify you're using service_role key in backend, not anon key

### Issue: Duplicate key error
**Solution:** Check if metadata already exists for this S3 key + user_id combo

### Issue: NULL values in patient fields
**Solution:** Normal - not all DICOM files have all fields. Handle gracefully in code.

## Security Considerations

1. **PHI/PII Data:** Patient names, IDs, and emails are Protected Health Information
2. **RLS Enabled:** Users can only access their own data
3. **Service Role Required:** Backend must use service_role for inserts
4. **Encryption:** Supabase encrypts data at rest and in transit
5. **Audit Trail:** `created_at` and `updated_at` track all changes

## Migration Rollback

If you need to remove the table:

```sql
-- WARNING: This will delete all metadata permanently!

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_update_dicom_metadata_updated_at ON public.dicom_metadata;

-- Drop the function
DROP FUNCTION IF EXISTS update_dicom_metadata_updated_at();

-- Remove the column from aws_image_analysis
ALTER TABLE public.aws_image_analysis DROP COLUMN IF EXISTS metadata_id;

-- Drop the table (cascade to remove foreign keys)
DROP TABLE IF EXISTS public.dicom_metadata CASCADE;
```

## Summary

After running this migration:
- ✅ `dicom_metadata` table created
- ✅ All columns for patient info, study details, technical data
- ✅ RLS policies protect user data
- ✅ Indexes optimize queries
- ✅ Foreign keys link to `aws_image_analysis`
- ✅ Ready for backend integration

**Next:** Backend will save extracted metadata to this table, and frontend will auto-fill patient information from the stored data.

