import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('success', 'Success'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', db_constraint=False)
    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=10, choices=NOTIFICATION_TYPES, default='info')
    read = models.BooleanField(default=False)
    action_url = models.URLField(blank=True, null=True)
    action_text = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'read']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['type', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.user.username}"
    
    def mark_as_read(self):
        self.read = True
        self.save(update_fields=['read', 'updated_at'])
    
    @classmethod
    def create_notification(cls, user, title, message, type='info', action_url=None, action_text=None):
        """Helper method to create notifications"""
        return cls.objects.create(
            user=user,
            title=title,
            message=message,
            type=type,
            action_url=action_url,
            action_text=action_text
        )
    
    @classmethod
    def create_collection_notification(cls, user, collector_name, amount, client_name):
        """Create notification for new collection"""
        collector_display = collector_name or 'Unknown Collector'
        client_display = client_name or 'Unknown Client'
        return cls.create_notification(
            user=user,
            title='New Collection Recorded',
            message=f'{collector_display} recorded a collection of ₵{amount} from client {client_display}',
            type='success',
            action_url='/admin/collections',
            action_text='View Collection'
        )
    
    @classmethod
    def create_payout_notification(cls, user, count, total_amount):
        """Create notification for pending payouts"""
        return cls.create_notification(
            user=user,
            title='Pending Payout Approval',
            message=f'You have {count} pending payout{"s" if count > 1 else ""} totaling ₵{total_amount} that require approval',
            type='warning',
            action_url='/admin/payouts',
            action_text='Review Payouts'
        )
    
    @classmethod
    def create_client_notification(cls, user, client_name, amount):
        """Create notification for new client registration"""
        return cls.create_notification(
            user=user,
            title='New Client Registered',
            message=f'{client_name} has been registered as a new client with daily amount ₵{amount}',
            type='info',
            action_url='/admin/clients',
            action_text='View Client'
        )
    
    @classmethod
    def create_worker_notification(cls, user, worker_name, message, type='info'):
        """Create notification for worker activities"""
        return cls.create_notification(
            user=user,
            title=f'Worker Update: {worker_name}',
            message=message,
            type=type,
            action_url='/admin/workers',
            action_text='View Worker'
        )
    
    @classmethod
    def create_system_notification(cls, user, title, message, type='info'):
        """Create system notifications"""
        return cls.create_notification(
            user=user,
            title=title,
            message=message,
            type=type
        )
