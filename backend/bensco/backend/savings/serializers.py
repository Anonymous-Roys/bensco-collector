from rest_framework import serializers
from .models import SavingsCycleModel

class SavingsCycleSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    progress = serializers.SerializerMethodField()
    
    class Meta:
        model = SavingsCycleModel
        fields = [
            'id',
            'client',
            'client_name',
            'collector',
            'start_date',
            'end_date',
            'cycle_length',
            'total_saved',
            'commission_deducted',
            'status',
            'progress',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'client_name', 'progress']
    
    def get_progress(self, obj):
        """Get cycle progress information"""
        return obj.get_cycle_progress()