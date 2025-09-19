from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_notifications, name='get_notifications'),
    path('create/', views.create_notification, name='create_notification'),
    path('unread-count/', views.get_unread_count, name='get_unread_count'),
    path('mark-all-read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('delete-all/', views.delete_all_notifications, name='delete_all_notifications'),
    path('<uuid:notification_id>/mark-read/', views.mark_notification_read, name='mark_notification_read'),
    path('<uuid:notification_id>/delete/', views.delete_notification, name='delete_notification'),
]
