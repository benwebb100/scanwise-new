# utils/upload_test_image.py
import boto3
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Configuration
bucket_name = os.getenv('AWS_S3_BUCKET', 'scanwise-dental-images')
region = os.getenv('AWS_REGION', 'ap-southeast-2')
user_id = 'f8c3d62e-417b-45f0-863a-4e35d210d501'  # Your user ID

print(f"📦 Bucket: {bucket_name}")
print(f"📍 Region: {region}")
print(f"👤 User ID: {user_id}")

# Create S3 client
s3 = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=region
)

# Create a simple test image if you don't have one
test_image_path = 'test-xray.jpg'
if not os.path.exists(test_image_path):
    # Create a simple test image using PIL
    try:
        from PIL import Image, ImageDraw
        
        # Create a simple test image
        img = Image.new('RGB', (800, 600), color='white')
        draw = ImageDraw.Draw(img)
        draw.text((10, 10), "Test X-Ray Image", fill='black')
        draw.rectangle([100, 100, 700, 500], outline='black', width=2)
        img.save(test_image_path)
        print(f"✅ Created test image: {test_image_path}")
    except ImportError:
        print("⚠️ PIL not installed. Please provide a test image or install: pip install pillow")
        exit(1)

# Upload test images
test_files = [
    ('test-xray-001.jpg', test_image_path),
    ('patient-john-doe.jpg', test_image_path),
    ('dental-scan-2024.jpg', test_image_path),
]

for filename, filepath in test_files:
    try:
        with open(filepath, 'rb') as f:
            key = f"clinics/{user_id}/{filename}"
            
            s3.put_object(
                Bucket=bucket_name,
                Key=key,
                Body=f,
                ContentType='image/jpeg'
            )
            
            print(f"✅ Uploaded: {filename}")
            
            # Generate a presigned URL to verify
            url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': key},
                ExpiresIn=3600
            )
            print(f"   Preview URL (valid for 1 hour): {url[:100]}...")
            
    except Exception as e:
        print(f"❌ Failed to upload {filename}: {e}")

print(f"\n🎉 Test images uploaded!")
print(f"📁 Location: s3://{bucket_name}/clinics/{user_id}/")
print(f"🔄 Go to your dashboard and click 'Check AWS' to see the images")