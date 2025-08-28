from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.urls import reverse
from django.utils import timezone

from users.models import UserModel
from clients.models import ClientModel
from savings.models import SavingsCycleModel
from payouts.models import PayoutModel

import uuid
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken

class PayoutViewTests(APITestCase):
    def setUp(self):
        # Create admin user
        self.admin_user = UserModel.objects.create_user(
            username='adminuser',
            email='admin@example.com',
            password='adminpass123',
            role='admin',
            must_change_password=False
        )

        # Create collector user
        self.collector_user = UserModel.objects.create_user(
            username='collectoruser',
            email='collector@example.com',
            password='collectorpass123',
            role='collector',
            must_change_password=False
        )

        # Create client
        self.client_user = ClientModel.objects.create(
            name="Ama Boateng",
            phone_number="0559876543",
            collector=self.collector_user,
            amount_daily=5.0,
            start_date=timezone.now().date()
        )

        # Create savings cycle
        self.savings_cycle = SavingsCycleModel.objects.create(
            client=self.client_user,
            collector=self.collector_user,
            start_date=timezone.now().date() - timedelta(days=31),
            end_date=timezone.now().date(),
            status=SavingsCycleModel.Status.CLOSED,
            cycle_length=31,
            total_saved=150.0
        )

        # Auth token
        self.client_auth = APIClient()
        refresh = RefreshToken.for_user(self.admin_user)
        self.client_auth.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')

    def test_create_payout(self):
        url = reverse('create-payout')
        payload = {
            "client": str(self.client_user.id),
            "cycle": str(self.savings_cycle.id),
            "total_paid": "150.00",
            "commission": "15.00",
            "net_payout": "135.00"
        }
        response = self.client_auth.post(url, data=payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(str(response.data['requested_by']), str(self.admin_user.id))

    def test_list_payouts(self):
        # Create a payout to ensure there's at least one
        PayoutModel.objects.create(
            client=self.client_user,
            cycle=self.savings_cycle,
            total_paid=150.00,
            commission=15.00,
            net_payout=135.00,
            requested_by=self.admin_user
        )

        url = reverse('payout-list')
        response = self.client_auth.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)
