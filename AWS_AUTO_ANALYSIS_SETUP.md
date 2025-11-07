# AWS Auto-Analysis Feature Setup Guide

## Overview
The AWS Auto-Analysis feature automatically processes X-ray images as soon as they arrive from the dentist's imaging software via AWS S3. Dentists no longer need to manually upload images - they can click on AWS images from the dashboard and immediately see AI analysis results.

## How It Works

### 1. **Image Arrival**
- Dentist creates X-ray in their imaging software
- Image automatically uploads to AWS S3 via integration
- Scanwise detects the new image

### 2. **Automatic AI Analysis**
- When image is detected, status shows as "Pending"
- System automatically triggers AI analysis in the background:
  - Roboflow detects dental conditions
  - Annotated image is generated
  - AI summary of findings is created
- Status updates to "Processing" during analysis
- Frontend polls every 5 seconds for status updates

### 3. **Analysis Complete**
- Status updates to "Ready" with condition count
- Dentist can click on the image
- Directly taken to AI analysis page with:
  - Annotated X-ray with detections
  - List of detected conditions
  - Suggested treatments
  - Ready to add dental findings

## Database Setup

### Run the Migration
Execute the SQL migration to create the `aws_image_analysis` table:

```bash
# From the server directory
psql YOUR_DATABASE_URL -f migrations/create_aws_image_analysis_table.sql
```

Or in Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `server/migrations/create_aws_image_analysis_table.sql`
3. Run the migration

### Table Schema
The `aws_image_analysis` table stores:
- `id`: Unique identifier
- `user_id`: User who owns the image
- `s3_key`: S3 object key for the image
- `filename`: Original filename
- `original_image_url`: Presigned URL for original image
- `annotated_image_url`: URL for annotated image with detections
- `status`: Analysis status (pending, processing, completed, failed)
- `detections`: JSON array of AI detection results
- `findings_summary`: AI-generated summary
- `error_message`: Error details if analysis failed
- `created_at`: Analysis creation timestamp
- `completed_at`: Analysis completion timestamp

## API Endpoints

### GET `/api/v1/aws/images`
Fetches all AWS images for authenticated user with analysis status.

**Response includes:**
```json
{
  "images": [
    {
      "id": "aws-filename.jpg",
      "patientName": "Display Name",
      "status": "Ready|Processing|Pending|Failed",
      "imageUrl": "presigned-url",
      "annotatedImageUrl": "annotated-url",
      "detections": [...],
      "findingsSummary": "AI summary text",
      "analysisComplete": true,
      "analysisId": "uuid",
      "s3Key": "clinics/user-id/filename.jpg"
    }
  ]
}
```

### POST `/api/v1/aws/analyze`
Triggers AI analysis for an AWS S3 image.

**Request:**
```json
{
  "s3_key": "clinics/user-id/filename.jpg",
  "image_url": "presigned-url",
  "filename": "filename.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "status": "completed|processing",
  "analysis_id": "uuid",
  "detections": [...],
  "annotated_image_url": "url",
  "findings_summary": "AI summary"
}
```

## Frontend Implementation

### Dashboard Updates
- Shows AWS images with proper status badges:
  - 🔵 **Pending**: Waiting for analysis
  - 🟡 **Processing**: AI analysis in progress (with spinner)
  - 🟢 **Ready**: Analysis complete, click to view
  - 🔴 **Failed**: Analysis failed, click to retry
- Automatically triggers analysis for pending images
- Polls every 5 seconds when processing images exist
- Cloud icon badge indicates AWS source

### CreateReport Page
- Automatically loads pre-analyzed AWS data
- Skips upload step entirely
- Shows annotated image and detections immediately
- Ready for dentist to review and add dental findings

## Status Flow

```
Pending → Processing → Ready
   ↓           ↓          ↓
 (Auto)    (5s Poll)  (Click to view)
  
If error: → Failed (Click to retry)
```

## User Experience

### Before (Manual Upload)
1. Dentist sees AWS image in dashboard
2. Clicks on it → goes to upload page
3. Still needs to "process" or manually trigger analysis
4. Waits for AI analysis
5. Finally sees results

### After (Auto-Analysis)
1. Dentist sees AWS image in dashboard with "Ready" status
2. Clicks on it → **immediately** sees AI analysis results
3. Can start adding findings right away
4. No waiting, no extra steps

## Configuration

### Environment Variables
Ensure these are set:
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_S3_BUCKET`: S3 bucket name (e.g., 'scanwise-dental-images')
- `AWS_REGION`: AWS region (e.g., 'ap-southeast-2')

### Roboflow & OpenAI
- `ROBOFLOW_API_KEY`: For dental condition detection
- `OPENAI_API_KEY`: For findings summary generation

## Troubleshooting

### Analysis Stuck in Processing
- Check backend logs for errors
- Verify Roboflow API key is valid
- Verify OpenAI API key is valid
- Check if annotated image upload to Supabase succeeded

### Status Not Updating
- Ensure polling is active (check browser console)
- Verify `/aws/images` endpoint is returning updated status
- Check if analysis record exists in `aws_image_analysis` table

### Failed Status
- Click on the image to retry analysis
- Check `error_message` column in `aws_image_analysis` table
- Review backend logs for specific error

## Testing

### Test the Flow
1. Add a test image to S3: `clinics/{user_id}/test-xray.jpg`
2. Refresh dashboard → should appear as "Pending"
3. Analysis auto-triggers → status changes to "Processing"
4. Wait 10-30 seconds → status changes to "Ready"
5. Click on image → taken to AI analysis page with results

### Manual Trigger Test
```bash
curl -X POST http://localhost:8000/api/v1/aws/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "s3_key": "clinics/user-id/test.jpg",
    "image_url": "presigned-url",
    "filename": "test.jpg"
  }'
```

## Performance Considerations

- Analysis typically takes 10-30 seconds per image
- Polling interval: 5 seconds (configurable)
- Presigned URLs expire after 1 hour
- Annotated images stored permanently in Supabase storage

## Future Enhancements

- [ ] Background job queue for analysis (Celery/Redis)
- [ ] Webhooks to notify frontend when analysis completes
- [ ] Batch analysis for multiple images
- [ ] Analysis progress percentage
- [ ] Email notification when analysis completes

