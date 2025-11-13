# Database Migrations

This directory contains SQL migration files for the Scanwise database schema.

## Running Migrations

### Option 1: Manual (Recommended)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Copy the contents of the migration file you want to run
5. Paste into the SQL Editor
6. Click **Run**

### Option 2: Python Script

Run the migration helper script:

```bash
cd server
python3 run_email_sent_migration.py
```

This will display the SQL that needs to be run in Supabase.

## Available Migrations

### `add_email_sent_at_column.sql`

**Purpose:** Tracks when reports are emailed to patients

**What it does:**
- Adds `email_sent_at` timestamp column to `patient_diagnosis` table
- Creates an index for faster queries
- Enables "Completed and Sent" badge on Dashboard

**SQL to run:**

```sql
-- Add email_sent_at column to patient_diagnosis table
ALTER TABLE patient_diagnosis 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries filtering by email status
CREATE INDEX IF NOT EXISTS idx_patient_diagnosis_email_sent_at 
ON patient_diagnosis(email_sent_at);

-- Add comment to document the column
COMMENT ON COLUMN patient_diagnosis.email_sent_at IS 'Timestamp when the diagnosis report was emailed to the patient';
```

## Verifying Migration

After running the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patient_diagnosis' 
AND column_name = 'email_sent_at';

-- Check if index exists
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'patient_diagnosis' 
AND indexname = 'idx_patient_diagnosis_email_sent_at';
```

## Troubleshooting

**"Column already exists" error:** 
- The migration is idempotent (safe to run multiple times)
- The `IF NOT EXISTS` clause prevents errors if already run

**Permission denied:**
- Make sure you're using a Supabase service role key
- Run the SQL in the Supabase SQL Editor (has full permissions)

**Dashboard still not showing badge:**
- Verify migration ran successfully (use verification SQL above)
- Check backend logs for any errors when updating `email_sent_at`
- Clear browser cache and refresh dashboard
- Send a test email to trigger the timestamp update

