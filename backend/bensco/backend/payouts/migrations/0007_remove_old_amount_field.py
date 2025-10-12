# Generated migration to remove old amount field if it exists

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payouts', '0006_alter_payoutmodel_cycle'),
    ]

    operations = [
        # This will safely remove the 'amount' field if it exists
        # If it doesn't exist, Django will ignore this operation
        migrations.RunSQL(
            "ALTER TABLE payouts_payoutmodel DROP COLUMN IF EXISTS amount;",
            reverse_sql="-- No reverse operation needed"
        ),
    ]