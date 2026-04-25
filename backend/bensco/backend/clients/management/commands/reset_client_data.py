from django.core.management.base import BaseCommand
from django.db import transaction
from clients.models import ClientModel
from contributions.models import ContributionModel
from payouts.models import PayoutModel
from savings.models import SavingsCycleModel

class Command(BaseCommand):
    help = 'Completely reset a client\'s data - collections, payouts, cycles, and balance'

    def add_arguments(self, parser):
        parser.add_argument('client_id', type=str, help='Client ID (UUID) to reset')
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm the reset operation (required for safety)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        client_id = options['client_id']
        confirm = options['confirm']
        dry_run = options['dry_run']

        try:
            client = ClientModel.objects.get(id=client_id)
        except ClientModel.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Client with ID {client_id} not found'))
            return

        self.stdout.write(f'Client: {client.name} ({client.unique_code})')
        
        # Get counts before deletion
        contributions_count = ContributionModel.objects.filter(
            savings_cycle__client=client
        ).count()
        
        payouts_count = PayoutModel.objects.filter(client=client).count()
        
        cycles_count = SavingsCycleModel.objects.filter(client=client).count()
        
        current_balance = client.get_available_balance()
        
        self.stdout.write(f'Data to be cleared:')
        self.stdout.write(f'  - Contributions: {contributions_count}')
        self.stdout.write(f'  - Payouts: {payouts_count}')
        self.stdout.write(f'  - Savings Cycles: {cycles_count}')
        self.stdout.write(f'  - Current Balance: ₵{current_balance}')
        self.stdout.write(f'  - Initial Balance will be reset to: ₵0.00')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No data will be deleted'))
            return

        if not confirm:
            self.stdout.write(self.style.ERROR('This operation will permanently delete all client data!'))
            self.stdout.write(self.style.ERROR('Use --confirm flag to proceed'))
            return

        # Perform the reset
        try:
            with transaction.atomic():
                # Delete contributions (through savings cycles)
                deleted_contributions = ContributionModel.objects.filter(
                    savings_cycle__client=client
                ).delete()
                
                # Delete payouts
                deleted_payouts = PayoutModel.objects.filter(client=client).delete()
                
                # Delete savings cycles
                deleted_cycles = SavingsCycleModel.objects.filter(client=client).delete()
                
                # Reset client's initial balance to 0
                client.initial_balance = 0.00
                client.save(update_fields=['initial_balance'])
                
                self.stdout.write(self.style.SUCCESS('Reset completed successfully:'))
                self.stdout.write(f'  - Deleted {deleted_contributions[0]} contributions')
                self.stdout.write(f'  - Deleted {deleted_payouts[0]} payouts')
                self.stdout.write(f'  - Deleted {deleted_cycles[0]} savings cycles')
                self.stdout.write(f'  - Reset initial balance to ₵0.00')
                self.stdout.write(f'  - New available balance: ₵{client.get_available_balance()}')
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error during reset: {e}'))
            raise