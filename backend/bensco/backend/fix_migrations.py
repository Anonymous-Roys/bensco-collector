#!/usr/bin/env python
"""
Script to fix database migrations and ensure all tables exist
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.core.management import execute_from_command_line
from django.db import connection

def check_table_exists(table_name):
    """Check if a table exists in the database"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = %s
            );
        """, [table_name])
        return cursor.fetchone()[0]

def main():
    print("🔧 Fixing database migrations...")
    
    # Run migrations
    try:
        print("📦 Running migrations...")
        execute_from_command_line(['manage.py', 'migrate'])
        print("✅ Migrations completed successfully")
    except Exception as e:
        print(f"❌ Migration error: {e}")
        return
    
    # Check critical tables
    critical_tables = [
        'users_usermodel',
        'notifications_notification',
        'clients_clientmodel',
        'clients_addressmodel'
    ]
    
    print("\n🔍 Checking critical tables...")
    for table in critical_tables:
        exists = check_table_exists(table)
        status = "✅" if exists else "❌"
        print(f"{status} {table}: {'EXISTS' if exists else 'MISSING'}")
    
    print("\n🎉 Database check completed!")

if __name__ == '__main__':
    main()