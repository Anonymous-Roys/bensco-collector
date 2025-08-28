from rest_framework import serializers
from .models import UserModel
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
class UserModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserModel
        fields = [
            'id',
            'username',
            'email',
            'role',
            'unique_code',
            'must_change_password',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'unique_code', 'created_at', 'updated_at']
    
    def validate(self, attrs):
        data = super().validate(attrs)
        refresh = self.get_token(self.user)

        # Add custom claims
        refresh["role"] = self.user.role
        refresh["username"] = self.user.username
        refresh["email"] = self.user.email
        refresh["unique_code"] = self.user.unique_code
        refresh["must_change_password"] = self.user.must_change_password

        data["refresh"] = str(refresh)
        data["access"] = str(refresh.access_token)
        return data

class CreateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserModel
        fields = ['username', 'password', 'email', "role"]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        user = UserModel.objects.create_user(**validated_data)
        return user

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