from django.test import TestCase
from rest_framework.test import APIClient
from django.utils import timezone
from users.models import UserModel
from clients.models import ClientModel
from savings.models import SavingsCycleModel
from payouts.models import PayoutModel

from rest_framework.reverse import reverse


class PayoutActionTests(TestCase):
    def setUp(self):
        self.client_api = APIClient()

        # Create admin and collector with unique emails
        self.admin = UserModel.objects.create_user(
            username='admin',
            password='admin123',
            role='admin',
            email='admin@example.com'
        )
        self.collector = UserModel.objects.create_user(
            username='collector',
            password='collector123',
            role='collector',
            email='collector@example.com'
        )

        # Authenticate as admin
        self.client_api.force_authenticate(user=self.admin)

        # Create client
        self.client_user = ClientModel.objects.create(
            name="John Doe",
            phone_number="0540000000",
            collector=self.collector,
            amount_daily=5.0,
            is_fixed=True,
            start_date=timezone.now().date()
        )

        # Create savings cycle
        self.cycle = SavingsCycleModel.objects.create(
            client=self.client_user,
            collector=self.collector,
            cycle_length=31,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=31),
            status=SavingsCycleModel.Status.CLOSED
        )

        # Create payout request
        self.payout = PayoutModel.objects.create(
            client=self.client_user,
            cycle=self.cycle,
            total_paid=150.00,
            commission=5.00,
            net_payout=145.00,
            requested_by=self.collector
        )

    def test_approve_payout(self):
        url = reverse('approve-payout', args=[self.payout.id])
        response = self.client_api.post(url)
        self.assertEqual(response.status_code, 200)
        self.payout.refresh_from_db()
        self.assertEqual(self.payout.status, PayoutModel.StatusChoices.APPROVED)
        self.assertEqual(self.payout.approved_by, self.admin)

    def test_reject_payout(self):
        url = reverse('reject-payout', args=[self.payout.id])
        response = self.client_api.post(url, {"reason": "Suspicious account"})
        self.assertEqual(response.status_code, 200)
        self.payout.refresh_from_db()
        self.assertEqual(self.payout.status, PayoutModel.StatusChoices.REJECTED)
        self.assertEqual(self.payout.rejection_reason, "Suspicious account")

    def test_mark_payout_paid(self):
        # First approve it
        self.payout.status = PayoutModel.StatusChoices.APPROVED
        self.payout.save()

        url = reverse('mark-payout-paid', args=[self.payout.id])
        response = self.client_api.post(url)
        self.assertEqual(response.status_code, 200)
        self.payout.refresh_from_db()
        self.assertEqual(self.payout.status, PayoutModel.StatusChoices.PAID)

    def test_non_admin_cannot_approve(self):
        self.client_api.force_authenticate(user=self.collector)
        url = reverse('approve-payout', args=[self.payout.id])
        response = self.client_api.post(url)
        self.assertEqual(response.status_code, 403)

    def test_reject_without_reason(self):
        url = reverse('reject-payout', args=[self.payout.id])
        response = self.client_api.post(url, {})
        self.assertEqual(response.status_code, 400)
