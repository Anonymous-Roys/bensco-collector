from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from users.models import UserModel
from clients.models import ClientModel, AddressModel
from contributions.models import ContributionModel
from savings.models import SavingsCycleModel


class ContributionCycleClosureTestCase(TestCase):
    def setUp(self):
        self.collector = UserModel.objects.create_user(
            username='collector1',
            email='collector1@example.com',
            password='password123',
            role='collector'
        )

        self.address = AddressModel.objects.create(
            label="Kasoa", region="Central"
        )

        self.client = ClientModel.objects.create(
            name="Test Client",
            phone_number="0550001111",
            collector=self.collector,
            address=self.address,
            amount_daily=5.0,
            start_date=timezone.now().date() - timedelta(days=4),
            is_fixed=True
        )

        self.cycle = SavingsCycleModel.objects.create(
            client=self.client,
            collector=self.collector,
            start_date=timezone.now().date() - timedelta(days=4),
            end_date=timezone.now().date() - timedelta(days=1),
            cycle_length=3,
            status=SavingsCycleModel.Status.ACTIVE
        )

    def test_cycle_closes_after_contribution(self):
        # Make contributions that cover all 3 days
        ContributionModel.objects.create(
            client=self.client,
            collector=self.collector,
            amount=5.0,
            days_covered=1,
            savings_cycle=self.cycle
        ).save()

        ContributionModel.objects.create(
            client=self.client,
            collector=self.collector,
            amount=5.0,
            days_covered=1,
            savings_cycle=self.cycle
        ).save()

        ContributionModel.objects.create(
            client=self.client,
            collector=self.collector,
            amount=5.0,
            days_covered=1,
            savings_cycle=self.cycle
        ).save()

        self.cycle.refresh_from_db()
        self.assertEqual(self.cycle.status, SavingsCycleModel.Status.CLOSED)
