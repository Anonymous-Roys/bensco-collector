from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta

from .models import ContributionModel
from .serializers import ContributionModelSerializer
from clients.models import ClientModel


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_contribution(request):
    data = request.data.copy()
    
    # Always record the actual collector who performed the action
    data['collector'] = request.user.id
    
    serializer = ContributionModelSerializer(data=data)

    if serializer.is_valid():
        contribution = serializer.save()
        return Response(ContributionModelSerializer(contribution).data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_bulk_contributions(request):
    data = request.data
    
    # Always record the actual collector for each contribution
    if isinstance(data, list):
        for item in data:
            item['collector'] = request.user.id
    
    serialized = ContributionModelSerializer(data=data, many=True)
    if not serialized.is_valid():
        return Response(data=serialized.error_messages,status=status.HTTP_400_BAD_REQUEST)
    serialized.save()
    return Response(data=serialized.data, status=status.HTTP_201_CREATED)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_contributions(request):
    if request.user.role == 'admin':
        contributions = ContributionModel.objects.all().order_by('-created_at')
    else:
        # Collectors only see their own contributions
        contributions = ContributionModel.objects.filter(collector=request.user).order_by('-created_at')
    
    serializer = ContributionModelSerializer(contributions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_contributions(request, client_id):
    try:
        client = ClientModel.objects.get(id=client_id)
    except ClientModel.DoesNotExist:
        return Response({"error": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

    contributions = ContributionModel.objects.filter(client=client).order_by('-date')
    serializer = ContributionModelSerializer(contributions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_contribution_stats(request):
    """Get statistics about contributions/collections"""
    if request.user.role != 'admin':
        return Response({'detail': 'Not authorized'}, status=403)
    
    today = timezone.now().date()
    month_start = today.replace(day=1)
    last_month_end = month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)
    week_start = today - timedelta(days=today.weekday())
    last_week_end = week_start - timedelta(days=1)
    last_week_start = last_week_end - timedelta(days=6)

    # Today's collections
    today_total = ContributionModel.objects.filter(
        date=today
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Monthly stats
    this_month_total = ContributionModel.objects.filter(
        date__gte=month_start
    ).aggregate(total=Sum('amount'))['total'] or 0

    last_month_total = ContributionModel.objects.filter(
        date__gte=last_month_start,
        date__lte=last_month_end
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Weekly stats
    this_week_total = ContributionModel.objects.filter(
        date__gte=week_start
    ).aggregate(total=Sum('amount'))['total'] or 0

    last_week_total = ContributionModel.objects.filter(
        date__gte=last_week_start,
        date__lte=last_week_end
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Calculate growth
    monthly_growth = this_month_total - last_month_total
    monthly_growth_percentage = (
        ((this_month_total / last_month_total) - 1) * 100
        if last_month_total > 0 else 0
    )

    weekly_growth = this_week_total - last_week_total
    weekly_growth_percentage = (
        ((this_week_total / last_week_total) - 1) * 100
        if last_week_total > 0 else 0
    )

    # Today's collections count
    today_count = ContributionModel.objects.filter(
        date=today
    ).count()

    return Response({
        'today_total': today_total,
        'today_count': today_count,
        'monthly_growth': monthly_growth,
        'monthly_growth_percentage': monthly_growth_percentage,
        'weekly_growth': weekly_growth,
        'weekly_growth_percentage': weekly_growth_percentage,
        'this_month_total': this_month_total,
        'this_week_total': this_week_total
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recent_activities(request):
    """Get recent activities for dashboard"""
    if request.user.role != 'admin':
        return Response({'detail': 'Not authorized'}, status=403)
    
    activities = []
    today = timezone.now().date()
    
    # Recent contributions
    recent_contributions = ContributionModel.objects.filter(
        date__gte=today - timedelta(days=7)
    ).order_by('-created_at')[:5]
    
    for contrib in recent_contributions:
        activities.append({
            'id': f'contrib-{contrib.id}',
            'activity': f'₵{contrib.amount} collected from {contrib.client.name if hasattr(contrib, "client") else "client"}',
            'time': contrib.created_at.strftime('%H:%M'),
            'type': 'collection',
            'date': contrib.date.isoformat()
        })
    
    return Response({
        'activities': activities[:10]  # Limit to 10 most recent
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_collector_stats(request):
    """Get statistics for the logged-in collector"""
    if request.user.role != 'collector':
        return Response({'detail': 'Only collectors can access this endpoint'}, status=403)
    
    today = timezone.now().date()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=today.weekday())

    # Today's collections by this collector
    today_total = ContributionModel.objects.filter(
        collector=request.user,
        date=today
    ).aggregate(total=Sum('amount'))['total'] or 0

    today_count = ContributionModel.objects.filter(
        collector=request.user,
        date=today
    ).count()

    # This month's collections by this collector
    this_month_total = ContributionModel.objects.filter(
        collector=request.user,
        date__gte=month_start
    ).aggregate(total=Sum('amount'))['total'] or 0

    # This week's collections by this collector
    this_week_total = ContributionModel.objects.filter(
        collector=request.user,
        date__gte=week_start
    ).aggregate(total=Sum('amount'))['total'] or 0

    return Response({
        'today_total': today_total,
        'today_count': today_count,
        'this_month_total': this_month_total,
        'this_week_total': this_week_total
    })
