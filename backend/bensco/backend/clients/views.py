from django.shortcuts import render
from .models import ClientModel, AddressModel
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import ClientModelSerializer, AddressModelSerializer, ClientUpdateSerializer
from django.shortcuts import get_object_or_404
from django.db.models import Q, Prefetch, Sum, Count
from rest_framework.pagination import PageNumberPagination
from users.models import UserModel
from core.pagination import ClientsPagination, SearchPagination
from contributions.models import ContributionModel
from payouts.models import PayoutModel
from contributions.serializers import ContributionModelSerializer
from payouts.serializers import PayoutModelSerializer

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_address(request):
    if request.user.role != 'admin':
        return Response({'detail': 'Only admins can create addresses.'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = AddressModelSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(data=serializer.data, status=status.HTTP_201_CREATED)
    return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_addresses(request):
    if request.user.role != 'admin':
        return Response({'detail': 'Only admins can view addresses.'}, status=status.HTTP_403_FORBIDDEN)
    
    addresses = AddressModel.objects.all()
    serializer = AddressModelSerializer(addresses, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_client_view(request):
    data = request.data.copy()

    # If collector is creating client, assign themselves
    if request.user.role == 'collector':
        data['collector'] = str(request.user.id)
    elif request.user.role == 'admin':
        # Admin must provide collector ID
        if 'collector' not in data:
            return Response({'detail': 'Collector ID is required.'}, status=400)
        
        # Handle 'all' collector assignment
        if data['collector'] == 'all':
            data['collector'] = None  # Set to None for shared clients
    else:
        return Response({'detail': 'Unauthorized role.'}, status=403)

    serializer = ClientModelSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_clients_view(request):
    search = request.query_params.get('search')
    collector_id = request.query_params.get('collector')
    status_filter = request.query_params.get('status')  # active/inactive
    amount_filter = request.query_params.get('amount')  # fixed/variable
    balance_min = request.query_params.get('balance_min')
    balance_max = request.query_params.get('balance_max')
    daily_amount_min = request.query_params.get('daily_amount_min')
    daily_amount_max = request.query_params.get('daily_amount_max')
    sort_by = request.query_params.get('sort_by', '-created_at')
    address_filter = request.query_params.get('address')

    # Base queryset with optimized select_related and prefetch_related
    base_queryset = ClientModel.objects.select_related(
        'collector', 'address'
    ).prefetch_related(
        Prefetch('savings_cycles', queryset=None),
        Prefetch('payoutmodel_set', queryset=None)
    )

    # Admin sees all, Collector sees their clients + shared clients (collector=None)
    if request.user.role == 'admin':
        clients = base_queryset.all()
        if collector_id:
            if collector_id == 'unassigned':
                clients = clients.filter(collector__isnull=True)
            else:
                clients = clients.filter(collector__id=collector_id)
    elif request.user.role == 'collector':
        clients = base_queryset.filter(
            Q(collector=request.user) | Q(collector__isnull=True)
        )
    else:
        return Response({'detail': 'Unauthorized role.'}, status=403)

    # Apply search across ALL database records (not just current page)
    if search:
        # Create a separate search queryset that searches the entire database
        search_clients = clients.filter(
            Q(name__icontains=search) |
            Q(phone_number__icontains=search) |
            Q(unique_code__icontains=search) |
            Q(collector__username__icontains=search) |
            Q(address__label__icontains=search)
        )
        clients = search_clients
        # Use search pagination for better search experience
        paginator = SearchPagination()
    else:
        # Use regular pagination for normal listing
        paginator = ClientsPagination()

    # Apply advanced filters
    if amount_filter:
        if amount_filter == 'fixed':
            clients = clients.filter(is_fixed=True)
        elif amount_filter == 'variable':
            clients = clients.filter(is_fixed=False)
    
    if status_filter:
        if status_filter == 'active':
            clients = clients.filter(is_active=True)
        elif status_filter == 'inactive':
            clients = clients.filter(is_active=False)
    
    if address_filter:
        clients = clients.filter(address__id=address_filter)
    
    # Daily amount range filters
    if daily_amount_min:
        try:
            min_daily = float(daily_amount_min)
            clients = clients.filter(amount_daily__gte=min_daily)
        except ValueError:
            pass
    
    if daily_amount_max:
        try:
            max_daily = float(daily_amount_max)
            clients = clients.filter(amount_daily__lte=max_daily)
        except ValueError:
            pass
    
    # Balance filters (requires calculation - use annotation for performance)
    if balance_min or balance_max:
        from django.db.models import Sum, Case, When, DecimalField
        
        # Annotate with calculated balance
        clients = clients.annotate(
            total_contributions=Sum('contributionmodel__amount'),
            total_payouts=Sum(
                Case(
                    When(payoutmodel__status='paid', then='payoutmodel__net_payout'),
                    default=0,
                    output_field=DecimalField()
                )
            ),
            calculated_balance=Case(
                When(
                    total_contributions__isnull=True,
                    then='initial_balance'
                ),
                default='initial_balance' + Sum('contributionmodel__amount') - Sum(
                    Case(
                        When(payoutmodel__status='paid', then='payoutmodel__net_payout'),
                        default=0,
                        output_field=DecimalField()
                    )
                ),
                output_field=DecimalField()
            )
        )
        
        if balance_min:
            try:
                min_balance = float(balance_min)
                clients = clients.filter(calculated_balance__gte=min_balance)
            except ValueError:
                pass
        
        if balance_max:
            try:
                max_balance = float(balance_max)
                clients = clients.filter(calculated_balance__lte=max_balance)
            except ValueError:
                pass

    # Apply sorting
    valid_sort_fields = [
        'name', '-name', 'created_at', '-created_at', 'amount_daily', '-amount_daily',
        'collector__username', '-collector__username', 'address__label', '-address__label'
    ]
    if sort_by in valid_sort_fields:
        clients = clients.order_by(sort_by)
    else:
        # Default sorting
        clients = clients.order_by('-created_at')

    paginated_clients = paginator.paginate_queryset(clients, request)
    serializer = ClientModelSerializer(paginated_clients, many=True)
    return paginator.get_paginated_response(serializer.data)

@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def client_detail(request, client_id):
    client = get_object_or_404(ClientModel, id=client_id)
    
    # Check permissions - collectors can access their own clients or shared clients
    if request.user.role == 'collector' and client.collector != request.user and client.collector is not None:
        return Response({'detail': 'You can only access your own clients or shared clients.'}, status=403)

    if request.method == "GET":
        serializer = ClientModelSerializer(client)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method in ["PUT", "PATCH"]:
        # Collectors can update their own clients or shared clients, admins can update any client
        if request.user.role == 'collector' and client.collector != request.user and client.collector is not None:
            return Response({'detail': 'You can only update your own clients or shared clients.'}, status=status.HTTP_403_FORBIDDEN)
        elif request.user.role not in ['admin', 'collector']:
            return Response({'detail': 'Unauthorized role.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Handle 'all' collector assignment for admins
        data = request.data.copy()
        if request.user.role == 'admin' and data.get('collector') == 'all':
            data['collector'] = None  # Set to None for shared clients
        
        # Use update serializer for updates (prevents start_date modification)
        serializer = ClientUpdateSerializer(client, data=data, partial=request.method == "PATCH")
            
        if serializer.is_valid():
            try:
                serializer.save()
                # Return full client data
                response_serializer = ClientModelSerializer(client)
                return Response(response_serializer.data, status=status.HTTP_200_OK)
            except Exception as e:
                import traceback
                print(f"Client update error: {str(e)}")
                print(f"Traceback: {traceback.format_exc()}")
                return Response({'detail': f'Error saving client: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            print(f"Serializer errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == "DELETE":
        # Only admins can delete clients
        if request.user.role != 'admin':
            return Response({'detail': 'Only admins can delete clients.'}, status=status.HTTP_403_FORBIDDEN)
        
        client.delete()
        return Response({'detail': 'Client deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def assign_collector(request, client_id):
    """Assign a client to a different collector"""
    if request.user.role != 'admin':
        return Response({'detail': 'Only admins can assign collectors.'}, status=status.HTTP_403_FORBIDDEN)
    
    client = get_object_or_404(ClientModel, id=client_id)
    collector_id = request.data.get('collector_id')
    
    if not collector_id:
        return Response({'detail': 'Collector ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        collector = UserModel.objects.get(id=collector_id, role='collector')
        client.collector = collector
        client.save()
        
        serializer = ClientModelSerializer(client)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except UserModel.DoesNotExist:
        return Response({'detail': 'Collector not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_collectors(request):
    """Get list of available collectors for assignment"""
    if request.user.role != 'admin':
        return Response({'detail': 'Only admins can view collectors.'}, status=status.HTTP_403_FORBIDDEN)
    
    collectors = UserModel.objects.filter(role='collector', is_active=True).values('id', 'username', 'email', 'assigned_zone')
    return Response(collectors, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_clients_view(request):
    """Dedicated search endpoint that searches entire database"""
    search = request.query_params.get('q', '').strip()
    collector_id = request.query_params.get('collector')
    amount_filter = request.query_params.get('amount')  # fixed/variable
    
    if not search:
        return Response({'detail': 'Search query is required.'}, status=400)
    
    # Base queryset with optimizations
    base_queryset = ClientModel.objects.select_related(
        'collector', 'address'
    ).only(
        'id', 'name', 'phone_number', 'unique_code', 'is_fixed', 
        'amount_daily', 'created_at', 'collector__username', 'address__label'
    )
    
    # Permission-based filtering
    if request.user.role == 'admin':
        clients = base_queryset.all()
        if collector_id:
            clients = clients.filter(collector__id=collector_id)
    elif request.user.role == 'collector':
        clients = base_queryset.filter(
            Q(collector=request.user) | Q(collector__isnull=True)
        )
    else:
        return Response({'detail': 'Unauthorized role.'}, status=403)
    
    # Search across multiple fields
    search_query = Q(name__icontains=search) | Q(phone_number__icontains=search) | Q(unique_code__icontains=search)
    
    # Add collector name search for admins
    if request.user.role == 'admin':
        search_query |= Q(collector__username__icontains=search)
    
    clients = clients.filter(search_query)
    
    # Apply filters
    if amount_filter:
        if amount_filter == 'fixed':
            clients = clients.filter(is_fixed=True)
        elif amount_filter == 'variable':
            clients = clients.filter(is_fixed=False)
    
    # Order by relevance (exact matches first, then partial matches)
    clients = clients.order_by('-created_at')
    
    # Use search pagination
    paginator = SearchPagination()
    paginated_clients = paginator.paginate_queryset(clients, request)
    serializer = ClientModelSerializer(paginated_clients, many=True)
    
    return paginator.get_paginated_response(serializer.data)

# Legacy endpoint for backward compatibility
@api_view(['GET', 'PATCH'])
def client_profile(request, id):
    return client_detail(request, id)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_client_stats(request):
    """Get client statistics for dashboard"""
    if request.user.role != 'admin':
        return Response({'detail': 'Only admins can view client stats.'}, status=403)
    
    # Get total counts
    total_clients = ClientModel.objects.count()
    active_clients = ClientModel.objects.filter(is_active=True).count()
    fixed_clients = ClientModel.objects.filter(is_fixed=True).count()
    variable_clients = ClientModel.objects.filter(is_fixed=False).count()
    
    # Get total balances
    total_contributions = ContributionModel.objects.aggregate(total=Sum('amount'))['total'] or 0
    total_payouts = PayoutModel.objects.filter(status='paid').aggregate(total=Sum('net_payout'))['total'] or 0
    
    return Response({
        'total_clients': total_clients,
        'active_clients': active_clients,
        'fixed_clients': fixed_clients,
        'variable_clients': variable_clients,
        'total_contributions': total_contributions,
        'total_payouts': total_payouts,
        'net_balance': total_contributions - total_payouts
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_client_transactions(request, client_id):
    """Get combined transactions (contributions + payouts) for a specific client"""
    try:
        client = get_object_or_404(ClientModel, id=client_id)
        
        # Check permissions
        if request.user.role == 'collector' and client.collector != request.user and client.collector is not None:
            return Response({'detail': 'You can only access transactions for your own clients or shared clients.'}, status=403)
        
        # Get contributions
        contributions = ContributionModel.objects.filter(client=client).select_related('collector')
        
        # Get payouts
        payouts = PayoutModel.objects.filter(client=client).select_related('requested_by', 'approved_by')
        
        # Combine and format transactions
        transactions = []
        
        # Add contributions
        for contrib in contributions:
            transactions.append({
                'id': str(contrib.id),
                'type': 'contribution',
                'amount': float(contrib.amount),
                'date': contrib.date.isoformat(),
                'created_at': contrib.created_at.isoformat(),
                'collector': contrib.collector.username if contrib.collector else None,
                'note': contrib.note or '',
                'status': 'completed'
            })
        
        # Add payouts
        for payout in payouts:
            transactions.append({
                'id': str(payout.id),
                'type': 'payout',
                'amount': -float(payout.net_payout) if payout.net_payout else -float(payout.requested_amount),
                'date': (payout.paid_on or payout.approved_on or payout.requested_on).isoformat(),
                'created_at': payout.requested_on.isoformat(),
                'collector': payout.requested_by.username if payout.requested_by else None,
                'note': f'Payout - {payout.status}',
                'status': payout.status
            })
        
        # Sort by date (newest first)
        transactions.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Pagination
        paginator = SearchPagination()
        page = paginator.paginate_queryset(transactions, request)
        
        return paginator.get_paginated_response(page)
        
    except Exception as e:
        return Response({'detail': f'Error fetching transactions: {str(e)}'}, status=400)