from django.core.management.base import BaseCommand
from payouts.models import PayoutModel

class Command(BaseCommand):
    help = 'Fix available_balance field in existing payouts'

    def handle(self, *args, **options):
        payouts = PayoutModel.objects.filter(client__isnull=False)
        
        self.stdout.write(f'Found {payouts.count()} payouts to update')
        
        updated_count = 0
        for payout in payouts:
            try:
                old_balance = payout.available_balance
                new_balance = payout.client.get_available_balance()
                
                if old_balance != new_balance:
                    self.stdout.write(f'Payout {payout.id}: {old_balance} -> {new_balance}')
                    payout.available_balance = new_balance
                    payout.save(update_fields=['available_balance'])
                    updated_count += 1
                    
            except Exception as e:
                self.stdout.write(f'Error updating payout {payout.id}: {e}')
        
        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated_count} payouts'))