from django.urls import path
from . import views

urlpatterns = [
    path('client/<uuid:client_id>/cycles/', views.get_client_cycles, name='client-cycles'),
    path('cycle/<uuid:cycle_id>/close/', views.close_cycle, name='close-cycle'),
]