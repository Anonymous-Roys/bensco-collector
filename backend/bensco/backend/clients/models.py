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
    initial_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Initial balance when client is created")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def calculate_commission(self, total_collected, contributing_days=None):
        """Calculate commission based on client type"""
        from decimal import Decimal
        
        total_collected = Decimal(str(total_collected or 0))
        
        if self.is_fixed:
            # Fixed clients: flat commission = daily amount (once per cycle)
            return Decimal(str(self.amount_daily or 0))
        else:
            # Variable clients: total / days contributed
            if contributing_days and contributing_days > 0:
                return total_collected / Decimal(str(contributing_days))
            return Decimal('0')
    
    def get_current_cycle(self):
        """Get or create current active savings cycle"""
        from savings.models import SavingsCycleModel
        
        # Check for existing active cycle
        current_cycle = self.savings_cycles.filter(
            status=SavingsCycleModel.Status.ACTIVE
        ).first()
        
        if not current_cycle:
            # Create new cycle if none exists
            current_cycle = SavingsCycleModel.objects.create(
                client=self,
                cycle_length=31  # Default 31 business days
            )
            
        return current_cycle
    
    def get_cycle_history(self):
        """Get all past cycles for this client"""
        return self.savings_cycles.exclude(
            status='active'
        ).order_by('-end_date')
    
    def get_available_balance(self):
        """Get client's available balance (initial + contributions - payouts)"""
        from decimal import Decimal
        from django.db.models import Sum
        
        try:
            # Start with initial balance (set once during creation)
            current_balance = Decimal(str(self.initial_balance or 0))
            
            # Add ALL contributions from all cycles (no commission deduction)
            all_cycles = self.savings_cycles.all()
            
            for cycle in all_cycles:
                # Get total contributions for this cycle
                cycle_contributions = cycle.contributions.aggregate(
                    total=Sum('amount')
                )['total'] or 0
                
                # Add full contribution amount (no commission deducted)
                current_balance += Decimal(str(cycle_contributions or 0))
            
            # Subtract all paid payouts (net amount after commission was deducted at payout time)
            from payouts.models import PayoutModel
            total_paid_out = PayoutModel.objects.filter(
                client=self,
                status='paid'
            ).aggregate(total=Sum('net_payout'))['total'] or 0
            
            current_balance -= Decimal(str(total_paid_out or 0))
            
            return max(current_balance, Decimal('0'))
            
        except Exception as e:
            print(f"Error calculating balance for client {self.name}: {e}")
            return Decimal('0')
    
    def get_total_net_savings(self):
        """Get total net savings across all cycles (for display purposes)"""
        return self.get_available_balance()
    
    def get_total_savings_history(self):
        """Get total savings across all completed cycles"""
        from decimal import Decimal
        
        completed_cycles = self.savings_cycles.filter(
            status__in=['closed', 'paid_out']
        )
        
        return {
            'total_cycles': completed_cycles.count(),
            'total_saved': completed_cycles.aggregate(
                total=models.Sum('total_saved')
            )['total'] or Decimal('0'),
            'cycles': completed_cycles.values(
                'id', 'start_date', 'end_date', 'total_saved', 'status'
            )
        }

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.unique_code:
            self.unique_code = generate_unique_code(ClientModel, 'CLI')
        
        super().save(*args, **kwargs)
