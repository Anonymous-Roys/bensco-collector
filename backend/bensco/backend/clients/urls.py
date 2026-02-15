from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_client_view, name='create_client'),
    path('list/', views.get_clients_view, name='list_clients'),
    path('search/', views.search_clients_view, name='search_clients'),
    path('stats/', views.get_client_stats, name='client_stats'),
    path('<uuid:client_id>/', views.client_detail, name='client_detail'),
    path('<uuid:client_id>/transactions/', views.get_client_transactions, name='client_transactions'),
    path('<uuid:client_id>/assign-collector/', views.assign_collector, name='assign_collector'),
    path('collectors/', views.get_available_collectors, name='get_available_collectors'),
    path('addresses/', views.get_addresses, name='get_addresses'),
    path('addresses/create/', views.create_address, name='create_address'),
    # Legacy endpoint for backward compatibility
    path('<uuid:id>/', views.client_profile, name='client_profile')
]
