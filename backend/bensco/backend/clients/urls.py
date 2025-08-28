from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_client_view, name='create_client'),
    path('list/', views.get_clients_view, name='list_clients'),
    path('<uuid:id>/', views.client_profile, name='client_profile')
]
