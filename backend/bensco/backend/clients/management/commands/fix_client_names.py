from django.core.management.base import BaseCommand
from clients.models import ClientModel
import html

class Command(BaseCommand):
    help = 'Fix HTML entities in client names'

    def handle(self, *args, **options):
        clients_with_entities = ClientModel.objects.filter(name__contains='&#')
        
        self.stdout.write(f'Found {clients_with_entities.count()} clients with HTML entities')
        
        for client in clients_with_entities:
            old_name = client.name
            new_name = html.unescape(client.name)
            
            if old_name != new_name:
                self.stdout.write(f'Fixing: "{old_name}" -> "{new_name}"')
                client.name = new_name
                client.save()
        
        self.stdout.write(self.style.SUCCESS('Successfully fixed client names'))