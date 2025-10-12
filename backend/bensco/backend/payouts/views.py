from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .serializers import PayoutModelSerializer
from rest_framework.response import Response
from .models import PayoutModel
from django.utils import timezone
from django.db.models import Count

# Create your views here.
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payout(request):
    serializer = PayoutModelSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(requested_by=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

#list all payouts
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_payouts(request):
    instance = PayoutModel.objects.all()
    serializer = PayoutModelSerializer(instance=instance, many=True)
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

    return Response({'message': 'Payout approved successfully'}, status=200)


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

    return Response({'message': 'Payout rejected successfully'}, status=200)


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

    payout.status = PayoutModel.StatusChoices.PAID
    payout.paid_on = timezone.now().date()
    payout.save()

    return Response({'message': 'Payout marked as paid'}, status=200)

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
def get_client_balance(request, client_id):
    """Get client's available balance for payout"""
    if request.user.role != 'collector':
        return Response({'detail': 'Only collectors can check client balance.'}, status=403)
    
    try:
        from clients.models import ClientModel
        
        client = ClientModel.objects.get(id=client_id, collector=request.user)
        available_balance = client.get_available_balance()
        
        # Get current cycle info
        current_cycle = client.savings_cycles.filter(status='active').first()
        cycle_info = None
        if current_cycle:
            from django.db.models import Sum, Count
            cycle_data = current_cycle.contributions.aggregate(
                total=Sum('amount'),
                days=Count('date', distinct=True)
            )
            commission = client.calculate_commission(
                cycle_data['total'] or 0,
                cycle_data['days'] or 0
            )
            cycle_info = {
                'total_collected': cycle_data['total'] or 0,
                'contributing_days': cycle_data['days'] or 0,
                'commission': commission,
                'cycle_length': current_cycle.cycle_length,
                'start_date': current_cycle.start_date,
            }
        
        return Response({
            'client_id': client_id,
            'client_name': client.name,
            'available_balance': available_balance,
            'is_fixed': client.is_fixed,
            'daily_amount': client.amount_daily,
            'current_cycle': cycle_info
        })
        
    except ClientModel.DoesNotExist:
        return Response({'detail': 'Client not found or not assigned to you.'}, status=404)
    except Exception as e:
        return Response({'detail': f'Error getting client balance: {str(e)}'}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_client_payout(request, client_id):
    """Request payout for a specific client with withdrawal amount"""
    if request.user.role != 'collector':
        return Response({'detail': 'Only collectors can request payouts.'}, status=403)
    
    try:
        from clients.models import ClientModel
        from contributions.models import ContributionModel
        from django.db.models import Sum, Count
        from decimal import Decimal
        
        client = ClientModel.objects.get(id=client_id, collector=request.user)
        requested_amount = Decimal(str(request.data.get('requested_amount', 0)))
        
        if requested_amount <= 0:
            return Response({'detail': 'Requested amount must be greater than 0.'}, status=400)
        
        # Check if there's already a pending payout for this client
        existing_payout = PayoutModel.objects.filter(
            client=client,
            requested_by=request.user,
            status__in=['pending', 'approved'],
            payout_type=PayoutModel.PayoutTypeChoices.CLIENT_SPECIFIC
        ).exists()
        
        if existing_payout:
            return Response({'detail': 'A payout request for this client is already pending.'}, status=400)
        
        # Get current cycle contributions
        current_cycle = client.savings_cycles.filter(status='active').first()
        if not current_cycle:
            return Response({'detail': 'No active savings cycle found for this client.'}, status=400)
        
        cycle_data = current_cycle.contributions.aggregate(
            total=Sum('amount'),
            days=Count('date', distinct=True)
        )
        
        total_collected = cycle_data['total'] or 0
        contributing_days = cycle_data['days'] or 0
        
        if total_collected <= 0:
            return Response({'detail': 'No collections found for this client.'}, status=400)
        
        # Calculate commission using new business logic
        commission = client.calculate_commission(total_collected, contributing_days)
        available_balance = client.get_available_balance()
        
        # Create payout request (validation happens in model save)
        payout = PayoutModel.objects.create(
            client=client,
            cycle=current_cycle,
            payout_type=PayoutModel.PayoutTypeChoices.CLIENT_SPECIFIC,
            requested_amount=requested_amount,
            available_balance=available_balance,
            total_paid=total_collected,
            commission=commission,
            net_payout=requested_amount,  # What they'll actually receive if approved
            requested_by=request.user
        )
        
        serializer = PayoutModelSerializer(payout)
        return Response(serializer.data, status=201)
        
    except ClientModel.DoesNotExist:
        return Response({'detail': 'Client not found or not assigned to you.'}, status=404)
    except Exception as e:
        return Response({'detail': f'Error creating payout request: {str(e)}'}, status=400)
