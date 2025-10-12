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
        """Get client's available balance for payout from all cycles"""
        from decimal import Decimal
        from django.db.models import Sum
        
        try:
            # Get total from all closed cycles that haven't been fully paid out
            closed_cycles = self.savings_cycles.filter(
                status__in=['closed', 'paid_out']
            )
            
            total_from_closed = Decimal('0')
            for cycle in closed_cycles:
                cycle_contributions = cycle.contributions.aggregate(
                    total=Sum('amount')
                )['total'] or 0
                
                cycle_commission = self.calculate_commission(
                    cycle_contributions,
                    cycle.contributions.aggregate(days=Sum('days_covered'))['days'] or 0
                )
                
                # Subtract any payouts already made for this cycle
                paid_out = cycle.payouts.filter(
                    status='paid'
                ).aggregate(total=Sum('net_payout'))['total'] or 0
                
                cycle_available = cycle_contributions - cycle_commission - paid_out
                total_from_closed += max(cycle_available, Decimal('0'))
            
            # Add current cycle balance
            current_cycle = self.get_current_cycle()
            current_available = Decimal('0')
            
            if current_cycle:
                progress = current_cycle.get_cycle_progress()
                total_contributions = progress['total_contributions']
                
                commission = self.calculate_commission(
                    total_contributions,
                    progress['contributed_days']
                )
                
                current_available = max(total_contributions - commission, Decimal('0'))
            
            total_available = total_from_closed + current_available
            print(f"Client {self.name} total balance: closed_cycles={total_from_closed}, current={current_available}, total={total_available}")
            return total_available
            
        except Exception as e:
            print(f"Error calculating balance for client {self.name}: {e}")
            return Decimal('0')
    
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
