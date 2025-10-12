from django.urls import path
from . import views

urlpatterns = [
    path('client-cycles/<uuid:client_id>/', views.get_client_cycles, name='client-cycles'),
    path('close-cycle/<uuid:client_id>/', views.close_cycle, name='close-cycle'),
]