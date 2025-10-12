from django.core.management import call_command
from django.db import connection, transaction

def run():
    print("🧹 Cleaning up duplicate index if it exists...")

    with connection.cursor() as cursor:
        # Drop the problematic index if it exists
        cursor.execute("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = 'savings_sav_client__538ebf_idx'
                ) THEN
                    EXECUTE 'DROP INDEX IF EXISTS savings_sav_client__538ebf_idx;';
                END IF;
            END
            $$;
        """)
        transaction.commit()

        print("✅ Index cleaned up if it existed.")

    print("🚀 Now running migrations in correct order...")
    call_command("migrate", "clients")
    call_command("migrate", "savings")
    call_command("migrate")
    print("✅ All migrations applied successfully.")
