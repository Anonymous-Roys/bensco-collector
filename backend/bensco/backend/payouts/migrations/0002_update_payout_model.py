# Generated migration for updated payout model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payouts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='payoutmodel',
            name='requested_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='payoutmodel',
            name='available_balance',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='payoutmodel',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('paid', 'Paid'),
                    ('auto_rejected', 'Auto Rejected')
                ],
                default='pending',
                max_length=20
            ),
        ),
        migrations.AlterField(
            model_name='payoutmodel',
            name='payout_type',
            field=models.CharField(
                choices=[
                    ('client_specific', 'Client Specific'),
                    ('bulk', 'Bulk Payout')
                ],
                default='client_specific',
                max_length=20
            ),
        ),
    ]