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
    path('update-user/<uuid:user_id>/', views.update_user, name='update_user'),
    path('delete-user/<uuid:user_id>/', views.delete_user, name='delete_user'),
    path('user/<uuid:user_id>/', views.get_user_detail, name='get_user_detail'),
]