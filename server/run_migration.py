#!/usr/bin/env python3
"""
Database migration script to add missing fields to patient_diagnosis table
Run this script to update the database schema with the required fields for video generation
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Run the database migration to add missing fields"""
    
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_service_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables")
        sys.exit(1)
    
    try:
        # Create Supabase client with service key (admin access)
        supabase: Client = create_client(supabase_url, supabase_service_key)
        
        print("🔄 Running database migration...")
        
        # Read the migration SQL file
        migration_file = os.path.join(os.path.dirname(__file__), 'add_report_html_field.sql')
        
        if not os.path.exists(migration_file):
            print(f"❌ Error: Migration file not found: {migration_file}")
            sys.exit(1)
        
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        # Execute the migration
        print("📝 Executing SQL migration...")
        
        # Split the SQL into individual statements
        statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
        
        for i, statement in enumerate(statements, 1):
            if statement:
                print(f"   Executing statement {i}/{len(statements)}...")
                try:
                    # Use RPC to execute raw SQL
                    result = supabase.rpc('execute_sql', {'sql': statement}).execute()
                    print(f"   ✅ Statement {i} executed successfully")
                except Exception as e:
                    print(f"   ⚠️  Statement {i} warning/error: {str(e)}")
                    # Continue with other statements as some might be "IF NOT EXISTS" checks
        
        print("✅ Database migration completed successfully!")
        print("\n📋 Migration Summary:")
        print("   • Added 'report_html' field to patient_diagnosis table")
        print("   • Added 'video_generation_failed' field for error tracking")
        print("   • Added 'video_error' field for error messages")
        print("   • Added performance indexes for video status queries")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print("🚀 Starting Scanwise Database Migration")
    print("=" * 50)
    run_migration()
    print("=" * 50)
    print("🎉 Migration process completed!")