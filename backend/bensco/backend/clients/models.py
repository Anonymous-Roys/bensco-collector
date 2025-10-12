from django.db import models
import uuid
from users.models import UserModel
from core.utils import generate_hex_id , generate_unique_code



class AddressModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    label = models.CharField(max_length=255)  # e.g., "Kasoa", "Asokwa", "Kumasi Central"
    region = models.CharField(max_length=100, blank=True, null=True)  # e.g., "Ashanti"
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.label
    pass

class ClientModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    unique_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    collector = models.ForeignKey(UserModel, on_delete=models.SET_NULL, null=True, blank=True, related_name='clients')
    address = models.ForeignKey(AddressModel, on_delete=models.SET_NULL, null=True, blank=True, related_name='clients')
    dob = models.DateField(blank=True, null=True)
    amount_daily = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    next_of_kin = models.CharField(max_length=255, blank=False, null=True)
    is_fixed = models.BooleanField(default=True)
    start_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def calculate_commission(self, total_collected, contributing_days=None):
        """Calculate commission based on client type"""
        from decimal import Decimal
        
        if self.is_fixed:
            # Fixed clients: flat commission = daily amount (once per cycle)
            return Decimal(str(self.amount_daily or 0))
        else:
            # Variable clients: total / days contributed
            if contributing_days and contributing_days > 0:
                return Decimal(str(total_collected)) / Decimal(str(contributing_days))
            return Decimal('0')
    
    def get_available_balance(self):
        """Get client's available balance for payout"""
        from contributions.models import ContributionModel
        from payouts.models import PayoutModel
        
        total_contributions = ContributionModel.objects.filter(
            client=self
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        total_payouts = PayoutModel.objects.filter(
            client=self,
            status=PayoutModel.StatusChoices.PAID
        ).aggregate(total=models.Sum('net_payout'))['total'] or 0
        
        # Calculate commission for current cycle
        current_cycle = self.savings_cycles.filter(
            status='active'
        ).first()
        
        if current_cycle:
            cycle_contributions = current_cycle.contributions.aggregate(
                total=models.Sum('amount'),
                days=models.Count('date', distinct=True)
            )
            commission = self.calculate_commission(
                cycle_contributions['total'] or 0,
                cycle_contributions['days']
            )
        else:
            commission = 0
            
        return total_contributions - total_payouts - commission

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.unique_code:
            self.unique_code = generate_unique_code(ClientModel, 'CLI')
        super().save(*args, **kwargs)
