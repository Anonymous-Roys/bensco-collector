from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer, UserModelSerializer, CreateUserSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions  import IsAuthenticated
from django.db.models import Q
from users.models import UserModel
from .models import PasswordResetRequestModel
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status

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

    serializer = CreateUserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'unique_code': user.unique_code
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)