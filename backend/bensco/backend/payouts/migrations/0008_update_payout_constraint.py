# Generated migration to update payout constraint

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payouts', '0007_remove_old_amount_field'),
    ]

    operations = [
        # Remove the old constraint
        migrations.RemoveConstraint(
            model_name='payoutmodel',
            name='one_payout_per_client_cycle',
        ),
        # Add the new constraint that only prevents multiple pending/approved payouts
        migrations.AddConstraint(
            model_name='payoutmodel',
            constraint=models.UniqueConstraint(
                fields=['client', 'cycle'], 
                condition=models.Q(payout_type='client_specific') & models.Q(status__in=['pending', 'approved']),
                name='one_pending_payout_per_client_cycle'
            ),
        ),
    ]