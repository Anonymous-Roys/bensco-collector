from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from collections import defaultdict
from django.db.models import Q
from rest_framework.pagination import PageNumberPagination

from .models import ContributionModel
from .serializers import ContributionModelSerializer
from clients.models import ClientModel
from notifications.models import Notification
from users.models import UserModel


class ContributionsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50
    
    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.page_size,
            'results': data
        })


class SearchPagination(PageNumberPagination):
    """Pagination for search results - allows larger page sizes for search"""
    page_size = 50  # Larger page size for search results
    page_size_query_param = 'page_size'
    max_page_size = 200


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_contribution(request):
    data = request.data.copy()
    
    # Always record the actual collector who performed the action
    data['collector'] = request.user.id
    
    serializer = ContributionModelSerializer(data=data)

    if serializer.is_valid():
        contribution = serializer.save()
        
        # Create notification for admins
        admin_users = UserModel.objects.filter(role='admin')
        collector_name = contribution.collector.username if contribution.collector else 'Unknown'
        client_name = contribution.client.name if contribution.client else 'Unknown Client'
        
        for admin in admin_users:
            Notification.create_collection_notification(
                user=admin,
                collector_name=collector_name,
                amount=contribution.amount,
                client_name=client_name
            )
        
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
    search = request.query_params.get('search', '').strip()
    date_filter = request.query_params.get('date')
    amount_filter = request.query_params.get('amount')
    collector_filter = request.query_params.get('collector')
    client_filter = request.query_params.get('client')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    amount_min = request.query_params.get('amount_min')
    amount_max = request.query_params.get('amount_max')
    sort_by = request.query_params.get('sort_by', '-created_at')
    
    # Base queryset with optimized select_related
    if request.user.role == 'admin':
        contributions = ContributionModel.objects.select_related('client', 'collector').all()
    else:
        # Collectors only see their own contributions
        contributions = ContributionModel.objects.select_related('client', 'collector').filter(collector=request.user)
    
    # Apply search across ALL database records (not just current page)
    if search:
        # Search in client name, collector name, amount, and note
        search_query = Q(client__name__icontains=search) | \
                      Q(collector__username__icontains=search) | \
                      Q(amount__icontains=search) | \
                      Q(note__icontains=search) | \
                      Q(client__phone_number__icontains=search) | \
                      Q(client__unique_code__icontains=search)
        contributions = contributions.filter(search_query)
        # Use search pagination for better search experience
        paginator = SearchPagination()
    else:
        # Use regular pagination for normal listing
        paginator = ContributionsPagination()
    
    # Apply advanced filters
    if collector_filter and request.user.role == 'admin':
        contributions = contributions.filter(collector__id=collector_filter)
    
    if client_filter:
        contributions = contributions.filter(client__id=client_filter)
    
    # Date range filters
    if date_from:
        try:
            from datetime import datetime
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
            contributions = contributions.filter(date__gte=date_from_obj)
        except ValueError:
            pass
    
    if date_to:
        try:
            from datetime import datetime
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
            contributions = contributions.filter(date__lte=date_to_obj)
        except ValueError:
            pass
    
    # Amount range filters
    if amount_min:
        try:
            min_amount = float(amount_min)
            contributions = contributions.filter(amount__gte=min_amount)
        except ValueError:
            pass
    
    if amount_max:
        try:
            max_amount = float(amount_max)
            contributions = contributions.filter(amount__lte=max_amount)
        except ValueError:
            pass
    
    # Legacy date filters
    if date_filter:
        if date_filter == 'today':
            contributions = contributions.filter(date=timezone.now().date())
        elif date_filter == 'week':
            week_start = timezone.now().date() - timedelta(days=timezone.now().date().weekday())
            contributions = contributions.filter(date__gte=week_start)
        elif date_filter == 'month':
            month_start = timezone.now().date().replace(day=1)
            contributions = contributions.filter(date__gte=month_start)
    
    # Legacy amount filters
    if amount_filter:
        if amount_filter == 'low':
            contributions = contributions.filter(amount__lt=100)
        elif amount_filter == 'medium':
            contributions = contributions.filter(amount__gte=100, amount__lte=500)
        elif amount_filter == 'high':
            contributions = contributions.filter(amount__gt=500)
        else:
            # Try to parse as specific amount
            try:
                amount_value = float(amount_filter)
                contributions = contributions.filter(amount=amount_value)
            except ValueError:
                pass  # Invalid amount filter, ignore
    
    # Apply sorting
    valid_sort_fields = ['date', '-date', 'amount', '-amount', 'created_at', '-created_at', 'client__name', '-client__name']
    if sort_by in valid_sort_fields:
        contributions = contributions.order_by(sort_by)
    else:
        # Default sorting
        contributions = contributions.order_by('-created_at')
    
    paginated_contributions = paginator.paginate_queryset(contributions, request)
    serializer = ContributionModelSerializer(paginated_contributions, many=True)
    return paginator.get_paginated_response(serializer.data)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_contributions(request, client_id):
    try:
        client = ClientModel.objects.get(id=client_id)
    except ClientModel.DoesNotExist:
        return Response({"error": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

    from collections import defaultdict
    from datetime import datetime, timedelta
    
    # Get all contributions for this client
    contributions = ContributionModel.objects.filter(
        client=client
    ).select_related('collector').order_by('date', 'created_at')
    
    # Group contributions by date
    daily_contributions = defaultdict(list)
    daily_totals = defaultdict(float)
    
    for contrib in contributions:
        date_str = contrib.date.isoformat()
        daily_contributions[date_str].append({
            'id': str(contrib.id),
            'amount': float(contrib.amount),
            'collector_name': contrib.collector.username if contrib.collector else 'Unknown',
            'time': contrib.created_at.strftime('%H:%M'),
            'created_at': contrib.created_at.isoformat(),
            'note': contrib.note or ''
        })
        daily_totals[date_str] += float(contrib.amount)
    
    # Create complete daily history from start date to today
    if contributions.exists():
        start_date = contributions.first().date
        today = timezone.now().date()
        
        daily_history = []
        current_date = start_date
        
        while current_date <= today:
            date_str = current_date.isoformat()
            daily_history.append({
                'date': date_str,
                'total_amount': daily_totals.get(date_str, 0),
                'count': len(daily_contributions.get(date_str, [])),
                'contributions': daily_contributions.get(date_str, []),
                'has_contribution': date_str in daily_contributions
            })
            current_date += timedelta(days=1)
        
        # Reverse to show most recent first
        daily_history.reverse()
    else:
        daily_history = []
    
    # Calculate summary stats
    total_contributed = sum(daily_totals.values())
    total_days = len([d for d in daily_history if d['has_contribution']])
    average_daily = total_contributed / total_days if total_days > 0 else 0
    
    return Response({
        'client': {
            'id': client.id,
            'name': client.name,
            'start_date': contributions.first().date.isoformat() if contributions.exists() else None,
            'daily_amount': float(client.amount_daily) if client.amount_daily else 0
        },
        'summary': {
            'total_contributed': total_contributed,
            'total_days_contributed': total_days,
            'average_daily_contribution': average_daily,
            'total_days_since_start': len(daily_history)
        },
        'daily_history': daily_history
    }, status=status.HTTP_200_OK)

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
        collector_name = contrib.collector.username if contrib.collector else 'Unknown'
        client_name = contrib.client.name if contrib.client else 'Unknown Client'
        activities.append({
            'id': f'contrib-{contrib.id}',
            'activity': f'{collector_name} collected ₵{contrib.amount} from {client_name}',
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_grouped_contributions(request):
    """Get contributions grouped by date for collector with pagination"""
    if request.user.role != 'collector':
        return Response({'detail': 'Only collectors can access this endpoint'}, status=403)
    
    from django.db.models import Sum, Count
    from collections import defaultdict
    from django.core.paginator import Paginator
    
    # Get pagination parameters
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 10))
    
    # Get all contributions for this collector
    contributions = ContributionModel.objects.filter(
        collector=request.user
    ).select_related('client').order_by('-date', '-created_at')
    
    # Group by date first
    grouped = defaultdict(list)
    daily_totals = defaultdict(float)
    
    for contrib in contributions:
        date_str = contrib.date.isoformat()
        grouped[date_str].append({
            'id': str(contrib.id),
            'client_name': contrib.client.name if contrib.client else 'Unknown',
            'amount': float(contrib.amount),
            'time': contrib.created_at.strftime('%H:%M'),
            'created_at': contrib.created_at.isoformat()
        })
        daily_totals[date_str] += float(contrib.amount)
    
    # Create list of daily summaries
    daily_summaries = []
    for date_str in sorted(grouped.keys(), reverse=True):
        daily_summaries.append({
            'date': date_str,
            'total_amount': daily_totals[date_str],
            'count': len(grouped[date_str]),
            'contributions': grouped[date_str]
        })
    
    # Apply pagination to daily summaries
    paginator = Paginator(daily_summaries, page_size)
    
    try:
        paginated_data = paginator.page(page)
    except:
        paginated_data = paginator.page(1)
    
    return Response({
        'count': paginator.count,
        'next': f'?page={page + 1}&page_size={page_size}' if paginated_data.has_next() else None,
        'previous': f'?page={page - 1}&page_size={page_size}' if paginated_data.has_previous() else None,
        'total_pages': paginator.num_pages,
        'current_page': page,
        'page_size': page_size,
        'results': list(paginated_data)
    })
