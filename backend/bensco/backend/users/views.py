from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer, UserModelSerializer, CreateUserSerializer, UpdateUserSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions  import IsAuthenticated
from django.db.models import Q
from users.models import UserModel
from .models import PasswordResetRequestModel
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

@api_view(['POST'])
def collector_password_reset_request_view(request):
    identifier = request.data.get('email_or_username')
    
    try:
        user = UserModel.objects.get(Q(email=identifier) | Q(username=identifier))

        if user.role != 'collector':
            return Response({'detail': 'Only collectors can request password reset through this route.'}, status=403)

        # Create request
        PasswordResetRequestModel.objects.create(user=user)

        # Notify admins
        admins = UserModel.objects.filter(role='admin', is_active=True)
        admin_emails = [admin.email for admin in admins if admin.email]
        print(admin_emails)

        if admin_emails:
            send_mail(
                subject='Password Reset Request from Collector',
                message=f'Collector {user.username} ({user.email}) has requested a password reset.\nPlease log in to resolve.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=admin_emails,
                fail_silently=True,
            )

        return Response({'detail': 'Request submitted. Admin will respond soon.'}, status=200)


    except UserModel.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_users(request):
    users = UserModel.objects.all()

    serialized = UserModelSerializer(users, many=True)

    
    return Response(data=serialized.data, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_user(request):
    if request.user.role != 'admin':
        return Response({'detail': 'Only admins can create users.'}, status=status.HTTP_403_FORBIDDEN)

    # Validate required fields
    required_fields = ['username', 'email', 'full_name']
    for field in required_fields:
        if not request.data.get(field):
            return Response({'detail': f'{field} is required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate secure password if not provided
    from core.utils import generate_secure_password
    data = request.data.copy()
    if not data.get('password'):
        data['password'] = generate_secure_password()
    
    # Set default role to collector if not provided
    if not data.get('role'):
        data['role'] = 'collector'
    
    serializer = CreateUserSerializer(data=data)
    if serializer.is_valid():
        try:
            # Store password before hashing for email
            temp_password = data.get('password')
            user = serializer.save()
            
            # Send credentials email only if email exists
            if user.email:
                subject = 'Welcome to Bensco Susu - Your Account is Ready!'
                html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to Bensco Susu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0; letter-spacing: 2px;">BENSCO</h1>
            <p style="color: #fecaca; font-size: 14px; font-weight: 600; margin: 4px 0 0 0;">SUSU LIMITED</p>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">Welcome, {user.full_name or user.username}!</h2>
            <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">Your collector account has been successfully created.</p>
            <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin: 30px 0; border-left: 4px solid #dc2626;">
                <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">🔑 Your Login Credentials</h3>
                <div style="margin-bottom: 12px;"><strong>Username:</strong> {user.username}</div>
                <div style="margin-bottom: 12px;"><strong>Email:</strong> {user.email}</div>
                <div style="margin-bottom: 12px;"><strong>Employee ID:</strong> {user.unique_code}</div>
                <div><strong>Password:</strong> {temp_password}</div>
            </div>
            <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">🔒 Please change your password after first login.</p>
            </div>
        </div>
        <div style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2024 Bensco Susu Limited</p>
        </div>
    </div>
</body>
</html>
                """
                
                try:
                    from django.core.mail import EmailMultiAlternatives
                    msg = EmailMultiAlternatives(
                        subject=subject,
                        body=f"Welcome {user.full_name or user.username}! Username: {user.username}, Password: {temp_password}",
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        to=[user.email]
                    )
                    msg.attach_alternative(html_message, "text/html")
                    msg.send()
                except Exception as e:
                    print(f"Error sending credentials email: {e}")
                    # Don't fail user creation if email fails
            
            return Response({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'unique_code': user.unique_code,
                'full_name': user.full_name,
                'phone_number': user.phone_number,
                'assigned_zone': user.assigned_zone,
                'route_info': user.route_info,
                'is_active': user.is_active,
                'created_at': user.created_at,
                'updated_at': user.updated_at,
                'message': 'User created successfully. Credentials sent via email.' if user.email else 'User created successfully.'
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'detail': f'Error creating user: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_user(request, user_id):
    if request.user.role != 'admin':
        return Response({'detail': 'Only admins can update users.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = get_object_or_404(UserModel, id=user_id)
        serializer = UpdateUserSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user(request, user_id):
    if request.user.role != 'admin':
        return Response({'detail': 'Only admins can delete users.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = get_object_or_404(UserModel, id=user_id)
        
        # Prevent admin from deleting themselves
        if user.id == request.user.id:
            return Response({'detail': 'Cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Simple deletion - let Django handle cascading
        user.delete()
        
        return Response({'detail': 'User deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
    
    except Exception as e:
        return Response({'detail': f'Error deleting user: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_detail(request, user_id):
    if request.user.role != 'admin':
        return Response({'detail': 'Only admins can view user details.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = get_object_or_404(UserModel, id=user_id)
        serializer = UserModelSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_worker_stats(request):
    """Get statistics about workers/collectors"""
    if request.user.role != 'admin':
        return Response({'detail': 'Not authorized'}, status=403)
    
    total_workers = UserModel.objects.filter(role='collector').count()
    active_workers = UserModel.objects.filter(role='collector', is_active=True).count()
    
    return Response({
        'total_workers': total_workers,
        'active_workers': active_workers
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_user_deletion(request, user_id):
    """Check if a user can be safely deleted"""
    if request.user.role != 'admin':
        return Response({'detail': 'Only admins can check user deletion.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user = get_object_or_404(UserModel, id=user_id)
        
        # Check related data
        issues = []
        
        # Check clients
        try:
            client_count = user.clients.count() if hasattr(user, 'clients') else 0
            if client_count > 0:
                issues.append(f'{client_count} client(s) assigned')
        except Exception:
            pass
        
        # Check contributions
        try:
            from contributions.models import ContributionModel
            contribution_count = ContributionModel.objects.filter(collector=user).count()
            if contribution_count > 0:
                issues.append(f'{contribution_count} contribution(s) recorded')
        except Exception:
            pass
        
        can_delete = len(issues) == 0
        
        return Response({
            'can_delete': can_delete,
            'issues': issues,
            'message': 'User can be safely deleted' if can_delete else 'User has related data that must be handled first'
        })
        
    except Exception as e:
        return Response({'detail': f'Error checking user: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request, user_id):
    """Change user password"""
    try:
        user = get_object_or_404(UserModel, id=user_id)
        
        # Users can only change their own password
        if user.id != request.user.id:
            return Response({'detail': 'You can only change your own password.'}, status=status.HTTP_403_FORBIDDEN)
        
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return Response({'detail': 'Both current and new passwords are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check current password
        if not user.check_password(current_password):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Set new password
        user.set_password(new_password)
        user.must_change_password = False
        user.save()
        
        return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'detail': f'Error changing password: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)