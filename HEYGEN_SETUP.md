# Heygen API Setup Guide

## Overview
This application now includes an interactive AI dentist avatar feature powered by Heygen's avatar technology. Patients can ask questions about their treatment plans and receive personalized responses from a virtual dentist.

## What You Need

### 1. Heygen API Account
- Sign up at [Heygen](https://heygen.com)
- Navigate to their API section
- Generate an API key

### 2. Environment Variables
Add these to your `.env` file in the client directory:

```bash
# Heygen API Configuration
VITE_HEYGEN_API_KEY=your_actual_api_key_here
VITE_HEYGEN_BASE_URL=https://api.heygen.com
VITE_HEYGEN_DEFAULT_AVATAR_ID=your_default_avatar_id
```

### 3. API Endpoints You'll Need
Based on Heygen's API documentation, you'll need access to:

- **Text-to-Speech API**: Convert text responses to natural speech
- **Avatar Generation API**: Create talking avatar videos
- **Avatar Management API**: Manage and customize avatars

## Current Implementation Status

### ✅ Completed
- Consultation page UI with chat interface
- Avatar placeholder and basic layout
- Integration points for Heygen API
- Navigation from report pages to consultation
- Mock responses for testing

### 🔄 Next Steps (After Getting API Keys)
1. **Replace placeholder responses** in `client/src/services/heygen.ts`
2. **Implement actual API calls** to Heygen's endpoints
3. **Add avatar video playback** in the consultation interface
4. **Test with real patient data**

## How It Works

### User Flow
1. Patient views their dental report
2. Clicks "Ask Questions" button
3. Redirected to consultation page (`/consultation/:reportId`)
4. AI avatar greets them with knowledge of their specific case
5. Patient asks questions about their treatment plan
6. Avatar responds with personalized information

### Technical Architecture
- **Frontend**: React consultation page with chat interface
- **Service Layer**: Heygen API integration service
- **Data Flow**: Patient report data → Avatar context → Personalized responses

## Testing Without API Keys

The current implementation includes mock responses so you can:
- Test the UI and user flow
- Verify navigation between pages
- Check responsive design
- Validate chat functionality

## Future Enhancements

### Phase 2: Dentist Cloning
- Allow clinics to upload video samples
- Create custom avatars that look like actual dentists
- Premium feature for clinic differentiation

### Phase 3: Advanced Features
- Multilingual avatar responses
- Voice customization
- Integration with clinic scheduling
- Follow-up appointment booking

## Support

If you need help with:
- Heygen API integration
- Custom avatar creation
- Advanced features

Contact the development team or refer to Heygen's official API documentation.

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive configuration
- Implement rate limiting for API calls
- Consider API key rotation for production use
