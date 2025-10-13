# Generated migration to remove old constraint

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('payouts', '0008_update_payout_constraint'),
    ]

    operations = [
        # Remove the old constraint directly with SQL
        migrations.RunSQL(
            "ALTER TABLE payouts_payoutmodel DROP CONSTRAINT IF EXISTS one_payout_per_client_cycle;",
            reverse_sql="-- No reverse operation needed"
        ),
    ]