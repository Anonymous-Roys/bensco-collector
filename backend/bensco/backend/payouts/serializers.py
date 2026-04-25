from rest_framework import serializers
from .models import PayoutModel

class PayoutModelSerializer(serializers.ModelSerializer):
    requested_by_role = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    client_unique_code = serializers.SerializerMethodField()

    class Meta:
        model = PayoutModel
        fields = [
            'id',
            'client',
            'client_name',
            'client_unique_code',
            'cycle',
            'payout_type',
            'requested_amount',
            'available_balance',
            'total_paid',
            'commission',
            'net_payout',
            'status',
            'requested_by',
            'requested_by_role',
            'requested_on',
            'approved_by',
            'approved_on',
            'paid_on',
            'rejection_reason',
        ]
        read_only_fields = ['id', 'requested_by', 'requested_by_role', 'requested_on', 'client_name', 'client_unique_code']

    def get_requested_by_role(self, obj):
        return obj.requested_by.role if obj.requested_by else None
    
    def get_client_name(self, obj):
        if obj.client:
            import html
            return html.unescape(obj.client.name)
        return None
    
    def get_client_unique_code(self, obj):
        return obj.client.unique_code if obj.client else None
