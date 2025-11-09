# Video Narration Language Feature

## Overview
Added ability to generate patient education videos in either English or Bulgarian, using different ElevenLabs voice IDs for each language.

## User Experience

### Settings Page (General Tab)
- **New Dropdown**: "Video Narration Language"
- **Location**: Settings → General Settings
- **Options**:
  - English (default)
  - Bulgarian
- **Behavior**: 
  - Selection is saved to `localStorage` immediately
  - Toast notification confirms the change
  - Setting persists across sessions

## Technical Implementation

### Frontend Changes

#### 1. Settings Component (`client/src/pages/Settings.tsx`)
```typescript
const [videoNarrationLanguage, setVideoNarrationLanguage] = useState<'english' | 'bulgarian'>(() => {
  const saved = localStorage.getItem('videoNarrationLanguage');
  return (saved as 'english' | 'bulgarian') || 'english';
});
```

**UI Component**:
- Dropdown select element
- Saves to localStorage on change
- Shows toast notification

#### 2. API Client (`client/src/services/api.ts`)
- Reads `videoNarrationLanguage` from localStorage
- Includes in `analyze-xray` request body as `video_language`
- Logs language selection for debugging
- Backwards compatible (defaults to 'english' if not set)

### Backend Changes

#### 1. Request Model (`server/models/analyze.py`)
```python
class AnalyzeXrayRequest(BaseModel):
    # ... other fields
    video_language: Optional[str] = "english"  # New field
```

#### 2. ElevenLabs Service (`server/services/elevenlabs_service.py`)
**Voice IDs**:
- English: `EkK5I93UQWFDigLMpZcX` (existing default)
- Bulgarian: `13Cuh3NuYvWOVQtLbRN8` (new)

**Method Signature**:
```python
async def generate_voice(self, text: str, language: str = "english") -> Optional[bytes]
```

**Logic**:
```python
# Select voice ID based on language
voice_id = self.bulgarian_voice_id if language.lower() == "bulgarian" else self.default_voice_id
api_url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
```

#### 3. Routes (`server/api/routes.py`)
**Video Generation**:
- Extracts `video_language` from request
- Passes to `generate_video_sync()` function
- Forwards to ElevenLabs service

```python
video_language = request.video_language or "english"
video_url = await generate_video_sync(..., video_language)
```

## Data Flow

1. **User selects language** in Settings → Saved to localStorage
2. **User generates report** → Frontend reads from localStorage
3. **API request** → Includes `video_language: "english"` or `"bulgarian"`
4. **Backend video generation** → Passes language to ElevenLabs
5. **ElevenLabs API** → Uses appropriate voice ID
6. **Video created** → With narration in selected language

## Logging

**Frontend**:
```
🎙️ API: Video narration language: bulgarian
```

**Backend**:
```
Generating voice in bulgarian using voice ID: 13Cuh3NuYvWOVQtLbRN8
Calling ElevenLabs API for bulgarian narration...
```

## Backwards Compatibility
- If `video_language` is not provided, defaults to `"english"`
- Existing videos remain unaffected
- Works with both manual uploads and AWS auto-analysis

## Testing Checklist

### Frontend
- [ ] Settings dropdown displays correctly
- [ ] Selection persists after page refresh
- [ ] Toast notification appears on change
- [ ] localStorage value updates correctly

### Backend
- [ ] English videos generate with correct voice
- [ ] Bulgarian videos generate with correct voice
- [ ] Logs show correct language selection
- [ ] Fallback to English works if invalid language provided

### Integration
- [ ] Manual report generation uses correct language
- [ ] AWS auto-analysis uses correct language
- [ ] Video is downloadable and plays
- [ ] Narration is in the correct language

## Future Enhancements
- Add more languages (Spanish, French, German, etc.)
- Allow per-report language override
- Store language preference in user profile (Supabase)
- Generate video script in the target language (requires OpenAI translation)

## Notes
- Currently only the voice changes; video script is still generated in English by OpenAI
- For true multilingual support, would need to translate the video script as well
- ElevenLabs Bulgarian voice (13Cuh3NuYvWOVQtLbRN8) is confirmed to work

