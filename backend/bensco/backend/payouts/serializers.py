from rest_framework import serializers
from .models import PayoutModel

class PayoutModelSerializer(serializers.ModelSerializer):
    requested_by_role = serializers.SerializerMethodField()

    class Meta:
        model = PayoutModel
        fields = [
            'id',
            'client',
            'cycle',
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
        ]
        read_only_fields = ['id', 'requested_by', 'requested_by_role', 'requested_on']

    def get_requested_by_role(self, obj):
        return obj.requested_by.role if obj.requested_by else None
