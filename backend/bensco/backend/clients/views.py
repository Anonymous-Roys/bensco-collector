from django.shortcuts import render
from .models import ClientModel, AddressModel
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import ClientModelSerializer, AddressModelSerializer
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.pagination import PageNumberPagination
from users.models import UserModel

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

    # Admin sees all, Collector sees only their clients
    if request.user.role == 'admin':
        clients = ClientModel.objects.all()
        if collector_id:
            clients = clients.filter(collector__id=collector_id)
    elif request.user.role == 'collector':
        # clients = ClientModel.objects.filter(collector=request.user)
        clients = ClientModel.objects.all()
    else:
        return Response({'detail': 'Unauthorized role.'}, status=403)

    # Apply search (name, phone, or unique_code)
    if search:
        clients = clients.filter(
            Q(name__icontains=search) |
            Q(phone_number__icontains=search) |
            Q(unique_code__icontains=search)
        )

    # Apply filters
    if amount_filter:
        if amount_filter == 'fixed':
            clients = clients.filter(is_fixed=True)
        elif amount_filter == 'variable':
            clients = clients.filter(is_fixed=False)

    # Order by creation date (newest first)
    clients = clients.order_by('-created_at')

    paginator = PageNumberPagination()
    paginated_clients = paginator.paginate_queryset(clients, request)
    serializer = ClientModelSerializer(paginated_clients, many=True)
    return paginator.get_paginated_response(serializer.data)

@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def client_detail(request, client_id):
    client = get_object_or_404(ClientModel, id=client_id)
    
    # Check permissions
    if request.user.role == 'collector' and client.collector != request.user:
        return Response({'detail': 'You can only access your own clients.'}, status=403)

    if request.method == "GET":
        serializer = ClientModelSerializer(client)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method in ["PUT", "PATCH"]:
        # Collectors can update their own clients, admins can update any client
        if request.user.role == 'collector' and client.collector != request.user:
            return Response({'detail': 'You can only update your own clients.'}, status=status.HTTP_403_FORBIDDEN)
        elif request.user.role not in ['admin', 'collector']:
            return Response({'detail': 'Unauthorized role.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Use basic serializer for updates
        serializer = ClientModelSerializer(client, data=request.data, partial=request.method == "PATCH")
            
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

# Legacy endpoint for backward compatibility
@api_view(['GET', 'PATCH'])
def client_profile(request, id):
    return client_detail(request, id)