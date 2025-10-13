# Emergency fix for payout constraint

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('payouts', '0009_remove_old_constraint'),
    ]

    operations = [
        # Force remove the old constraint
        migrations.RunSQL(
            """
            DO $$ 
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                          WHERE constraint_name = 'one_payout_per_client_cycle' 
                          AND table_name = 'payouts_payoutmodel') THEN
                    ALTER TABLE payouts_payoutmodel DROP CONSTRAINT one_payout_per_client_cycle;
                END IF;
            END $$;
            """,
            reverse_sql="-- No reverse operation"
        ),
    ]