import json
import uuid
import random
from datetime import date, timedelta
from faker import Faker

fake = Faker()

def generate_users(n=5):
    roles = ['admin', 'collector']
    users = []
    for _ in range(n):
        role = random.choice(roles)
        user_id = str(uuid.uuid4())
        users.append({
            "id": user_id,
            "username": fake.user_name(),
            "email": fake.email(),
            "password": "password123",
            "role": role,
            "unique_code": f"BSL-{'ADM' if role == 'admin' else 'COL'}-{uuid.uuid4().hex[:5].upper()}",
            "must_change_password": False,
            "is_active": True,
            "created_at": str(fake.date_time_this_year()),
            "updated_at": str(fake.date_time_this_year())
        })
    return users

def generate_addresses(n=6):
    towns = [
        "Kasoa", "Madina", "Lapaz", "Adenta", "Kumasi", "Asokwa",
        "Takoradi", "Cape Coast", "Tamale", "Sunyani", "Techiman"
    ]
    regions = [
        "Greater Accra", "Ashanti", "Central", "Western", 
        "Eastern", "Northern", "Volta", "Bono", "Upper East", "Upper West"
    ]
    
    addresses = []
    for _ in range(n):
        label = random.choice(towns)
        region = random.choice(regions)
        address_id = str(uuid.uuid4())
        addresses.append({
            "id": address_id,
            "label": label,
            "region": region,
            "created_at": str(fake.date_time_this_year())
        })
    return addresses


def generate_clients(users, addresses, n=10):
    clients = []
    for _ in range(n):
        collector = random.choice([u for u in users if u["role"] == "collector"])
        address = random.choice(addresses)
        is_fixed = random.choice([True, False])
        amount_daily = random.choice([2, 5, 10])
        start_date = date.today() - timedelta(days=random.randint(0, 15))
        clients.append({
            "name": fake.name(),
            "phone_number": fake.phone_number(),
            "collector": collector["id"],
            "address": address["id"],  # Now a valid UUID
            "dob": str(fake.date_of_birth(minimum_age=20, maximum_age=60)),
            "amount_daily": amount_daily,
            "next_of_kin": fake.name(),
            "is_fixed": is_fixed,
            "start_date": str(start_date),
            "unique_code": f"BSL-CLI-{uuid.uuid4().hex[:5].upper()}",
            "created_at": str(fake.date_time_this_year())
        })
    return clients

def generate_savings_cycles(clients):
    cycles = []
    for client in clients:
        start = date.fromisoformat(client["start_date"])
        cycle_length = 31
        end = start + timedelta(days=cycle_length)
        cycles.append({
            "client": client["unique_code"],
            "start_date": str(start),
            "expected_end_date": str(end),
            "cycle_length": cycle_length,
            "status": "active"
        })
    return cycles

def generate_contributions(clients, users, n=30):
    contributions = []
    for _ in range(n):
        client = random.choice(clients)
        collector = next(u for u in users if u["id"] == client["collector"])
        amount = random.choice([client["amount_daily"], client["amount_daily"] * 2, client["amount_daily"] * 5])
        is_bulk = amount > client["amount_daily"]
        days_covered = int(amount / client["amount_daily"]) if is_bulk else 1
        contributions.append({
            "client": client["unique_code"],
            "collector": collector["id"],
            "amount": amount,
            "date": str(fake.date_between(start_date='-15d', end_date='today')),
            "is_bulk": is_bulk,
            "days_covered": days_covered,
            "note": fake.sentence() if random.random() < 0.2 else "",
            "is_override": random.random() < 0.1
        })
    return contributions

# 🔄 Generate data
users = generate_users(6)
addresses = generate_addresses(6)
clients = generate_clients(users, addresses, 10)
savings_cycles = generate_savings_cycles(clients)
contributions = generate_contributions(clients, users, 30)

# 📁 Dump all into JSON file
all_data = {
    "users": users,
    "addresses": addresses,
    "clients": clients,
    "savings_cycles": savings_cycles,
    "contributions": contributions
}

with open("mock_test_data.json", "w") as f:
    json.dump(all_data, f, indent=4)

print("✅ mock_test_data.json generated.")
