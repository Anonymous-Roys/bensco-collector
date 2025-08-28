from django.shortcuts import render
from .models import ClientModel, AddressModel
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import ClientModelSerializer
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.pagination import PageNumberPagination
from .serializers import AddressModelSerializer
# Create your views here.


@api_view(['POST'])
def create_address(request):
    serializer = AddressModelSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(data=serializer.data, status=status.HTTP_201_CREATED)
    return Response(data=serializer.errors, status=status.HTTP_400_BAD_REQUEST)



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
        pass
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

    # Admin sees all, Collector sees only their clients
    if request.user.role == 'admin':
        clients = ClientModel.objects.all()
        if collector_id:
            clients = clients.filter(collector__id=collector_id)
    elif request.user.role == 'collector':
        clients = ClientModel.objects.filter(collector=request.user)
    else:
        return Response({'detail': 'Unauthorized role.'}, status=403)

    # Apply search (name or phone)
    if search:
        clients = clients.filter(
            Q(name__icontains=search) |
            Q(phone_number__icontains=search)
        )

    paginator = PageNumberPagination()
    paginted_clients = paginator.paginate_queryset(clients, request)
    serializer = ClientModelSerializer(paginted_clients, many=True)
    return paginator.get_paginated_response(serializer.data)

#Get Client Info
@api_view(['GET', 'PATCH'])
def client_profile(request, id):
    client_data = get_object_or_404(ClientModel, id=id)

    if request.method == "GET":
        serialized = ClientModelSerializer(instance=client_data)
        return Response(data=serialized.data, status=status.HTTP_200_OK)
    elif request.method == "PATCH":
        data = request.data
        client_data = ClientModel.objects.get(id=id)
        serialized = ClientModelSerializer(data=data, instance=client_data, partial=True)
        if serialized.is_valid():
            serialized.save()
            return Response(data=serialized.data, status=status.HTTP_202_ACCEPTED)
        return Response(data={'error': 'Could not make changes'}, status=status.HTTP_406_NOT_ACCEPTABLE)
        pass
    pass