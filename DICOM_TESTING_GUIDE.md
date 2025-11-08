# DICOM Metadata Testing Guide

## Quick Start

The DICOM metadata system is now fully integrated! Here's how to test it:

## 1. Upload a DICOM File to S3

Upload your test DICOM file (e.g., `001.dcm`) to your AWS S3 bucket:
```
scanwise-dental-images/clinics/<your-user-id>/001.dcm
```

## 2. Check Dashboard

Refresh your dashboard. You should see:

**Before Processing:**
```
┌────────────────────────────────────┐
│ 001                          📁DICOM│
│ Patient ID: AWS-001                │
│ Status: Pending                    │
│ Ready for analysis                 │
└────────────────────────────────────┘
```

## 3. Click on the DICOM Image

This triggers automatic processing:

1. **Backend converts DICOM → JPEG**
   - Downloads from S3
   - Extracts pixel data
   - Normalizes and converts to RGB
   - Saves as high-quality JPEG

2. **Backend extracts metadata**
   - Patient name, ID, email
   - Study information
   - Equipment details
   - Saves everything to database

3. **Backend runs AI analysis**
   - Sends JPEG to Roboflow
   - Detects dental conditions
   - Generates findings summary

## 4. Wait for Processing

The dashboard will show "Processing" status. After ~30-60 seconds, it should complete.

## 5. Verify Dashboard Updates

After processing, you should see:

**After Processing:**
```
┌────────────────────────────────────┐
│ Smith^John                   📁DICOM│ ← Real patient name! ✅
│ Patient ID: PAT-2024-12345         │ ← Real patient ID! ✅
│ Status: Ready                      │
│ Ready - 5 conditions detected      │
└────────────────────────────────────┘
```

## 6. Click "View Report"

This should:
1. Navigate to CreateReport page
2. **Auto-fill patient name** with "Smith^John" ✅
3. Load AI detections and annotated image
4. Display findings summary

## 7. Verify Database

Check the `dicom_metadata` table in Supabase:

```sql
-- View saved metadata
SELECT 
    patient_name,
    patient_id,
    patient_email,
    study_date,
    modality,
    manufacturer,
    filename,
    created_at
FROM dicom_metadata
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC
LIMIT 1;
```

Expected result:
```
patient_name:  "Smith^John"
patient_id:    "PAT-2024-12345"
patient_email: "john.smith@email.com"
study_date:    "20250108"
modality:      "DX"
manufacturer:  "Planmeca"
filename:      "001.dcm"
```

## 8. Check Metadata Link

Verify the metadata is linked to the analysis:

```sql
-- Check metadata link
SELECT 
    a.id AS analysis_id,
    a.filename,
    a.status,
    a.metadata_id,
    m.patient_name,
    m.patient_id,
    m.patient_email
FROM aws_image_analysis a
LEFT JOIN dicom_metadata m ON a.metadata_id = m.id
WHERE a.user_id = '<your-user-id>'
  AND a.filename = '001.dcm';
```

Expected: `metadata_id` should be populated and joined data should show patient info.

## Expected Results Checklist

### ✅ DICOM Processing
- [ ] DICOM file detected in S3
- [ ] Status changes: Pending → Processing → Ready
- [ ] No errors in network logs
- [ ] Converted JPEG uploaded to Supabase

### ✅ Metadata Extraction
- [ ] Record created in `dicom_metadata` table
- [ ] Patient name extracted correctly
- [ ] Patient ID extracted correctly
- [ ] Patient email extracted (if available in DICOM)
- [ ] All other fields populated

### ✅ Dashboard Display
- [ ] Patient name shows real DICOM name (not filename)
- [ ] Patient ID shows real DICOM ID (not AWS-xxx)
- [ ] Correct condition count displayed

### ✅ Auto-Fill Functionality
- [ ] Click image → Opens CreateReport
- [ ] Patient name field **pre-filled** with DICOM name
- [ ] Can add findings normally
- [ ] Can generate report successfully

### ✅ Metadata Persistence
- [ ] Metadata record exists in database
- [ ] `metadata_id` linked to `aws_image_analysis`
- [ ] Raw metadata JSONB contains complete data

## Troubleshooting

### Issue: "Analysis Failed"

**Check backend logs for:**
```
❌ Error converting DICOM to image
```

**Common causes:**
- DICOM file has no pixel data
- Unsupported photometric interpretation
- File corruption

**Solution:** Check the DICOM file with a DICOM viewer first.

---

### Issue: Patient Name Shows Filename

**Check:**
1. Is the DICOM file valid?
2. Does it contain patient name tag (0010,0010)?
3. Check backend logs for metadata extraction

**SQL Query:**
```sql
-- Check if metadata was saved
SELECT patient_name, raw_metadata 
FROM dicom_metadata 
WHERE filename = '001.dcm';
```

If `patient_name` is NULL but `raw_metadata` contains it, there's an extraction bug.

---

### Issue: Patient Name Not Auto-Filling

**Check:**
1. Is metadata saved in database? (See above)
2. Is `metadata_id` linked to analysis?
3. Check browser console for navigation state:

```javascript
console.log('awsPreAnalyzed:', location.state?.awsPreAnalyzed);
```

Should show:
```javascript
{
    patientName: "Smith^John",
    patientId: "PAT-2024-12345",
    patientEmail: "john.smith@email.com",
    // ... other fields
}
```

---

### Issue: Email Not Captured

**This is expected!** Not all DICOM files have patient email.

Check the raw metadata:
```sql
SELECT raw_metadata->'patient_email' 
FROM dicom_metadata 
WHERE filename = '001.dcm';
```

If it's `null`, the DICOM file doesn't contain an email tag.

## Success Criteria

✅ **Metadata Extraction:** DICOM metadata saved to database  
✅ **Patient Name Auto-Fill:** Pre-filled in dental findings form  
✅ **Patient ID Display:** Real ID shown on dashboard  
✅ **Email Capture:** Saved when available in DICOM  
✅ **Complete Workflow:** Upload → Process → View → Generate Report  

## Example Test DICOM

If you don't have a DICOM file, you can test with the one provided by the Bulgarian dentist (check your email/messages).

**What to expect from that file:**
- Patient name: [Check the DICOM tags]
- Patient ID: [Check the DICOM tags]
- Equipment: Planmeca ProMax 3D (or similar)
- Image type: Panoramic X-ray

## Next Steps After Testing

Once you've verified everything works:

1. **Test with multiple DICOMs**
   - Different manufacturers
   - Different modalities (DX, CR, etc.)
   - Files with/without patient email

2. **Test edge cases**
   - Missing patient name
   - Missing patient ID
   - Non-standard DICOM tags

3. **Performance testing**
   - Upload 10+ DICOMs
   - Check processing time
   - Verify polling stops after completion

4. **Email auto-fill (Phase 4)**
   - Implement email auto-fill in report sending
   - Test with DICOMs that have email
   - Graceful fallback for missing email

## Support

If you encounter issues:
1. Check backend logs (Render dashboard)
2. Check browser console (Network tab)
3. Query Supabase tables directly
4. Review `DICOM_METADATA_IMPLEMENTATION_COMPLETE.md` for detailed flow

## Summary

🎯 **Test Goal:** Verify DICOM metadata flows from S3 → Backend → Database → Frontend → User

✅ **Expected Outcome:** Zero manual data entry for DICOM files!

