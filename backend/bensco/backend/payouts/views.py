from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .serializers import PayoutModelSerializer
from rest_framework.response import Response
from .models import PayoutModel
from django.utils import timezone
from django.db.models import Count, Sum, Q

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
    
    payouts = PayoutModel.objects.all()
    
    # Apply filters
    status_filter = request.query_params.get('status')
    if status_filter:
        payouts = payouts.filter(status=status_filter)
    
    client_filter = request.query_params.get('client')
    if client_filter:
        payouts = payouts.filter(client__name__icontains=client_filter)
    
    collector_filter = request.query_params.get('collector')
    if collector_filter:
        payouts = payouts.filter(requested_by__username__icontains=collector_filter)
    
    # Order by most recent first
    payouts = payouts.order_by('-requested_on')
    
    serializer = PayoutModelSerializer(payouts, many=True)
    return Response(serializer.data, status=200)


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

    # Mark as paid - the payout record itself tracks the deduction
    payout.status = PayoutModel.StatusChoices.PAID
    payout.paid_on = timezone.now().date()
    payout.save()
    
    # If the payout exceeds the available amount in the cycle, deduct the
    # excess from the client's initial_balance so the overall available
    # balance decreases appropriately.
    try:
        from decimal import Decimal
        # Calculate cycle available before this payout is considered paid
        cycle = payout.cycle
        client = payout.client

        # total saved for the cycle
        cycle_total = cycle.total_saved or Decimal('0')
        # commission for the cycle
        cycle_days = cycle.contributions.aggregate(days=Sum('days_covered'))['days'] or 0
        commission = client.calculate_commission(cycle_total, cycle_days)

        # sum of already paid payouts on this cycle (exclude this payout)
        paid_out_on_cycle = cycle.payouts.filter(status=PayoutModel.StatusChoices.PAID).exclude(id=payout.id).aggregate(total=Sum('net_payout'))['total'] or Decimal('0')

        cycle_available = max(Decimal(cycle_total) - Decimal(commission) - Decimal(paid_out_on_cycle), Decimal('0'))

        excess = Decimal(payout.net_payout) - cycle_available
        if excess > 0 and client and (client.initial_balance or Decimal('0')) > 0:
            deduct = min(excess, Decimal(client.initial_balance))
            client.initial_balance = Decimal(client.initial_balance) - deduct
            client.save()

        # Refresh payout.available_balance to reflect post-payment state
        payout.available_balance = client.get_available_balance() if client else payout.available_balance
        payout.save()
    except Exception as e:
        # Log and continue; payout already marked as paid
        print(f"Error adjusting initial_balance after payout paid: {e}")

    return Response({'message': 'Payout marked as paid and deducted from client balance'}, status=200)

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
            commission = client.calculate_commission(
                cycle_data['total'] or 0,
                cycle_data['days'] or 0
            )
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
        
        # Get current cycle contributions
        current_cycle = client.savings_cycles.filter(status='active').first()
        if not current_cycle:
            return Response({'detail': 'No active savings cycle found for this client.'}, status=400)
        
        cycle_data = current_cycle.contributions.aggregate(
            total=Sum('amount'),
            days=Sum('days_covered')
        )
        
        total_collected = cycle_data['total'] or 0
        contributing_days = cycle_data['days'] or 0
        
        if total_collected <= 0:
            return Response({'detail': 'No collections found for this client.'}, status=400)
        
        # Calculate commission using new business logic
        commission = client.calculate_commission(total_collected, contributing_days)
        available_balance = client.get_available_balance()
        

        
        # Create payout request
        payout = PayoutModel.objects.create(
            client=client,
            cycle=current_cycle,
            payout_type=PayoutModel.PayoutTypeChoices.CLIENT_SPECIFIC,
            requested_amount=requested_amount,
            available_balance=available_balance,
            total_paid=total_collected,
            commission=commission,
            net_payout=min(requested_amount, available_balance),
            requested_by=request.user
        )
        
        serializer = PayoutModelSerializer(payout)
        return Response(serializer.data, status=201)
        
    except Exception as e:
        return Response({'detail': f'Error creating payout request: {str(e)}'}, status=400)
