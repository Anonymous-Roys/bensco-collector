# from django.db import models
# import uuid
# from clients.models import ClientModel
# from users.models import UserModel
# from savings.models import SavingsCycleModel

# class ContributionModel(models.Model):
#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     client = models.ForeignKey(ClientModel, on_delete=models.CASCADE)
#     collector = models.ForeignKey(UserModel, on_delete=models.CASCADE)
#     cycle = models.ForeignKey(SavingsCycleModel, on_delete=models.CASCADE, related_name='contributions')
#     amount = models.DecimalField(max_digits=10, decimal_places=2)
#     paid_for_date = models.DateField()
#     collected_on = models.DateField(auto_now_add=True)
#     created_at = models.DateTimeField(auto_now_add=True)

#     def __str__(self):
#         return f"{self.client.name} - {self.amount} on {self.paid_for_date}"


from django.db import models
from users.models import UserModel
from clients.models import ClientModel
from savings.models import SavingsCycleModel
from django.utils import timezone
from decimal import Decimal
from core.utils import get_active_or_create_savings_cycle
import uuid

class ContributionModel(models.Model):
    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    client = models.ForeignKey(ClientModel, on_delete=models.CASCADE, related_name='contributions')
    collector = models.ForeignKey(UserModel, on_delete=models.SET_NULL, null=True, blank=True)
    savings_cycle = models.ForeignKey(SavingsCycleModel, on_delete=models.CASCADE, related_name='contributions')
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(default=timezone.now)
    is_bulk = models.BooleanField(default=False)
    days_covered = models.PositiveIntegerField(default=1)
    note = models.TextField(blank=True, null=True)
    is_override = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Automatically link or create a savings cycle
        if not self.savings_cycle:
            self.savings_cycle = get_active_or_create_savings_cycle(self.client)

        # Calculate days covered if fixed amount and bulk
        if self.client.is_fixed and self.amount >= self.client.amount_daily:
            self.days_covered = int(self.amount / self.client.amount_daily)
            self.is_bulk = self.days_covered > 1

        super().save(*args, **kwargs)

        # Optional: update the cycle total or trigger closure
        # self.savings_cycle.check_and_close()

        if self.savings_cycle:
            total_days = sum(
                self.savings_cycle.contributions.values_list('days_covered', flat=True)
            )
            if total_days >= self.savings_cycle.cycle_length:
                self.savings_cycle.status = SavingsCycleModel.Status.CLOSED
                self.savings_cycle.save()

    def __str__(self):
        return f"{self.client.name} - GHS {self.amount} on {self.date}"
