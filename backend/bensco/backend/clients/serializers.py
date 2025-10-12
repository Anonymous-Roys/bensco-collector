from rest_framework import serializers
from .models import ClientModel, AddressModel
from core.utils import generate_unique_code
from users.models import UserModel

class AddressModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = AddressModel
        fields = ['id', 'label', 'region', 'created_at']
        read_only_fields = ['id', 'created_at']

class CollectorSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserModel
        fields = ['id', 'username', 'email', 'assigned_zone', 'phone_number']

class ClientModelSerializer(serializers.ModelSerializer):
    collector_username = serializers.CharField(source='collector.username', read_only=True)
    collector_email = serializers.CharField(source='collector.email', read_only=True)
    collector_zone = serializers.CharField(source='collector.assigned_zone', read_only=True)
    address_label = serializers.CharField(source='address.label', read_only=True)
    address_region = serializers.CharField(source='address.region', read_only=True)
    total_net_savings = serializers.SerializerMethodField()
    available_balance = serializers.SerializerMethodField()

    class Meta:
        model = ClientModel
        fields = [
            'id',
            'name',
            'phone_number',
            'amount_daily',
            'is_fixed',
            'start_date',
            'unique_code',
            'collector',
            'collector_username',
            'collector_email',
            'collector_zone',
            'created_at',
            'address',
            'address_label',
            'address_region',
            'dob',
            'next_of_kin',
            'total_net_savings',
            'available_balance',
        ]
        read_only_fields = ['id', 'unique_code', 'collector_username', 'collector_email', 'collector_zone', 'created_at', 'address_label', 'address_region', 'total_net_savings', 'available_balance']

    def get_total_net_savings(self, obj):
        return str(obj.get_total_net_savings())
    
    def get_available_balance(self, obj):
        return str(obj.get_available_balance())
    
    def create(self, validated_data):
        if not validated_data.get('unique_code'):
            validated_data['unique_code'] = generate_unique_code(ClientModel, 'CLI')
        return super().create(validated_data)

class ClientCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientModel
        fields = [
            'name',
            'phone_number',
            'amount_daily',
            'is_fixed',
            'start_date',
            'collector',
            'address',
            'dob',
            'next_of_kin',
        ]

    def create(self, validated_data):
        validated_data['unique_code'] = generate_unique_code(ClientModel, 'CLI')
        return super().create(validated_data)

class ClientUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientModel
        fields = [
            'name',
            'phone_number',
            'amount_daily',
            'is_fixed',
            'start_date',
            'collector',
            'address',
            'dob',
            'next_of_kin',
        ]
