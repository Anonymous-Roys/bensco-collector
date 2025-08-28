# from django.db import models
# import uuid
# from clients.models import ClientModel

# class SavingsCycleModel(models.Model):
#     STATUS_CHOICES = [
#         ('open', 'Open'),
#         ('completed', 'Completed'),
#         ('early_withdrawal', 'Early Withdrawal'),
#     ]

#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     client = models.ForeignKey(ClientModel, on_delete=models.CASCADE, related_name='cycles')
#     start_date = models.DateField()
#     end_date = models.DateField()
#     cycle_length = models.IntegerField(default=31)
#     status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     def __str__(self):
#         return f"{self.client.name} - {self.start_date} to {self.end_date}"


import uuid
from django.db import models
# from users.models import UserModel
# from clients.models import ClientModel
from datetime import date, timedelta
from django.db.models import Sum

class SavingsCycleModel(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        CLOSED = 'closed', 'Closed'
        PAID_OUT = 'paid_out', 'Paid Out'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey('clients.ClientModel', on_delete=models.CASCADE, related_name='savings_cycles')
    collector = models.ForeignKey('users.UserModel', on_delete=models.SET_NULL, null=True, blank=True, related_name='collected_cycles')
    
    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateField(null=True, blank=True)
    cycle_length = models.PositiveIntegerField(default=31, help_text="Number of days for this savings cycle")

    total_saved = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    commission_deducted = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.client.name} - {self.start_date} to {self.end_date or 'Present'}"

    # def check_and_close(self):
    #     if self.status == self.Status.ACTIVE:
    #         days_passed = (date.today() - self.start_date).days
    #         if days_passed >= self.cycle_length:
    #             self.status = self.Status.CLOSED
    #             self.end_date = date.today()
    #             self.save()
    #             return True
    #     return False
    def check_and_close(self):
        if self.status != self.Status.ACTIVE:
            return False

        contrib_days = self.contributions.aggregate(
            total_days=Sum('days_covered')
        )['total_days'] or 0

        days_passed = (date.today() - self.start_date).days

        if contrib_days >= self.cycle_length or days_passed >= self.cycle_length:
            self.status = self.Status.CLOSED
            self.end_date = date.today()
            self.save()
            return True

        return False
