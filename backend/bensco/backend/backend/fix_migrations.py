from django.core.management import call_command
from django.db import connection

# Temporary fix to reset migration order on Render
def run():
    with connection.cursor() as cursor:
        # Remove the incorrect entry that breaks dependencies
        cursor.execute(
            "DELETE FROM django_migrations WHERE app='savings' AND name='0003_alter_savingscyclemodel_options_and_more';"
        )
    # Re-apply migrations in correct order
    call_command("migrate", "clients")
    call_command("migrate", "savings")
    call_command("migrate")
