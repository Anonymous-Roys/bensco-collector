from rest_framework import serializers
from .models import ClientModel
from core.utils import generate_unique_code
from .models import AddressModel

class AddressModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = AddressModel
        fields = ['id', 'label', 'region', 'created_at']
        # , "address"
        read_only_fields = ['id', 'created_at']
class ClientModelSerializer(serializers.ModelSerializer):
    collector_username = serializers.CharField(source='collector.username', read_only=True)

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
            'created_at',
            'address',
        ]
        read_only_fields = ['id', 'unique_code', 'collector_username', 'created_at']

    def create(self, validated_data):
        if not validated_data.get('unique_code'):
            validated_data['unique_code'] = generate_unique_code(ClientModel, 'CLI')
        return super().create(validated_data)
