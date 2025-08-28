from django.contrib.auth.models import AbstractUser
from django.db import models
from core.utils import generate_unique_code, generate_hex_id
import uuid


def generate_user_code(role):
    prefix = {
        'admin': 'BSL-ADM-',
        'collector': 'BSL-COL-',
    }.get(role, 'BSL-UNK-')

    from users.models import UserModel  # local import to avoid circular import
    while True:
        hex_part = generate_hex_id()
        code = f"{prefix}{hex_part}"
        if not UserModel.objects.filter(unique_code=code).exists():
            return code
class Roles(models.TextChoices):
    ADMIN = 'admin', 'Admin'
    COLLECTOR = 'collector', 'Collector'

class UserModel(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    unique_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.COLLECTOR)
    must_change_password = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    email = models.EmailField(blank=True, null=True, unique=True)
    

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    #  Default username-based auth
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']  # Still required when creating superuser

    def __str__(self):
        return f"{self.username} ({self.role})"
    
    def save(self, *args, **kwargs):
        if not self.unique_code and self.role:
            prefix = {
                'admin': 'ADM',
                'collector': 'COL'
            }.get(self.role, 'UNK')
            self.unique_code = generate_unique_code(UserModel, prefix)
        super().save(*args, **kwargs)

class AuthLogModel(models.Model):
    ACTION_CHOICES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('password_reset', 'Password Reset'),
        ('password_change', 'Password Change'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('UserModel', on_delete=models.CASCADE)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.action}"


    def save(self, *args, **kwargs):
        if not self.unique_code and self.role:
            self.unique_code = generate_user_code(self.role)
        super().save(*args, **kwargs)


class PasswordResetRequestModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(UserModel, on_delete=models.CASCADE, related_name='reset_requests')
    status = models.CharField(max_length=10, choices=[('pending', 'Pending'), ('resolved', 'Resolved')], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_by = models.ForeignKey(UserModel, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_passwords')

    def __str__(self):
        return f"Reset request for {self.user.username} - {self.status}"

