from django.urls import path
from .views import CustomTokenObtainPairView
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('get_users/', views.get_users, name='get_users'),
    path('collector-password-reset-request/', views.collector_password_reset_request_view, name='collector_password_reset_request'),
    path('create-user/', views.create_user, name='create_user'),
]