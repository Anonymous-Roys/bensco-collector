# Generated manually for adding collector fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='usermodel',
            name='phone_number',
            field=models.CharField(blank=True, help_text='Phone number for the collector', max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='usermodel',
            name='assigned_zone',
            field=models.CharField(blank=True, help_text='Zone assigned to the collector', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='usermodel',
            name='route_info',
            field=models.TextField(blank=True, help_text='Additional route information for the collector', null=True),
        ),
    ]
