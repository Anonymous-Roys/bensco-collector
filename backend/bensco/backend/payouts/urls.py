from django.urls import path
from . import views
from .views import get_payout_stats, request_client_payout

urlpatterns = [
    path('request/', views.create_payout, name='create-payout'),
    path('approve/<uuid:payout_id>/', views.approve_payout, name='approve-payout'),
    path('list/', views.list_payouts, name='payout-list'),
    path('reject/<uuid:payout_id>/', views.reject_payout, name='reject-payout'),
    path('mark-paid/<uuid:payout_id>/', views.mark_payout_paid, name='mark-payout-paid'),
    path('stats/', get_payout_stats, name='payout-stats'),
    path('request-client/<uuid:client_id>/', request_client_payout, name='request-client-payout'),
]
