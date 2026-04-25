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
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    amount_min = request.query_params.get('amount_min')
    amount_max = request.query_params.get('amount_max')
    sort_by = request.query_params.get('sort_by', '-requested_on')
    
    # Base queryset with optimized select_related
    payouts = PayoutModel.objects.select_related('client', 'requested_by').all()
    
    # Apply search across ALL database records (not just current page)
    if search:
        # Search in client name, collector name, status, and amount
        search_query = Q(client__name__icontains=search) | \
                      Q(requested_by__username__icontains=search) | \
                      Q(status__icontains=search) | \
                      Q(requested_amount__icontains=search) | \
                      Q(net_payout__icontains=search) | \
                      Q(client__unique_code__icontains=search)
        payouts = payouts.filter(search_query)
        # Use search pagination for better search experience
        paginator = SearchPagination()
    else:
        # Use regular pagination for normal listing
        paginator = PayoutsPagination()
    
    # Apply advanced filters
    if status_filter and status_filter != 'all':
        payouts = payouts.filter(status=status_filter)
    
    # Date range filters
    if date_from:
        try:
            from datetime import datetime
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
            payouts = payouts.filter(requested_on__date__gte=date_from_obj)
        except ValueError:
            pass
    
    if date_to:
        try:
            from datetime import datetime
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
            payouts = payouts.filter(requested_on__date__lte=date_to_obj)
        except ValueError:
            pass
    
    # Amount range filters
    if amount_min:
        try:
            min_amount = float(amount_min)
            payouts = payouts.filter(requested_amount__gte=min_amount)
        except ValueError:
            pass
    
    if amount_max:
        try:
            max_amount = float(amount_max)
            payouts = payouts.filter(requested_amount__lte=max_amount)
        except ValueError:
            pass
    
    # Legacy date filters
    if date_filter:
        if date_filter == 'today':
            payouts = payouts.filter(requested_on__date=timezone.now().date())
        elif date_filter == 'week':
            week_start = timezone.now().date() - timezone.timedelta(days=timezone.now().date().weekday())
            payouts = payouts.filter(requested_on__date__gte=week_start)
        elif date_filter == 'month':
            month_start = timezone.now().date().replace(day=1)
            payouts = payouts.filter(requested_on__date__gte=month_start)
    
    # Legacy amount filters
    if amount_filter:
        try:
            amount_value = float(amount_filter)
            payouts = payouts.filter(requested_amount=amount_value)
        except ValueError:
            pass  # Invalid amount filter, ignore
    
    # Apply sorting
    valid_sort_fields = [
        'requested_on', '-requested_on', 'requested_amount', '-requested_amount',
        'net_payout', '-net_payout', 'status', '-status',
        'client__name', '-client__name'
    ]
    if sort_by in valid_sort_fields:
        payouts = payouts.order_by(sort_by)
    else:
        # Default sorting
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
    # Quick fix option: Skip validation flag
    skip_validation = request.data.get('skip_validation', False)
    
    try:
        payout = PayoutModel.objects.get(id=payout_id)
    except PayoutModel.DoesNotExist:
        return Response({'error': 'Payout not found'}, status=404)

    print(f"Payout found: {payout.id}, Status: {payout.status}")
    print(f"Client: {payout.client.name if payout.client else 'No client'}")
    print(f"Skip validation: {skip_validation}")

    if payout.status != PayoutModel.StatusChoices.APPROVED:
        error_msg = f'Only approved payouts can be marked as paid. Current status: {payout.status}'
        print(error_msg)
        return Response({'error': error_msg}, status=400)

    if request.user.role != 'admin':
        return Response({'error': 'Only admins can mark payouts as paid'}, status=403)

    from decimal import Decimal
    from django.db import transaction
    
    try:
        with transaction.atomic():
            print("Starting transaction...")
            
            # Mark as paid
            payout.status = PayoutModel.StatusChoices.PAID
            payout.paid_on = timezone.now().date()
            print(f"Set status to PAID and paid_on to {payout.paid_on}")
            
            # Ensure the net payout amount is properly calculated
            if not payout.net_payout or payout.net_payout <= 0:
                commission = payout.requested_amount / Decimal('31')
                payout.net_payout = payout.requested_amount - commission
                payout.commission = commission
                print(f"Calculated commission: {commission}, net payout: {payout.net_payout}")
            
            # Balance validation with debug info
            if payout.client:
                try:
                    print("=== BALANCE CALCULATION DEBUG ===")
                    
                    # Debug: Get initial balance
                    initial_balance = payout.client.initial_balance or 0
                    print(f"Initial balance: {initial_balance}")
                    
                    # Debug: Get total contributions
                    from contributions.models import ContributionModel
                    from django.db.models import Sum
                    
                    total_contributions = ContributionModel.objects.filter(
                        savings_cycle__client=payout.client
                    ).aggregate(total=Sum('amount'))['total'] or 0
                    print(f"Total contributions: {total_contributions}")
                    
                    # Debug: Get total paid out
                    total_paid_out = PayoutModel.objects.filter(
                        client=payout.client,
                        status='paid'
                    ).aggregate(total=Sum('requested_amount'))['total'] or 0
                    print(f"Total paid out: {total_paid_out}")
                    
                    # Calculate balance step by step
                    calculated_balance = Decimal(str(initial_balance)) + Decimal(str(total_contributions)) - Decimal(str(total_paid_out))
                    print(f"Calculated balance: {initial_balance} + {total_contributions} - {total_paid_out} = {calculated_balance}")
                    
                    # Get balance from method
                    current_balance = payout.client.get_available_balance()
                    print(f"Method balance: {current_balance}")
                    print(f"Requested amount: {payout.requested_amount}")
                    print(f"Balance check: {payout.requested_amount} > {current_balance} = {payout.requested_amount > current_balance}")
                    
                    # Apply validation unless skipped
                    if not skip_validation and payout.requested_amount > current_balance:
                        error_msg = f'Requested amount (₵{payout.requested_amount}) exceeds current available balance (₵{current_balance}). Use skip_validation=true to override.'
                        print(error_msg)
                        return Response({'error': error_msg}, status=400)
                    elif skip_validation and payout.requested_amount > current_balance:
                        print(f"WARNING: Balance validation skipped! Requested {payout.requested_amount} > Available {current_balance}")
                    
                    payout.available_balance = current_balance
                    print(f"Updated available_balance to: {current_balance}")
                    
                except Exception as balance_error:
                    print(f"Balance calculation failed: {balance_error}")
                    import traceback
                    traceback.print_exc()
                    
                    if not skip_validation:
                        return Response({'error': f'Error calculating client balance: {str(balance_error)}'}, status=400)
                    else:
                        print("WARNING: Balance calculation failed but validation skipped")
                        payout.available_balance = payout.requested_amount
            
            print("Saving payout...")
            payout.save()
            print(f"Payout {payout.id} saved successfully")

        print("Transaction completed successfully")
        return Response({
            'message': 'Payout marked as paid successfully',
            'payout_id': str(payout.id),
            'net_amount_paid': float(payout.net_payout),
            'validation_skipped': skip_validation
        }, status=200)
        
    except Exception as e:
        print(f"Error in mark_payout_paid: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': f'Error processing payout: {str(e)}'}, status=400)

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
def debug_client_balance(request, client_id):
    """Debug endpoint to get detailed balance calculation"""
    if request.user.role != 'admin':
        return Response({'detail': 'Only admins can access debug info'}, status=403)
    
    try:
        from clients.models import ClientModel
        client = ClientModel.objects.get(id=client_id)
        debug_info = client.get_balance_debug_info()
        return Response(debug_info, status=200)
    except ClientModel.DoesNotExist:
        return Response({'error': 'Client not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)
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
