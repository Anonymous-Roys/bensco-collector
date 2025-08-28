from django.urls import path
from clients.views import create_address

urlpatterns = [
    path('addr/create/', create_address, name='create_address'),
]
