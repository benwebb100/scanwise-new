# setup_s3_bucket.py
import boto3
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get configuration from environment
bucket_name = os.getenv('AWS_S3_BUCKET', 'scanwise-dental-images')
region = os.getenv('AWS_REGION', 'us-east-1')
aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')

if not aws_access_key or not aws_secret_key:
    print("❌ AWS credentials not found in environment variables!")
    print("Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file")
    exit(1)

print(f"🔧 Setting up S3 bucket: {bucket_name}")
print(f"📍 Region: {region}")

# Create S3 client
s3 = boto3.client(
    's3',
    aws_access_key_id=aws_access_key,
    aws_secret_access_key=aws_secret_key,
    region_name=region
)

# Create bucket
try:
    if region == 'us-east-1':
        s3.create_bucket(Bucket=bucket_name)
    else:
        s3.create_bucket(
            Bucket=bucket_name,
            CreateBucketConfiguration={'LocationConstraint': region}
        )
    print(f"✅ Created bucket: {bucket_name}")
except Exception as e:
    if 'BucketAlreadyExists' in str(e) or 'BucketAlreadyOwnedByYou' in str(e):
        print(f"ℹ️ Bucket already exists: {bucket_name}")
    else:
        print(f"❌ Error: {e}")
        exit(1)

# Set CORS configuration for web access
cors_config = {
    'CORSRules': [{
        'AllowedHeaders': ['*'],
        'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE'],
        'AllowedOrigins': ['*'],
        'ExposeHeaders': ['ETag'],
        'MaxAgeSeconds': 3000
    }]
}

try:
    s3.put_bucket_cors(Bucket=bucket_name, CORSConfiguration=cors_config)
    print("✅ CORS configured")
except Exception as e:
    print(f"⚠️ Failed to set CORS: {e}")

# Make images publicly readable
bucket_policy = {
    "Version": "2012-10-17",
    "Statement": [{
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": f"arn:aws:s3:::{bucket_name}/clinics/*"
    }]
}

try:
    s3.put_bucket_policy(
        Bucket=bucket_name,
        Policy=json.dumps(bucket_policy)
    )
    print("✅ Public read policy set")
except Exception as e:
    print(f"⚠️ Failed to set bucket policy: {e}")

print(f"\n🎉 Bucket setup complete!")
print(f"📦 Bucket name: {bucket_name}")
print(f"📍 Region: {region}")
print(f"📁 Upload images to: s3://{bucket_name}/clinics/YOUR_USER_ID/")