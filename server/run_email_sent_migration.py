#!/usr/bin/env python3
"""
Database migration script to add email_sent_at field to patient_diagnosis table
Run this script to update the database schema with the required field for tracking sent emails
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Run the database migration to add email_sent_at field"""
    
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_service_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables")
        sys.exit(1)
    
    try:
        # Create Supabase client with service key (admin access)
        supabase: Client = create_client(supabase_url, supabase_service_key)
        
        print("🔄 Running email_sent_at migration...")
        
        # Read the migration SQL file
        migration_file = os.path.join(os.path.dirname(__file__), 'migrations', 'add_email_sent_at_column.sql')
        
        if not os.path.exists(migration_file):
            print(f"❌ Error: Migration file not found: {migration_file}")
            sys.exit(1)
        
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        # Execute the migration
        print("📝 Executing SQL migration...")
        
        # For Supabase, we need to execute this via the SQL Editor or use postgrest
        # Since we can't execute raw SQL via the Python client directly,
        # we'll print the SQL for manual execution
        
        print("\n" + "="*60)
        print("⚠️  MANUAL STEP REQUIRED:")
        print("="*60)
        print("\nPlease run the following SQL in your Supabase SQL Editor:")
        print("\n" + "-"*60)
        print(migration_sql)
        print("-"*60)
        
        print("\nTo run this SQL:")
        print("1. Go to your Supabase dashboard")
        print("2. Navigate to the SQL Editor")
        print("3. Paste the SQL above")
        print("4. Click 'Run'")
        print("\nThe migration will:")
        print("   • Add 'email_sent_at' timestamp field to patient_diagnosis table")
        print("   • Create an index for faster email status queries")
        print("   • Add documentation comment to the column")
        
    except Exception as e:
        print(f"❌ Script failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print("🚀 Starting Email Sent Timestamp Migration")
    print("=" * 60)
    run_migration()
    print("=" * 60)
    print("📋 Next: Run the SQL in Supabase SQL Editor")

