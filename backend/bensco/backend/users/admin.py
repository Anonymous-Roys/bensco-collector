from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import UserModel, AuthLogModel, PasswordResetRequestModel

@admin.register(UserModel)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'unique_code', 'is_active', 'created_at')
    list_filter = ('role', 'is_active', 'created_at')
    search_fields = ('username', 'email', 'unique_code', 'full_name')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('full_name', 'email', 'phone_number')}),
        ('Role & Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser')}),
        ('Collector Info', {'fields': ('assigned_zone', 'route_info')}),
        ('System', {'fields': ('unique_code', 'must_change_password')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'full_name', 'phone_number', 'assigned_zone'),
        }),
    )

@admin.register(PasswordResetRequestModel)
class PasswordResetRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'created_at', 'resolved_by')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'user__email')

@admin.register(AuthLogModel)
class AuthLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'ip_address', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('user__username', 'ip_address')
    readonly_fields = ('user', 'action', 'ip_address', 'user_agent', 'timestamp')
