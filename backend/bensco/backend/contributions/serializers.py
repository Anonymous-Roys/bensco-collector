from rest_framework import serializers
from .models import ContributionModel
from savings.models import SavingsCycleModel
from clients.models import ClientModel
from django.utils import timezone
from datetime import timedelta
from core.utils import check_and_close
class ContributionModelSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    collector_username = serializers.CharField(source='collector.username', read_only=True)

    class Meta:
        model = ContributionModel
        fields = [
            'id',
            'client',
            'client_name',
            'collector',
            'collector_username',
            'amount',
            'days_covered',
            # 'contribution_date',
            'savings_cycle',
            'is_override',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'client_name', 'collector_username', 'savings_cycle']

    # def create(self, validated_data):
    #     client = validated_data.get('client')
    #     today = timezone.now().date()

    #     # Match enum status value
    #     active_status = SavingsCycleModel.Status.ACTIVE

    #     active_cycle = SavingsCycleModel.objects.filter(
    #         client=client,
    #         status=active_status,
    #         start_date__lte=today,
    #         end_date__gte=today
    #     ).first()

    #     # Create new cycle if none found or logically expired
    #     if not active_cycle:
    #         start_date = today
    #         cycle_length = 31  # could be dynamic later
    #         end_date = start_date + timedelta(days=cycle_length)

    #         active_cycle = SavingsCycleModel.objects.create(
    #             client=client,
    #             start_date=start_date,
    #             cycle_length=cycle_length,
    #             end_date=end_date,
    #             status=active_status
    #         )

    #     validated_data['savings_cycle'] = active_cycle
    #     contribution = super().create(validated_data)

    #     # Check if the cycle should now be closed (after this contribution)
    #     contribution.savings_cycle.check_and_close()

    #     return contribution
    def create(self, validated_data):
        client = validated_data.get('client')
        today = timezone.now().date()

        active_status = SavingsCycleModel.Status.ACTIVE

        active_cycle = SavingsCycleModel.objects.filter(
            client=client,
            status=active_status,
            start_date__lte=today,
            end_date__gte=today
        ).first()

        if not active_cycle:
            start_date = today
            cycle_length = 31
            end_date = start_date + timedelta(days=cycle_length)

            active_cycle = SavingsCycleModel.objects.create(
                client=client,
                start_date=start_date,
                cycle_length=cycle_length,
                end_date=end_date,
                status=active_status
            )

        validated_data['savings_cycle'] = active_cycle

        contribution = super().create(validated_data)

        # Add this line
        active_cycle.check_and_close()

        return contribution