from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_contributions, name='list_contributions'),
    path('create/', views.create_contribution, name='create_contribution'),
    path('client/<uuid:client_id>/', views.client_contributions, name='client_contributions'),
    path('create/bulk/', views.create_bulk_contributions, name='bulk_write'),
]
