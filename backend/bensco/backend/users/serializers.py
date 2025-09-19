from rest_framework import serializers
from .models import UserModel
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UserModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserModel
        fields = [
            'id',
            'username',
            'full_name',
            'email',
            'role',
            'unique_code',
            'must_change_password',
            'is_active',
            'phone_number',
            'assigned_zone',
            'route_info',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'unique_code', 'created_at', 'updated_at']

class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = UserModel
        fields = ['username', 'full_name', 'password', 'email', 'role', 'phone_number', 'assigned_zone', 'route_info']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = UserModel(**validated_data)
        user.set_password(password)
        user.save()
        return user

class UpdateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserModel
        fields = ['username', 'full_name', 'email', 'role', 'phone_number', 'assigned_zone', 'route_info', 'is_active']
        read_only_fields = ['id', 'unique_code', 'created_at', 'updated_at']
    
    def validate_email(self, value):
        if value and UserModel.objects.filter(email=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_username(self, value):
        if value and UserModel.objects.filter(username=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Custom claims
        token['username'] = user.username
        token['role'] = user.role
        token['unique_code'] = user.unique_code
        token['must_change_password'] = user.must_change_password
        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        user = self.user
        data['user'] = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'unique_code': user.unique_code,
            'must_change_password': user.must_change_password,
        }

        return data