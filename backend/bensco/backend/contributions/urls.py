from django.urls import path
from . import views
from .views import get_contribution_stats, get_recent_activities, get_collector_stats, get_grouped_contributions

urlpatterns = [
    path('', views.list_contributions, name='list_contributions'),
    path('create/', views.create_contribution, name='create_contribution'),
    path('client/<uuid:client_id>/', views.client_contributions, name='client_contributions'),
    path('create/bulk/', views.create_bulk_contributions, name='bulk_write'),
    path('stats/', get_contribution_stats, name='contribution-stats'),
    path('collector-stats/', get_collector_stats, name='collector-stats'),
    path('grouped/', get_grouped_contributions, name='grouped-contributions'),
    path('recent-activities/', get_recent_activities, name='recent-activities'),
]
