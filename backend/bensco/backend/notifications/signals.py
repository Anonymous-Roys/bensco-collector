from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Notification
from clients.models import ClientModel as Client
from contributions.models import ContributionModel as Contribution
from payouts.models import PayoutModel as Payout

User = get_user_model()

@receiver(post_save, sender=Client)
def create_client_notification(sender, instance, created, **kwargs):
    """Create notification when a new client is registered"""
    if created:
        # Get all admin users
        admin_users = User.objects.filter(role='admin')
        
        for admin_user in admin_users:
            Notification.create_client_notification(
                user=admin_user,
                client_name=instance.name,
                amount=instance.amount_daily
            )

@receiver(post_save, sender=Contribution)
def create_collection_notification(sender, instance, created, **kwargs):
    """Create notification when a new collection is recorded"""
    if created:
        # Get all admin users
        admin_users = User.objects.filter(role='admin')
        
        # Get collector name (assuming there's a worker field or similar)
        collector_name = getattr(instance, 'collector_name', 'Unknown Collector')
        client_name = getattr(instance, 'client_name', 'Unknown Client')
        
        for admin_user in admin_users:
            Notification.create_collection_notification(
                user=admin_user,
                collector_name=collector_name,
                amount=instance.amount,
                client_name=client_name
            )

@receiver(post_save, sender=Payout)
def create_payout_notification(sender, instance, created, **kwargs):
    """Create notification when a payout is created or status changes"""
    if created:
        # Get all admin users
        admin_users = User.objects.filter(role='admin')
        
        # Count pending payouts
        pending_payouts = Payout.objects.filter(status='pending')
        total_amount = sum(payout.amount for payout in pending_payouts)
        
        for admin_user in admin_users:
            Notification.create_payout_notification(
                user=admin_user,
                count=pending_payouts.count(),
                total_amount=total_amount
            )

@receiver(post_save, sender=User)
def create_worker_notification(sender, instance, created, **kwargs):
    """Create notification when a new worker is created"""
    if created and instance.role == 'collector':
        # Get all admin users
        admin_users = User.objects.filter(role='admin')
        
        for admin_user in admin_users:
            Notification.create_worker_notification(
                user=admin_user,
                worker_name=instance.username,
                message=f'{instance.username} has been successfully onboarded and assigned to {getattr(instance, "assigned_zone", "Unknown Zone")}',
                type='info'
            )
