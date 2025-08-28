# models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator
from django.utils import timezone
import uuid

class FieldWorker(AbstractUser):
    """
    Custom User model for Field Workers with field-specific attributes
    """
    # Override default username to use email
    username = None
    email = models.EmailField(unique=True, db_index=True)
    
    # Personal Information
    worker_id = models.CharField(
        max_length=20, 
        unique=True, 
        db_index=True,
        help_text="Unique identifier for the field worker"
    )
    
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    phone_number = models.CharField(
        validators=[phone_regex], 
        max_length=17, 
        blank=True,
        help_text="Primary contact number"
    )
    
    # Location & Assignment
    assigned_region = models.CharField(
        max_length=100,
        help_text="Geographic region or area assigned to worker"
    )
    
    assigned_district = models.CharField(
        max_length=100,
        blank=True,
        help_text="Specific district within the region"
    )
    
    # Field Worker Specific Details
    EMPLOYMENT_TYPES = [
        ('FULL_TIME', 'Full Time'),
        ('PART_TIME', 'Part Time'),
        ('CONTRACT', 'Contract'),
        ('VOLUNTEER', 'Volunteer'),
    ]
    
    employment_type = models.CharField(
        max_length=20,
        choices=EMPLOYMENT_TYPES,
        default='FULL_TIME'
    )
    
    supervisor = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supervised_workers',
        help_text="Direct supervisor for this field worker"
    )
    
    # Access & Security
    is_field_active = models.BooleanField(
        default=True,
        help_text="Whether worker is actively working in the field"
    )
    
    last_field_activity = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time worker submitted field data"
    )
    
    # Authentication & Device Management
    max_devices = models.PositiveIntegerField(
        default=2,
        help_text="Maximum number of devices allowed for this worker"
    )
    
    # Permissions & Capabilities
    can_work_offline = models.BooleanField(
        default=True,
        help_text="Whether worker is allowed to work offline"
    )
    
    can_edit_submissions = models.BooleanField(
        default=False,
        help_text="Whether worker can edit their own submissions"
    )
    
    can_view_others_data = models.BooleanField(
        default=False,
        help_text="Whether worker can view data from other workers"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_workers',
        help_text="Admin who created this worker account"
    )
    
    # Use email as the unique identifier
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['worker_id', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'field_workers'
        ordering = ['worker_id']
        indexes = [
            models.Index(fields=['worker_id']),
            models.Index(fields=['email']),
            models.Index(fields=['assigned_region']),
            models.Index(fields=['is_field_active']),
        ]
    
    def __str__(self):
        return f"{self.worker_id} - {self.get_full_name()}"
    
    def save(self, *args, **kwargs):
        # Auto-generate worker_id if not provided
        if not self.worker_id:
            self.worker_id = self.generate_worker_id()
        super().save(*args, **kwargs)
    
    def generate_worker_id(self):
        """Generate unique worker ID"""
        prefix = self.assigned_region[:3].upper() if self.assigned_region else "FW"
        timestamp = timezone.now().strftime("%y%m")
        counter = FieldWorker.objects.filter(
            worker_id__startswith=f"{prefix}{timestamp}"
        ).count() + 1
        return f"{prefix}{timestamp}{counter:03d}"
    
    @property
    def is_supervisor(self):
        """Check if this worker supervises others"""
        return self.supervised_workers.exists()
    
    @property
    def active_devices_count(self):
        """Count of currently registered devices"""
        return self.devices.filter(is_active=True).count()
    
    @property
    def can_add_device(self):
        """Check if worker can register another device"""
        return self.active_devices_count < self.max_devices
    
    def get_full_address(self):
        """Get complete address string"""
        parts = [self.assigned_district, self.assigned_region]
        return ", ".join(filter(None, parts))


class FieldWorkerDevice(models.Model):
    """
    Model to track devices used by field workers for security
    """
    worker = models.ForeignKey(
        FieldWorker,
        on_delete=models.CASCADE,
        related_name='devices'
    )
    
    device_id = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique device identifier"
    )
    
    device_name = models.CharField(
        max_length=100,
        help_text="Human readable device name"
    )
    
    device_type = models.CharField(
        max_length=50,
        choices=[
            ('ANDROID', 'Android'),
            ('IOS', 'iOS'),
            ('OTHER', 'Other'),
        ],
        default='ANDROID'
    )
    
    is_active = models.BooleanField(default=True)
    
    # Security tracking
    first_login = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)
    login_count = models.PositiveIntegerField(default=0)
    
    # Location tracking
    last_known_location = models.JSONField(
        null=True,
        blank=True,
        help_text="Last known GPS coordinates"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(
        FieldWorker,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_devices',
        help_text="Admin who approved this device"
    )
    
    class Meta:
        db_table = 'field_worker_devices'
        unique_together = ['worker', 'device_id']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.worker.worker_id} - {self.device_name}"


class FieldWorkerSession(models.Model):
    """
    Model to track field worker login sessions for security monitoring
    """
    worker = models.ForeignKey(
        FieldWorker,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    
    device = models.ForeignKey(
        FieldWorkerDevice,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    
    session_id = models.UUIDField(default=uuid.uuid4, unique=True)
    
    # Session details
    login_time = models.DateTimeField(auto_now_add=True)
    logout_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Location & Network info
    login_location = models.JSONField(
        null=True,
        blank=True,
        help_text="GPS coordinates at login"
    )
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Security flags
    is_suspicious = models.BooleanField(
        default=False,
        help_text="Flagged for suspicious activity"
    )
    
    failed_attempts = models.PositiveIntegerField(
        default=0,
        help_text="Number of failed login attempts"
    )
    
    class Meta:
        db_table = 'field_worker_sessions'
        ordering = ['-login_time']
        indexes = [
            models.Index(fields=['worker', 'is_active']),
            models.Index(fields=['login_time']),
        ]
    
    def __str__(self):
        return f"{self.worker.worker_id} - {self.login_time}"
    
    @property
    def duration(self):
        """Calculate session duration"""
        if self.logout_time:
            return self.logout_time - self.login_time
        return timezone.now() - self.login_time


# Admin configuration for better management
from django.contrib import admin

@admin.register(FieldWorker)
class FieldWorkerAdmin(admin.ModelAdmin):
    list_display = [
        'worker_id', 'email', 'get_full_name', 'assigned_region', 
        'employment_type', 'is_field_active', 'last_field_activity'
    ]
    list_filter = [
        'employment_type', 'assigned_region', 'is_field_active', 
        'can_work_offline', 'created_at'
    ]
    search_fields = ['worker_id', 'email', 'first_name', 'last_name']
    readonly_fields = ['created_at', 'updated_at', 'last_login']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('worker_id', 'email', 'first_name', 'last_name', 'phone_number')
        }),
        ('Assignment', {
            'fields': ('assigned_region', 'assigned_district', 'employment_type', 'supervisor')
        }),
        ('Permissions', {
            'fields': ('is_field_active', 'can_work_offline', 'can_edit_submissions', 'can_view_others_data')
        }),
        ('Security', {
            'fields': ('max_devices', 'last_field_activity')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )

@admin.register(FieldWorkerDevice)
class FieldWorkerDeviceAdmin(admin.ModelAdmin):
    list_display = ['worker', 'device_name', 'device_type', 'is_active', 'last_login', 'login_count']
    list_filter = ['device_type', 'is_active', 'created_at']
    search_fields = ['worker__worker_id', 'device_name', 'device_id']

@admin.register(FieldWorkerSession)
class FieldWorkerSessionAdmin(admin.ModelAdmin):
    list_display = ['worker', 'device', 'login_time', 'is_active', 'is_suspicious']
    list_filter = ['is_active', 'is_suspicious', 'login_time']
    search_fields = ['worker__worker_id', 'device__device_name']
    readonly_fields = ['session_id', 'login_time', 'duration']