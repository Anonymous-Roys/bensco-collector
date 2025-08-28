from django.urls import path
from . import views

urlpatterns = [
    path('request/', views.create_payout, name='create-payout'),
    path('approve/<uuid:payout_id>/', views.approve_payout, name='approve-payout'),
    path('list/', views.list_payouts, name='payout-list'),
    path('reject/<uuid:payout_id>/', views.reject_payout, name='reject-payout'),
    path('mark-paid/<uuid:payout_id>/', views.mark_payout_paid, name='mark-payout-paid'),

]
