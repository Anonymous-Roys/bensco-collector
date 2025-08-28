from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from users.models import UserModel

class AuthTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.login_url = reverse('token_obtain_pair')

        self.admin_user = UserModel.objects.create_user(
            username='adminuser',
            email='admin@example.com',
            password='adminpass123',
            role='admin',
            must_change_password=False
        )

        self.collector_user = UserModel.objects.create_user(
            username='collector1',
            email='collector@example.com',
            password='collectorpass',
            role='collector',
            must_change_password=True
        )

    def test_valid_admin_login_returns_tokens(self):
        response = self.client.post(self.login_url, {
            'username': 'adminuser',
            'password': 'adminpass123'
        })

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['role'], 'admin')
        self.assertEqual(response.data['must_change_password'], False)

    def test_valid_collector_login_returns_tokens(self):
        response = self.client.post(self.login_url, {
            'username': 'collector1',
            'password': 'collectorpass'
        })

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['role'], 'collector')
        self.assertEqual(response.data['must_change_password'], True)

    def test_invalid_login_fails(self):
        response = self.client.post(self.login_url, {
            'username': 'adminuser',
            'password': 'wrongpass'
        })

        self.assertEqual(response.status_code, 401)
        self.assertIn('non_field_errors', response.data)

    def test_inactive_user_cannot_login(self):
        self.admin_user.is_active = False
        self.admin_user.save()

        response = self.client.post(self.login_url, {
            'username': 'adminuser',
            'password': 'adminpass123'
        })

        self.assertEqual(response.status_code, 401)
        self.assertIn('non_field_errors', response.data)
