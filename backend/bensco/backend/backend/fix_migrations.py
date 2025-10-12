from django.core.management import call_command
from django.db import connection, transaction

def run():
    print("🧹 Checking for duplicate indexes in Postgres...")

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname LIKE 'savings_sav_%_idx';
        """)
        indexes = [row[0] for row in cursor.fetchall()]

        if not indexes:
            print("✅ No savings-related indexes found.")
        else:
            for index in indexes:
                print(f"⚙️ Dropping existing index: {index}")
                cursor.execute(f'DROP INDEX IF EXISTS "{index}";')

        transaction.commit()

    print("✅ All duplicate indexes cleaned.")

    print("🚀 Running migrations in correct order...")
    call_command("migrate", "clients")
    call_command("migrate", "savings")
    call_command("migrate")
    print("✅ All migrations applied successfully.")
