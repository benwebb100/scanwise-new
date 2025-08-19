import subprocess
import os

# -------- CONFIG --------
# Fill in your source and target Supabase database URLs
SOURCE_DB_URL = "postgresql://postgres.tnkxehgocxoondivwrgs:nwNEi7TaeEo1PhBc@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
TARGET_DB_URL = "postgresql://postgres.nposyguwpvvqfzpdjkbz:yOBrF3J90LCwB94Q@aws-0-us-east-2.pooler.supabase.com:6543/postgres"

# Files for temporary dumps
SCHEMA_FILE = "schema.sql"
DATA_FILE = "data.sql"
USERS_FILE = "users.sql"
# ------------------------

def run_cmd(cmd):
    """Run a shell command and stream output"""
    print(f"➡ Running: {' '.join(cmd)}")
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in process.stdout:
        print(line, end="")
    process.wait()
    if process.returncode != 0:
        raise Exception(f"Command failed: {' '.join(cmd)}")

def export_schema():
    run_cmd([
        "pg_dump", "--schema-only", "--no-owner", "--no-acl",
        f"--dbname={SOURCE_DB_URL}", "-f", SCHEMA_FILE
    ])

def export_data():
    run_cmd([
        "pg_dump", "--data-only", "--inserts", "--no-owner", "--no-acl",
        f"--dbname={SOURCE_DB_URL}", "-f", DATA_FILE
    ])

def export_users():
    run_cmd([
        "pg_dump", "--data-only", "--inserts", "-t", "auth.users",
        f"--dbname={SOURCE_DB_URL}", "-f", USERS_FILE
    ])

def import_file(sql_file):
    run_cmd([
        "psql", TARGET_DB_URL, "-f", sql_file
    ])

if __name__ == "__main__":
    print("🚀 Starting Supabase migration (no Docker)...")

    # 1. Export schema & data
    export_schema()
    export_data()
    export_users()

    # 2. Import into target
    import_file(SCHEMA_FILE)
    import_file(DATA_FILE)
    import_file(USERS_FILE)

    print("✅ Migration complete! Schema, data, and users imported.")
    print("⚠ Reminder: Auth settings, storage buckets, and email templates must be reconfigured manually.")
