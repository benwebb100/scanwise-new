# CORS PATCH Method Fix - Report HTML Not Saving

## Problem Summary
Report HTML was not being saved to the Supabase `patient_diagnosis.report_html` column, causing:
1. ❌ PDF email reports displaying collapsed text instead of formatted HTML
2. ❌ Report history showing blank/empty reports
3. ❌ Loss of all report formatting and structure

## Root Cause
**CORS Policy Blocking PATCH Requests**

The backend's CORS configuration in `server/main.py` was missing `PATCH` from the allowed HTTP methods in the preflight OPTIONS handler.

### Error Message
```
Access to fetch at 'https://backend-scanwise.onrender.com/api/v1/diagnosis/.../html' 
from origin 'https://scan-wise.com' has been blocked by CORS policy: 
Method PATCH is not allowed by Access-Control-Allow-Methods in preflight response.
```

## The Fix

### File: `server/main.py` (Line 100)

**Before:**
```python
response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
```

**After:**
```python
response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
```

## Technical Details

### API Flow
1. **Frontend** (`ReportGeneration.tsx` line 150): 
   - Calls `api.updateReportHtml(diagnosis_id, finalHtml)`
   
2. **API Layer** (`api.ts` line 827):
   - Sends `PATCH /diagnosis/{diagnosisId}/html` with `report_html` in body
   
3. **Backend** (`routes.py` line 960):
   - Receives PATCH request and updates Supabase
   - `auth_client.table('patient_diagnosis').update({'report_html': report_html}).eq('id', diagnosis_id)`

### Why PATCH Was Blocked
- Modern browsers send a **preflight OPTIONS request** before PATCH/PUT/DELETE
- The OPTIONS handler checks if the method is allowed
- If PATCH is not in `Access-Control-Allow-Methods`, the browser **blocks the actual request**
- The frontend never receives an error from the endpoint - it fails at the CORS level

## Verification Steps

### After Deployment
1. Generate a new report (manual upload or AWS)
2. Check browser console for:
   - ✅ `💾 Saving generated HTML to database for diagnosis: [UUID]`
   - ✅ `✅ HTML saved successfully to database`
   - ❌ **NO** CORS errors

3. Check Supabase `patient_diagnosis` table:
   - `report_html` column should have HTML content (not NULL)

4. Test email PDF:
   - Should show fully formatted HTML report (not collapsed text)

5. Test report history:
   - Clicking on a report should display the full formatted HTML

## Related Files
- `server/main.py` - CORS configuration
- `client/src/features/create-report/ReportGeneration.tsx` - Frontend save logic
- `client/src/services/api.ts` - API client
- `server/api/routes.py` - Backend endpoint

## Debugging Added
Enhanced logging in `ReportGeneration.tsx`:
```typescript
console.log('🔍 Checking if we can save HTML to database...');
console.log('   - finalHtml exists:', !!finalHtml, '(length:', finalHtml?.length || 0, ')');
console.log('   - analysisResult.diagnosis_id:', analysisResult?.diagnosis_id);
```

This will help identify future issues with:
- Missing `diagnosis_id` in response
- Empty HTML generation
- Network failures

## Impact
This fix resolves the **complete loss of report HTML** for:
- ✅ Email PDF attachments (now properly formatted)
- ✅ Report history viewing
- ✅ Future report regeneration
- ✅ Patient-facing reports

## Deployment Notes
- **Backend must be redeployed** for this fix to take effect
- No frontend changes required for the core fix (only debugging added)
- Existing reports with NULL `report_html` will need to be regenerated

