#!/usr/bin/env python
import os
import django
import sys

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from clients.models import ClientModel, AddressModel
from users.models import UserModel
from savings.models import SavingsCycleModel
from contributions.models import ContributionModel
from decimal import Decimal
from datetime import date, timedelta
import random

def create_test_data():
    print("Creating test data...")
    
    # Create addresses
    addresses = []
    address_names = ['Kasoa', 'Asokwa', 'Kumasi Central', 'Accra Central', 'Tema', 'Takoradi']
    for name in address_names:
        address, created = AddressModel.objects.get_or_create(
            label=name,
            defaults={'region': 'Greater Accra' if name in ['Accra Central', 'Tema'] else 'Ashanti'}
        )
        addresses.append(address)
    
    # Create collectors if they don't exist
    collectors = []
    for i in range(3):
        collector, created = UserModel.objects.get_or_create(
            username=f'collector{i+1}',
            defaults={
                'email': f'collector{i+1}@test.com',
                'role': 'collector',
                'assigned_zone': f'Zone {i+1}',
                'is_active': True
            }
        )
        if created:
            collector.set_password('password123')
            collector.save()
        collectors.append(collector)
    
    # Create admin user
    admin, created = UserModel.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@test.com',
            'role': 'admin',
            'is_active': True
        }
    )
    if created:
        admin.set_password('admin123')
        admin.save()
    
    # Create clients
    client_names = [
        'John Doe', 'Jane Smith', 'Michael Johnson', 'Sarah Wilson', 'David Brown',
        'Lisa Davis', 'Robert Miller', 'Emily Garcia', 'William Rodriguez', 'Jessica Martinez',
        'Christopher Lee', 'Amanda Taylor', 'Matthew Anderson', 'Ashley Thomas', 'Joshua Jackson',
        'Stephanie White', 'Andrew Harris', 'Melissa Martin', 'Daniel Thompson', 'Nicole Garcia',
        'James Wilson', 'Elizabeth Moore', 'Ryan Taylor', 'Samantha Johnson', 'Kevin Brown',
        'Rachel Davis', 'Brandon Miller', 'Lauren Anderson', 'Tyler Thomas', 'Kayla Jackson'
    ]
    
    clients = []
    for i, name in enumerate(client_names):
        client, created = ClientModel.objects.get_or_create(
            name=name,
            defaults={
                'phone_number': f'0{random.randint(200000000, 299999999)}',
                'collector': random.choice(collectors + [None]),  # Some shared clients
                'address': random.choice(addresses),
                'amount_daily': Decimal(str(random.randint(10, 100))),
                'is_fixed': random.choice([True, False]),
                'start_date': date.today() - timedelta(days=random.randint(1, 90)),
                'initial_balance': Decimal(str(random.randint(0, 500))),
                'next_of_kin': f'Next of Kin {i+1}'
            }
        )
        clients.append(client)
    
    # Create savings cycles and contributions for some clients
    for client in clients[:15]:  # Add data for first 15 clients
        cycle = SavingsCycleModel.objects.create(
            client=client,
            cycle_length=31,
            collector=client.collector
        )
        
        # Add some contributions
        for day in range(random.randint(5, 20)):
            ContributionModel.objects.create(
                client=client,
                savings_cycle=cycle,
                collector=client.collector or random.choice(collectors),
                amount=Decimal(str(random.randint(10, 50))),
                date=date.today() - timedelta(days=day)
            )
    
    print(f"Created {ClientModel.objects.count()} clients")
    print(f"Created {ContributionModel.objects.count()} contributions")
    print(f"Created {SavingsCycleModel.objects.count()} savings cycles")
    print("Test data creation complete!")

if __name__ == '__main__':
    create_test_data()