from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from users.models import UserModel
from clients.models import ClientModel, AddressModel
from savings.models import SavingsCycleModel
from payouts.models import PayoutModel
from datetime import date, timedelta
import uuid

class PayoutRequestTests(TestCase):
    def setUp(self):
        self.client_api = APIClient()

        # Create collector and admin users
        self.collector = UserModel.objects.create_user(
            username='collector1',
            email='collector@example.com',
            password='password123',
            role='collector'
        )
        self.admin = UserModel.objects.create_user(
            username='admin1',
            email='admin@example.com',
            password='password123',
            role='admin'
        )

        # Create address and client
        self.address = AddressModel.objects.create(label='Kasoa', region='Central')
        self.client = ClientModel.objects.create(
            name='Client A',
            phone_number='0500000000',
            collector=self.collector,
            address=self.address,
            start_date=date.today() - timedelta(days=31),
            amount_daily=10.00,
            is_fixed=True,
        )

        # Create savings cycle
        self.cycle = SavingsCycleModel.objects.create(
            client=self.client,
            collector=self.collector,
            start_date=date.today() - timedelta(days=31),
            end_date=date.today(),
            cycle_length=31,
            total_saved=310.00,
            status=SavingsCycleModel.Status.CLOSED
        )

        self.url = reverse('create-payout')  # Update this name based on your urls.py

    def test_collector_can_request_payout(self):
        self.client_api.force_authenticate(user=self.collector)
        data = {
            "client": str(self.client.id),
            "cycle": str(self.cycle.id),
            "total_paid": 310.00,
            "commission": 10.00,
            "net_payout": 300.00,
        }
        response = self.client_api.post(self.url, data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['requested_by_role'], 'collector')

    def test_admin_can_request_payout(self):
        self.client_api.force_authenticate(user=self.admin)
        data = {
            "client": str(self.client.id),
            "cycle": str(self.cycle.id),
            "total_paid": 310.00,
            "commission": 10.00,
            "net_payout": 300.00,
        }
        response = self.client_api.post(self.url, data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['requested_by_role'], 'admin')

    def test_invalid_payload_returns_error(self):
        self.client_api.force_authenticate(user=self.admin)
        data = {
            "client": "",  # Missing required fields
            "cycle": "",
        }
        response = self.client_api.post(self.url, data, format='json')
        self.assertEqual(response.status_code, 400)

    def test_requested_by_is_recorded(self):
        self.client_api.force_authenticate(user=self.collector)
        data = {
            "client": str(self.client.id),
            "cycle": str(self.cycle.id),
            "total_paid": 310.00,
            "commission": 10.00,
            "net_payout": 300.00,
        }
        response = self.client_api.post(self.url, data, format='json')
        self.assertEqual(response.status_code, 201)
        payout_id = response.data['id']
        payout = PayoutModel.objects.get(id=payout_id)
        self.assertEqual(payout.requested_by, self.collector)
