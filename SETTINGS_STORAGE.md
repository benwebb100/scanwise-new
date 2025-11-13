# Settings Storage Guide

This document explains where all application settings are stored and how they're used throughout Scanwise.

## Storage Locations

### 1. **localStorage** (Browser Storage)
All general user preferences are stored in the browser's `localStorage`. These settings are:
- ✅ Per-browser/per-device (not synced across devices)
- ✅ Persistent across sessions
- ❌ Lost if browser cache/data is cleared
- ❌ NOT stored in Supabase database

### 2. **Supabase Database**
Clinic-specific and business-critical data stored in PostgreSQL tables:
- ✅ Synced across all devices/browsers
- ✅ Backed up and persistent
- ✅ Accessible from anywhere

---

## General Settings (localStorage)

### Tooth Numbering System
**Storage Key:** `toothNumberingSystem`
**Values:** `'FDI'` or `'Universal'`
**Default:** `'FDI'`

**Where Used:**
- `client/src/pages/CreateReport.tsx` - Displays tooth numbers in selected format
- `client/src/features/create-report/FindingsManagement.tsx` - Tooth dropdown options
- `client/src/data/dental-data.ts` - `getToothOptions()` function

**How It Works:**
```typescript
// Read from localStorage
const saved = localStorage.getItem('toothNumberingSystem');
const system = (saved as 'FDI' | 'Universal') || 'FDI';

// Save to localStorage
localStorage.setItem('toothNumberingSystem', 'Universal');
```

---

### Video Narration Language
**Storage Key:** `videoNarrationLanguage`
**Values:** `'english'` or `'bulgarian'`
**Default:** `'english'`

**Where Used:**
- `client/src/features/create-report/ReportGeneration.tsx` (line 91)
  - Reads setting and passes to backend API
  - Backend generates video narration in selected language

**How It Works:**
```typescript
// Read from localStorage
const videoLanguage = localStorage.getItem('videoNarrationLanguage') || 'english';

// Pass to API
api.analyzeXray({
  // ... other params
  videoLanguage: videoLanguage
});
```

---

### Generate Patient Videos Automatically
**Storage Key:** `generateVideosAutomatically`
**Values:** `'true'` or `'false'` (string, not boolean!)
**Default:** `true` (generates videos by default)

**Where Used:**
- `client/src/features/create-report/ReportGeneration.tsx` (lines 87-99)
  - Controls whether video is generated during X-ray analysis
  - If `false`: No video generated, saves processing time
  - If `true`: Video generated automatically with report

**How It Works:**
```typescript
// Read from localStorage
const generateVideosAutomatically = localStorage.getItem('generateVideosAutomatically');
const shouldGenerateVideo = generateVideosAutomatically === null ? true : generateVideosAutomatically === 'true';

// Pass to API
api.analyzeXray({
  // ... other params
  generateVideo: shouldGenerateVideo  // Backend checks this flag
});
```

**Backend Behavior** (`server/api/routes.py` line 284):
```python
should_generate_video = request.generate_video  # From frontend
if should_generate_video and diagnosis_id and annotated_url:
    # Generate video...
else:
    # Skip video generation
```

---

### Treatment Duration Threshold
**Storage Key:** `treatmentDurationThreshold`
**Values:** Number (minutes)
**Default:** `90` (90 minutes = 1.5 hours)

**Where Used:**
- `client/src/features/stage-editor/hooks/useTreatmentDurationThreshold.ts`
  - Shows warnings in Stage Editor when stage duration exceeds threshold
  - Example: "⚠️ This stage exceeds your threshold of 90 minutes"

**How It Works:**
```typescript
// Read from localStorage
const saved = localStorage.getItem('treatmentDurationThreshold');
const threshold = saved ? parseInt(saved, 10) : 90;

// Used in Stage Editor
const totalDuration = stage.items.reduce((sum, item) => sum + item.estimatedTime, 0);
if (totalDuration > threshold) {
  // Show warning
}
```

**Custom Event Listener:**
```typescript
// Settings page dispatches event when threshold changes
window.dispatchEvent(new CustomEvent('treatmentDurationThresholdChanged'));

// Stage Editor listens for changes
window.addEventListener('treatmentDurationThresholdChanged', () => {
  // Re-read threshold from localStorage
  const newThreshold = parseInt(localStorage.getItem('treatmentDurationThreshold') || '90');
});
```

---

### Other localStorage Settings

**Show Treatment Pricing**
- **Key:** `showTreatmentPricing`
- **Values:** `'true'` or `'false'`
- **Default:** `false`
- **Used in:** CreateReport.tsx - Shows/hides pricing in findings table

**Show Replacement Options Table**
- **Key:** `showReplacementOptionsTable`
- **Values:** `'true'` or `'false'`
- **Default:** `false`
- **Used in:** Report generation - Includes/excludes replacement options table

---

## Clinic Settings (Supabase Database)

### Clinic Branding
**Table:** `clinic_branding`
**Columns:**
- `clinic_name` (text)
- `address` (text)
- `phone` (text)
- `email` (text)
- `website` (text)
- `logo_url` (text)
- `header_template` (text) - Pre-generated HTML
- `footer_template` (text) - Pre-generated HTML
- `primary_color` (text) - Hex color code
- `secondary_color` (text) - Hex color code

**API Endpoints:**
- `POST /clinic-branding` - Save branding
- `GET /clinic-branding` - Retrieve branding

**Where Used:**
- PDF report headers and footers
- Email templates
- Settings page preview

---

### Treatment Settings
**Table:** `treatment_settings`
**Columns:**
- `user_id` (uuid) - Links to authenticated user
- `treatment_data` (jsonb) - All custom pricing/durations

**Structure:**
```json
{
  "surg_simple_extraction": {
    "price": 250,
    "duration": 30
  },
  "endo_rct_prep_1": {
    "price": 500,
    "duration": 40
  }
  // ... more treatments
}
```

**API Endpoints:**
- `POST /treatment-settings` - Save custom pricing
- `GET /treatment-settings` - Retrieve custom pricing

**Where Used:**
- Stage Editor - Calculates stage costs and durations
- Report generation - Shows treatment pricing
- Treatment Settings page - Display and edit

---

### Patient Diagnoses
**Table:** `patient_diagnosis`
**Columns:**
- `id` (uuid) - Diagnosis ID
- `patient_name` (text)
- `image_url` (text)
- `annotated_image_url` (text)
- `summary` (text)
- `ai_notes` (text)
- `treatment_stages` (jsonb)
- `report_html` (text)
- `video_url` (text)
- `email_sent_at` (timestamp) - When report was emailed
- `created_at` (timestamp)

**API Endpoints:**
- `POST /analyze-xray` - Creates diagnosis
- `GET /diagnoses` - List all diagnoses
- `GET /diagnoses/{id}` - Get specific diagnosis
- `PATCH /diagnoses/{id}` - Update diagnosis (e.g., email_sent_at)

---

## How Settings Flow Through the App

### Example: Video Generation Setting

1. **User Sets Preference** (Settings.tsx):
   ```typescript
   // User toggles checkbox
   setGenerateVideosAutomatically(true);
   
   // Click "Save General Settings"
   localStorage.setItem('generateVideosAutomatically', 'true');
   
   // Dispatch event
   window.dispatchEvent(new CustomEvent('generateVideosSettingChanged', { 
     detail: { enabled: true } 
   }));
   ```

2. **Report Generation Reads Setting** (ReportGeneration.tsx):
   ```typescript
   const generateVideosAutomatically = localStorage.getItem('generateVideosAutomatically');
   const shouldGenerateVideo = generateVideosAutomatically === null ? true : generateVideosAutomatically === 'true';
   ```

3. **Frontend Sends to Backend** (via api.ts):
   ```typescript
   api.analyzeXray({
     patientName: "John Smith",
     imageUrl: "https://...",
     findings: [...],
     generateVideo: shouldGenerateVideo  // <-- Setting passed here
   });
   ```

4. **Backend Processes** (routes.py):
   ```python
   should_generate_video = request.generate_video
   
   if should_generate_video and diagnosis_id:
       # Generate video with ffmpeg
       video_url = await generate_video_sync(...)
   else:
       # Skip video generation entirely
       video_url = None
   ```

5. **Result Returned**:
   - If enabled: Report includes video URL
   - If disabled: Report has no video, faster generation

---

## Migration Path: localStorage → Supabase

**Current Issue:** Settings are per-device (localStorage)
- User sets preferences on Computer A
- Logs in on Computer B → Different settings (defaults)

**Solution (Future Enhancement):**

1. Create `user_preferences` table in Supabase:
   ```sql
   CREATE TABLE user_preferences (
     user_id UUID PRIMARY KEY REFERENCES auth.users(id),
     tooth_numbering_system TEXT DEFAULT 'FDI',
     video_narration_language TEXT DEFAULT 'english',
     generate_videos_automatically BOOLEAN DEFAULT true,
     treatment_duration_threshold INTEGER DEFAULT 90,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. Update Settings.tsx to save to both locations:
   ```typescript
   // Save to localStorage (immediate, works offline)
   localStorage.setItem('toothNumberingSystem', 'Universal');
   
   // Also save to Supabase (synced across devices)
   await api.saveUserPreferences({
     tooth_numbering_system: 'Universal'
   });
   ```

3. On app load, prefer Supabase if available:
   ```typescript
   // Try Supabase first
   const serverPrefs = await api.getUserPreferences();
   
   // Fallback to localStorage
   const localPrefs = localStorage.getItem('toothNumberingSystem');
   
   // Use server if available, otherwise local
   const system = serverPrefs?.tooth_numbering_system || localPrefs || 'FDI';
   ```

---

## Quick Reference

| Setting | Storage | Default | Used In |
|---------|---------|---------|---------|
| Tooth Numbering System | localStorage | FDI | CreateReport, FindingsManagement |
| Video Language | localStorage | english | ReportGeneration → Backend |
| Generate Videos Auto | localStorage | true | ReportGeneration → Backend |
| Duration Threshold | localStorage | 90 min | Stage Editor warnings |
| Clinic Branding | Supabase | - | PDF headers/footers |
| Treatment Pricing | Supabase | Master DB | Stage Editor, Reports |
| Patient Reports | Supabase | - | Dashboard, Report history |

---

## Debugging Settings

### Check what's stored:
```javascript
// Open browser console (F12)

// View all settings
console.log('Tooth System:', localStorage.getItem('toothNumberingSystem'));
console.log('Video Language:', localStorage.getItem('videoNarrationLanguage'));
console.log('Generate Videos:', localStorage.getItem('generateVideosAutomatically'));
console.log('Duration Threshold:', localStorage.getItem('treatmentDurationThreshold'));

// View all localStorage
Object.keys(localStorage).forEach(key => {
  console.log(key, localStorage.getItem(key));
});
```

### Clear settings (reset to defaults):
```javascript
localStorage.removeItem('toothNumberingSystem');
localStorage.removeItem('videoNarrationLanguage');
localStorage.removeItem('generateVideosAutomatically');
localStorage.removeItem('treatmentDurationThreshold');

// Then refresh page
location.reload();
```

---

## Summary

**localStorage (General Settings):**
- ✅ Fast, works offline
- ✅ Good for UI preferences
- ❌ Per-device only
- ❌ Lost if cache cleared

**Supabase (Clinic/Business Data):**
- ✅ Synced across devices
- ✅ Backed up and secure
- ✅ Shared across team
- ❌ Requires network connection

**Current Approach:** localStorage for personal preferences, Supabase for business data. This is a reasonable architecture for MVP!

