import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.core.paginator import Paginator
from .models import Notification
from .serializers import NotificationSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """Get notifications for the authenticated user"""
    try:
        # Get query parameters
        read = request.GET.get('read')
        type_filter = request.GET.get('type')
        limit = int(request.GET.get('limit', 50))
        offset = int(request.GET.get('offset', 0))
        
        # Build query
        query = Q(user=request.user)
        
        if read is not None:
            query &= Q(read=read.lower() == 'true')
        
        if type_filter:
            query &= Q(type=type_filter)
        
        # Get notifications
        notifications = Notification.objects.filter(query).order_by('-created_at')
        
        # Apply pagination
        paginator = Paginator(notifications, limit)
        page = (offset // limit) + 1
        page_notifications = paginator.get_page(page)
        
        serializer = NotificationSerializer(page_notifications, many=True)
        
        return Response({
            'results': serializer.data,
            'count': paginator.count,
            'next': page_notifications.has_next(),
            'previous': page_notifications.has_previous(),
            'unread_count': Notification.objects.filter(user=request.user, read=False).count()
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark a specific notification as read"""
    try:
        notification = Notification.objects.get(
            id=notification_id, 
            user=request.user
        )
        notification.mark_as_read()
        
        return Response({
            'message': 'Notification marked as read',
            'notification': NotificationSerializer(notification).data
        })
        
    except Notification.DoesNotExist:
        return Response(
            {'error': 'Notification not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """Mark all notifications as read for the authenticated user"""
    try:
        updated_count = Notification.objects.filter(
            user=request.user, 
            read=False
        ).update(read=True)
        
        return Response({
            'message': f'{updated_count} notifications marked as read'
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unread_count(request):
    """Get unread notification count for the authenticated user"""
    try:
        count = Notification.objects.filter(
            user=request.user, 
            read=False
        ).count()
        
        return Response({'unread_count': count})
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    """Delete a specific notification"""
    try:
        notification = Notification.objects.get(
            id=notification_id, 
            user=request.user
        )
        notification.delete()
        
        return Response({'message': 'Notification deleted'})
        
    except Notification.DoesNotExist:
        return Response(
            {'error': 'Notification not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_all_notifications(request):
    """Delete all notifications for the authenticated user"""
    try:
        deleted_count = Notification.objects.filter(user=request.user).count()
        Notification.objects.filter(user=request.user).delete()
        
        return Response({
            'message': f'{deleted_count} notifications deleted'
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_notification(request):
    """Create a new notification (admin only)"""
    try:
        # Check if user is admin
        if not request.user.role == 'admin':
            return Response(
                {'error': 'Only admins can create notifications'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create notification directly
        notification = Notification.objects.create(
            user=request.user,
            title=request.data.get('title', 'Notification'),
            message=request.data.get('message', ''),
            type=request.data.get('type', 'info'),
            action_url=request.data.get('action_url', ''),
            action_text=request.data.get('action_text', '')
        )
        
        return Response(
            NotificationSerializer(notification).data,
            status=status.HTTP_201_CREATED
        )
            
    except Exception as e:
        print(f"Notification creation error: {str(e)}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
