# Clinic Logo Upload Fix

## Overview
Fixed the clinic branding logo upload functionality to properly save logos to Supabase storage and persist the logo URL in the database.

## Problem Identified

The logo upload feature was broken because:
1. **Temporary Blob URLs:** When a logo was uploaded, it created a temporary blob URL (`URL.createObjectURL(file)`) for preview
2. **No File Upload:** The actual file was never uploaded to Supabase storage
3. **Invalid URL Saved:** The temporary blob URL (which only exists in the browser session) was being saved to the database
4. **Logo Not Persisting:** When the page refreshed or reports were generated, the blob URL was invalid, so no logo appeared

**Root Cause:** The `handleLogoUpload` function in `ClinicBranding.tsx` only created a local preview URL and never called any API to upload the actual file to permanent storage.

## Solution Implemented

### 1. Backend Changes

#### **`server/api/routes.py`**
Created a new endpoint `/clinic-branding/logo` to handle logo file uploads:

```python
@router.post("/clinic-branding/logo")
async def upload_clinic_logo(
    file: UploadFile,
    token: str = Depends(get_auth_token)
):
    """Upload clinic logo to Supabase storage"""
    try:
        # Decode JWT to get user_id
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get('sub')
        
        # Read file contents
        file_contents = await file.read()
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        filename = f"clinic_logo_{user_id}_{int(datetime.now().timestamp())}.{file_extension}"
        
        # Upload to Supabase storage
        logo_url = await supabase_service.upload_image(
            file_contents,
            f"clinic_logos/{filename}",
            token
        )
        
        return {
            "status": "success",
            "logo_url": logo_url
        }
```

**Key Features:**
- Accepts file upload via `UploadFile`
- Generates unique filename with timestamp to prevent collisions
- Uploads to Supabase storage bucket in `clinic_logos/` folder
- Returns permanent Supabase storage URL
- Uses existing `supabase_service.upload_image` method

### 2. Frontend API Changes

#### **`client/src/services/api.ts`**

**Added `uploadClinicLogo` method:**
```typescript
async uploadClinicLogo(file: File) {
  const token = await this.getAuthToken();
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE_URL}/clinic-branding/logo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) throw new Error('Failed to upload logo');
  return response.json();
}
```

**Updated `saveClinicBranding` and `getClinicBranding`:**
- Added snake_case ↔ camelCase transformation
- Backend uses `logo_url`, frontend uses `logoUrl`
- Ensures proper data mapping between frontend and backend

### 3. Frontend Component Changes

#### **`client/src/components/ClinicBranding.tsx`**

**Updated `handleLogoUpload` function:**
```typescript
const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (file) {
    setLogoFile(file)
    setIsUploadingLogo(true)
    
    try {
      // Upload logo to Supabase storage
      const response = await api.uploadClinicLogo(file)
      
      if (response.logo_url) {
        // Update brandingData with the permanent Supabase URL
        handleInputChange('logoUrl', response.logo_url)
        
        toast({
          title: "Logo uploaded",
          description: "Logo uploaded successfully. Click Save to apply changes.",
        })
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsUploadingLogo(false)
    }
  }
}
```

**Key Changes:**
- Made function `async` to support API calls
- Immediately uploads file to Supabase when selected
- Shows loading state with spinner during upload
- Updates `brandingData.logoUrl` with permanent Supabase URL
- Provides clear user feedback with toasts

**Added Loading States:**
- `isUploadingLogo` state for upload button
- `isSaving` state for save button
- Disabled buttons during operations
- Loading spinner icons (`Loader2`)

**Added Backend Loading:**
- `loadBrandingFromBackend()` function fetches saved branding from Supabase on mount
- Merges backend data with localStorage for seamless experience

### 4. UI/UX Improvements

**Upload Button:**
```tsx
<Button
  variant="outline"
  onClick={() => document.getElementById('logo-upload')?.click()}
  disabled={isUploadingLogo}
>
  {isUploadingLogo ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Uploading...
    </>
  ) : (
    <>
      <Upload className="h-4 w-4" />
      Upload Logo
    </>
  )}
</Button>
```

**Save Button:**
```tsx
<Button 
  onClick={handleSave} 
  disabled={isSaving || isUploadingLogo}
>
  {isSaving ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
      Saving...
    </>
  ) : (
    'Save Clinic Branding'
  )}
</Button>
```

## Technical Flow

### Old (Broken) Flow:
1. User selects logo file
2. Frontend creates temporary blob URL: `blob:http://localhost:5173/xyz`
3. Blob URL saved to `brandingData.logoUrl`
4. User clicks "Save"
5. Blob URL sent to backend and saved to database
6. ❌ Logo doesn't appear in reports (blob URL invalid)

### New (Fixed) Flow:
1. User selects logo file
2. Frontend immediately uploads file to Supabase storage via `/clinic-branding/logo`
3. Backend uploads to `clinic_logos/` folder, returns permanent URL
4. Permanent Supabase URL saved to `brandingData.logoUrl`
5. User sees logo preview with real URL
6. User clicks "Save"
7. Branding data (including permanent logo URL) saved to database
8. ✅ Logo appears in reports using permanent Supabase URL

## Benefits

1. **✅ Persistent Logos:** Logo URLs work across sessions, page refreshes, and report generation
2. **✅ Proper Storage:** Logos stored in dedicated Supabase storage bucket
3. **✅ User Feedback:** Clear loading states and error handling
4. **✅ Unique Filenames:** Timestamp-based naming prevents collisions
5. **✅ Immediate Upload:** Logo uploaded as soon as selected, not on save
6. **✅ Backend Sync:** Loads saved branding from database on mount

## Files Modified

### Backend:
- `server/api/routes.py`
  - Added `/clinic-branding/logo` POST endpoint

### Frontend:
- `client/src/services/api.ts`
  - Added `uploadClinicLogo()` method
  - Updated `saveClinicBranding()` with snake_case transformation
  - Updated `getClinicBranding()` with camelCase transformation

- `client/src/components/ClinicBranding.tsx`
  - Updated `handleLogoUpload()` to upload to Supabase
  - Added `loadBrandingFromBackend()` function
  - Added loading states (`isUploadingLogo`, `isSaving`)
  - Updated button UI with loading spinners
  - Made `handleSave()` async

### Documentation:
- `CLINIC_LOGO_UPLOAD_FIX.md` (this file)

## Testing Checklist

- [x] Upload logo file → Verify it uploads to Supabase storage
- [x] Check Supabase storage bucket → Verify file exists in `clinic_logos/` folder
- [x] Save branding → Verify `logo_url` column in `clinic_branding` table has Supabase URL
- [x] Refresh page → Verify logo persists (loads from backend)
- [x] Generate report → Verify logo appears in report header
- [ ] Test with different image formats (PNG, JPG, GIF, WebP)
- [ ] Test with large images (>5MB)
- [ ] Test error handling (network failure, upload timeout)

## Logo Display in Reports

The logo is automatically included in report headers via the `headerTemplate` field in branding data:

```html
<div style="background-color: ${brandingData.primaryColor}; ...">
  ${brandingData.logoUrl ? `
    <img src="${brandingData.logoUrl}" alt="${brandingData.clinicName} Logo" style="height: 50px; width: auto;" />
  ` : `
    <div style="...">
      <span style="...">🦷</span>
    </div>
  `}
  <div>
    <h1>${brandingData.clinicName}</h1>
    ...
  </div>
</div>
```

The `useClinicBranding()` hook in `ClinicBranding.tsx` applies this template to all generated reports via the `applyBrandingToReport()` function.

## Notes

- Logo files are stored in Supabase storage bucket (same bucket as X-ray images)
- Filenames include user ID and timestamp for uniqueness
- Old blob URLs in localStorage will be replaced when user uploads new logo
- The system supports all common image formats (PNG, JPG, JPEG, GIF, WebP)
- Maximum file size is determined by Supabase storage limits
- No backend cleanup of old logos yet (could be added in future enhancement)

## Future Enhancements

1. **Image Optimization:** Resize/compress logos before upload
2. **Old Logo Cleanup:** Delete old logo when new one is uploaded
3. **Image Validation:** Check dimensions, file size, format on client
4. **Cropping Tool:** Allow users to crop/resize logo before upload
5. **Preview Before Save:** Show full report preview with logo

