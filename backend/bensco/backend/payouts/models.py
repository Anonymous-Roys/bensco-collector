from django.db import models
import uuid
from clients.models import ClientModel
from savings.models import SavingsCycleModel
from users.models import UserModel

class PayoutModel(models.Model):
    class StatusChoices(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        PAID = 'paid', 'Paid'
    
    class PayoutTypeChoices(models.TextChoices):
        CLIENT_SPECIFIC = 'client_specific', 'Client Specific'
        BULK = 'bulk', 'Bulk Payout'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(ClientModel, on_delete=models.CASCADE, null=True, blank=True)  # Optional for client-specific payouts
    cycle = models.ForeignKey(SavingsCycleModel, on_delete=models.CASCADE, null=True, blank=True)  # Optional for bulk payouts
    
    payout_type = models.CharField(max_length=20, choices=PayoutTypeChoices.choices, default=PayoutTypeChoices.BULK)
    
    total_paid = models.DecimalField(max_digits=10, decimal_places=2)
    commission = models.DecimalField(max_digits=10, decimal_places=2)
    net_payout = models.DecimalField(max_digits=10, decimal_places=2)

    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    
    requested_by = models.ForeignKey(UserModel, on_delete=models.SET_NULL, null=True, related_name='payouts_requested')
    approved_by = models.ForeignKey(UserModel, on_delete=models.SET_NULL, null=True, blank=True, related_name='payouts_approved')

    requested_on = models.DateField(auto_now_add=True)
    approved_on = models.DateField(null=True, blank=True)
    paid_on = models.DateField(null=True, blank=True)

    rejection_reason = models.TextField(blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['client', 'cycle'], 
                condition=models.Q(payout_type='client_specific'),
                name='one_payout_per_client_cycle'
            )
        ]

    def __str__(self):
        if self.payout_type == self.PayoutTypeChoices.CLIENT_SPECIFIC:
            return f"{self.client.name} - ₵{self.net_payout} ({self.status})"
        return f"Bulk Payout - ₵{self.net_payout} ({self.status})"
