from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from clients.models import ClientModel
from .models import SavingsCycleModel
from .serializers import SavingsCycleSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_client_cycles(request, client_id):
    """Get all cycles for a specific client"""
    try:
        client = get_object_or_404(ClientModel, id=client_id)
        
        # Get current active cycle
        current_cycle = client.get_current_cycle()
        current_progress = current_cycle.get_cycle_progress() if current_cycle else None
        
        # Get cycle history
        history = client.get_cycle_history()
        total_history = client.get_total_savings_history()
        
        return Response({
            'client_id': client_id,
            'client_name': client.name,
            'current_cycle': {
                'id': current_cycle.id if current_cycle else None,
                'start_date': current_cycle.start_date if current_cycle else None,
                'cycle_length': current_cycle.cycle_length if current_cycle else 31,
                'status': current_cycle.status if current_cycle else None,
                'progress': current_progress
            },
            'cycle_history': {
                'total_cycles': total_history['total_cycles'],
                'total_saved': str(total_history['total_saved']),
                'recent_cycles': list(history[:5].values(
                    'id', 'start_date', 'end_date', 'total_saved', 'status'
                ))
            },
            'available_balance': str(client.get_available_balance())
        })
        
    except Exception as e:
        return Response(
            {'detail': f'Error fetching client cycles: {str(e)}'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def close_cycle(request, client_id):
    """Manually close a client's active savings cycle"""
    try:
        client = get_object_or_404(ClientModel, id=client_id)
        current_cycle = client.get_current_cycle()
        
        if not current_cycle or current_cycle.status != SavingsCycleModel.Status.ACTIVE:
            return Response(
                {'detail': 'No active cycle found for this client'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Force close the cycle
        current_cycle.check_and_close()
        
        return Response({
            'message': 'Cycle closed successfully',
            'client_id': client_id,
            'cycle_id': current_cycle.id,
            'total_saved': str(current_cycle.total_saved)
        })
        
    except Exception as e:
        return Response(
            {'detail': f'Error closing cycle: {str(e)}'}, 
            status=status.HTTP_400_BAD_REQUEST
        )