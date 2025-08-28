from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import ContributionModel
from .serializers import ContributionModelSerializer
from clients.models import ClientModel


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_contribution(request):
    data = request.data
    serializer = ContributionModelSerializer(data=data)

    if serializer.is_valid():
        contribution = serializer.save()
        return Response(ContributionModelSerializer(contribution).data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_bulk_contributions(request):
    data = request.data
    serialized = ContributionModelSerializer(data=data, many=True)
    if not serialized.is_valid():
        return Response(data=serialized.error_messages,status=status.HTTP_400_BAD_REQUEST)
    serialized.save()
    return Response(data=serialized.data, status=status.HTTP_201_CREATED)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_contributions(request):
    contributions = ContributionModel.objects.all().order_by('-created_at')
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
