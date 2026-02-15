from django.urls import path
from .views import CustomTokenObtainPairView, get_worker_stats
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('get_users/', views.get_users, name='get_users'),
    path('collectors/', views.get_collectors_list, name='get_collectors_list'),
    path('collectors/<uuid:collector_id>/contributions/', views.get_collector_contributions, name='get_collector_contributions'),
    path('collector-password-reset-request/', views.collector_password_reset_request_view, name='collector_password_reset_request'),
    path('create-user/', views.create_user, name='create_user'),
    path('update-user/<uuid:user_id>/', views.update_user, name='update_user'),
    path('delete-user/<uuid:user_id>/', views.delete_user, name='delete_user'),
    path('user/<uuid:user_id>/', views.get_user_detail, name='get_user_detail'),
    path('check-deletion/<uuid:user_id>/', views.check_user_deletion, name='check_user_deletion'),
    path('<uuid:user_id>/change-password/', views.change_password, name='change_password'),
    path('stats/', get_worker_stats, name='worker-stats'),
]