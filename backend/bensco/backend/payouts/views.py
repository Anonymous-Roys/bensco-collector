from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .serializers import PayoutModelSerializer
from rest_framework.response import Response
from .models import PayoutModel
from django.utils import timezone
from django.db.models import Count, Sum, Q
from rest_framework.pagination import PageNumberPagination

class PayoutsPagination(PageNumberPagination):
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

# Create your views here.
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payout(request):
    serializer = PayoutModelSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(requested_by=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

#list all payouts with filtering
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_payouts(request):
    if request.user.role != 'admin':
        return Response({'detail': 'Only admins can view all payouts.'}, status=403)
    
    search = request.query_params.get('search', '').strip()
    status_filter = request.query_params.get('status')
    date_filter = request.query_params.get('date')
    amount_filter = request.query_params.get('amount')
    
    # Base queryset
    payouts = PayoutModel.objects.select_related('client', 'requested_by').all()
    
    # Apply search across ALL database records (not just current page)
    if search:
        # Search in client name, collector name, status, and amount
        search_query = Q(client__name__icontains=search) | \
                      Q(requested_by__username__icontains=search) | \
                      Q(status__icontains=search) | \
                      Q(requested_amount__icontains=search) | \
                      Q(net_payout__icontains=search)
        payouts = payouts.filter(search_query)
        # Use search pagination for better search experience
        paginator = SearchPagination()
    else:
        # Use regular pagination for normal listing
        paginator = PayoutsPagination()
    
    # Apply filters
    if status_filter and status_filter != 'all':
        payouts = payouts.filter(status=status_filter)
    
    if date_filter:
        if date_filter == 'today':
            payouts = payouts.filter(requested_on__date=timezone.now().date())
        elif date_filter == 'week':
            week_start = timezone.now().date() - timezone.timedelta(days=timezone.now().date().weekday())
            payouts = payouts.filter(requested_on__date__gte=week_start)
        elif date_filter == 'month':
            month_start = timezone.now().date().replace(day=1)
            payouts = payouts.filter(requested_on__date__gte=month_start)
    
    if amount_filter:
        try:
            amount_value = float(amount_filter)
            payouts = payouts.filter(requested_amount=amount_value)
        except ValueError:
            pass  # Invalid amount filter, ignore
    
    # Order by most recent first
    payouts = payouts.order_by('-requested_on')
    
    paginated_payouts = paginator.paginate_queryset(payouts, request)
    serializer = PayoutModelSerializer(paginated_payouts, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_payout(request, payout_id):
    try:
        payout = PayoutModel.objects.get(id=payout_id)
    except PayoutModel.DoesNotExist:
        return Response({'error': 'Payout not found'}, status=404)

    if payout.status != PayoutModel.StatusChoices.PENDING:
        return Response({'error': 'Only pending payouts can be approved'}, status=400)

    if request.user.role != 'admin':
        return Response({'error': 'Only admins can approve payouts'}, status=403)

    payout.status = PayoutModel.StatusChoices.APPROVED
    payout.approved_by = request.user
    payout.approved_on = timezone.now().date()
    payout.save()

    serializer = PayoutModelSerializer(payout)
    return Response(serializer.data, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_payout(request, payout_id):
    try:
        payout = PayoutModel.objects.get(id=payout_id)
    except PayoutModel.DoesNotExist:
        return Response({'error': 'Payout not found'}, status=404)

    if payout.status != PayoutModel.StatusChoices.PENDING:
        return Response({'error': 'Only pending payouts can be rejected'}, status=400)

    if request.user.role != 'admin':
        return Response({'error': 'Only admins can reject payouts'}, status=403)

    reason = request.data.get('reason', '')
    if not reason:
        return Response({'error': 'Rejection reason is required'}, status=400)

    payout.status = PayoutModel.StatusChoices.REJECTED
    payout.approved_by = request.user
    payout.approved_on = timezone.now().date()
    payout.rejection_reason = reason
    payout.save()

    serializer = PayoutModelSerializer(payout)
    return Response(serializer.data, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_payout_paid(request, payout_id):
    try:
        payout = PayoutModel.objects.get(id=payout_id)
    except PayoutModel.DoesNotExist:
        return Response({'error': 'Payout not found'}, status=404)

    if payout.status != PayoutModel.StatusChoices.APPROVED:
        return Response({'error': 'Only approved payouts can be marked as paid'}, status=400)

    if request.user.role != 'admin':
        return Response({'error': 'Only admins can mark payouts as paid'}, status=403)

    from decimal import Decimal
    from django.db import transaction
    
    with transaction.atomic():
        # Mark as paid
        payout.status = PayoutModel.StatusChoices.PAID
        payout.paid_on = timezone.now().date()
        
        # Ensure the net payout amount is properly calculated
        if not payout.net_payout or payout.net_payout <= 0:
            commission = payout.requested_amount / Decimal('31')
            payout.net_payout = payout.requested_amount - commission
            payout.commission = commission
        
        # Update the available balance snapshot at time of payment
        if payout.client:
            # Get current balance before this payout
            current_balance = payout.client.get_available_balance()
            
            # Verify the payout is still valid (balance hasn't changed)
            if payout.requested_amount > current_balance:
                return Response({
                    'error': f'Requested amount (₵{payout.requested_amount}) exceeds current available balance (₵{current_balance}). Please review the payout.'
                }, status=400)
            
            # Update the available balance field to reflect balance at time of payment
            payout.available_balance = current_balance
        
        payout.save()

    return Response({
        'message': 'Payout marked as paid and deducted from client balance',
        'payout_id': str(payout.id),
        'net_amount_paid': float(payout.net_payout),
        'remaining_balance': float(payout.client.get_available_balance() if payout.client else 0)
    }, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payout_stats(request):
    """Get statistics about payouts"""
    if request.user.role != 'admin':
        return Response({'detail': 'Not authorized'}, status=403)
    
    pending_count = PayoutModel.objects.filter(status=PayoutModel.StatusChoices.PENDING).count()
    
    return Response({
        'pending_count': pending_count
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_collector_payouts(request):
    """Get payouts for clients accessible to the collector (assigned or shared)"""
    if request.user.role != 'collector':
        return Response({'detail': 'Only collectors can view their payouts.'}, status=403)

    # Collect payouts where:
    # - the client is assigned to the requesting collector
    # - OR the client is shared (collector is null)
    # - OR the payout was requested by the collector themselves
    payouts = PayoutModel.objects.filter(
        Q(client__collector=request.user) | Q(client__collector__isnull=True) | Q(requested_by=request.user)
    ).order_by('-requested_on')

    # optional status filter
    status_filter = request.query_params.get('status')
    if status_filter:
        payouts = payouts.filter(status=status_filter)

    serializer = PayoutModelSerializer(payouts, many=True)
    return Response(serializer.data, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_client_balance(request, client_id):
    """Get client's available balance for payout"""
    if request.user.role != 'collector':
        return Response({'detail': 'Only collectors can check client balance.'}, status=403)
    
    try:
        from clients.models import ClientModel
        from django.db.models import Q
        
        # Allow access to assigned clients or shared clients (collector=None)
        client = ClientModel.objects.filter(
            Q(id=client_id) & (Q(collector=request.user) | Q(collector__isnull=True))
        ).first()
        
        if not client:
            return Response({'detail': 'Client not found or not accessible to you.'}, status=404)
            
        available_balance = client.get_available_balance()
        
        # Get current cycle info
        current_cycle = client.savings_cycles.filter(status='active').first()
        cycle_info = None
        if current_cycle:
            from django.db.models import Sum, Count
            cycle_data = current_cycle.contributions.aggregate(
                total=Sum('amount'),
                days=Sum('days_covered')
            )
            # Commission will be calculated at payout time as requested_amount / 31
            commission = 0  # Not calculated here anymore
            cycle_info = {
                'id': str(current_cycle.id),
                'status': current_cycle.status,
                'total_collected': float(cycle_data['total'] or 0),
                'contributing_days': cycle_data['days'] or 0,
                'commission': float(commission),
                'cycle_length': current_cycle.cycle_length,
                'start_date': current_cycle.start_date.isoformat() if current_cycle.start_date else None,
                'end_date': current_cycle.end_date.isoformat() if current_cycle.end_date else None,
                'progress_percentage': min((cycle_data['days'] or 0) / current_cycle.cycle_length * 100, 100),
                'business_days_passed': cycle_data['days'] or 0,
                'can_close': (cycle_data['days'] or 0) >= current_cycle.cycle_length,
            }
        
        return Response({
            'client_id': client_id,
            'client_name': client.name,
            'available_balance': available_balance,
            'is_fixed': client.is_fixed,
            'daily_amount': client.amount_daily,
            'current_cycle': cycle_info
        })
        
    except Exception as e:
        return Response({'detail': f'Error getting client balance: {str(e)}'}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_client_payout(request, client_id):
    """Request payout for a specific client with withdrawal amount"""
    print(f"Payout request data: {request.data}")
    print(f"Client ID: {client_id}")
    print(f"User: {request.user}")
    
    if request.user.role != 'collector':
        return Response({'detail': 'Only collectors can request payouts.'}, status=403)
    
    try:
        from clients.models import ClientModel
        from contributions.models import ContributionModel
        from django.db.models import Sum, Count, Q
        from decimal import Decimal
        
        # Allow access to assigned clients or shared clients (collector=None)
        client = ClientModel.objects.filter(
            Q(id=client_id) & (Q(collector=request.user) | Q(collector__isnull=True))
        ).first()
        
        if not client:
            return Response({'detail': 'Client not found or not accessible to you.'}, status=404)
        requested_amount_data = request.data.get('requested_amount')
        if not requested_amount_data:
            return Response({'detail': 'Requested amount is required.'}, status=400)
            
        try:
            requested_amount = Decimal(str(requested_amount_data))
        except (ValueError, TypeError):
            return Response({'detail': 'Invalid requested amount format.'}, status=400)
        
        if requested_amount <= 0:
            return Response({'detail': 'Requested amount must be greater than 0.'}, status=400)
        
        # Check if there's already a pending/approved payout for this client
        existing_payout = PayoutModel.objects.filter(
            client=client,
            status__in=['pending', 'approved'],
            payout_type=PayoutModel.PayoutTypeChoices.CLIENT_SPECIFIC
        ).exists()
        
        if existing_payout:
            return Response({'detail': 'A payout request for this client is already pending or approved.'}, status=400)
        
        # Get available balance (works across all cycles)
        available_balance = client.get_available_balance()
        
        if available_balance <= 0:
            return Response({'detail': 'Client has no available balance for payout.'}, status=400)
        
        # Validate requested amount against available balance
        if requested_amount > available_balance:
            return Response({'detail': f'Requested amount (₵{requested_amount}) exceeds available balance (₵{available_balance}).'}, status=400)
        
        # Get or create current cycle for reference (but payout works regardless)
        current_cycle = client.get_current_cycle()
        
        # Calculate commission: requested_amount / 31
        commission = requested_amount / Decimal('31')
        
        # Calculate net payout (what client receives)
        net_payout = requested_amount - commission
        
        # Create payout request
        payout = PayoutModel.objects.create(
            client=client,
            cycle=current_cycle,
            payout_type=PayoutModel.PayoutTypeChoices.CLIENT_SPECIFIC,
            requested_amount=requested_amount,
            available_balance=available_balance,
            total_paid=available_balance,  # Total available across all cycles
            commission=commission,
            net_payout=net_payout,
            requested_by=request.user
        )
        
        serializer = PayoutModelSerializer(payout)
        return Response(serializer.data, status=201)
        
    except Exception as e:
        return Response({'detail': f'Error creating payout request: {str(e)}'}, status=400)
