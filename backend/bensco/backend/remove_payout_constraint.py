#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection

def remove_payout_constraint():
    with connection.cursor() as cursor:
        try:
            # Remove the old constraint
            cursor.execute("ALTER TABLE payouts_payoutmodel DROP CONSTRAINT IF EXISTS one_payout_per_client_cycle;")
            print("✅ Successfully removed old payout constraint")
            
            # Check if the new constraint exists, if not add it
            cursor.execute("""
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'payouts_payoutmodel' 
                AND constraint_name = 'one_pending_payout_per_client_cycle';
            """)
            
            if not cursor.fetchone():
                cursor.execute("""
                    ALTER TABLE payouts_payoutmodel 
                    ADD CONSTRAINT one_pending_payout_per_client_cycle 
                    UNIQUE (client_id, cycle_id) 
                    WHERE (payout_type = 'client_specific' AND status IN ('pending', 'approved'));
                """)
                print("✅ Successfully added new payout constraint")
            else:
                print("✅ New constraint already exists")
                
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    remove_payout_constraint()