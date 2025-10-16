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
        from django.db.models import Sum
        
        client = get_object_or_404(ClientModel, id=client_id)
        
        # Get current active cycle
        current_cycle = client.savings_cycles.filter(status='active').first()
        current_cycle_data = None
        
        if current_cycle:
            # Get cycle contributions data
            cycle_contributions = current_cycle.contributions.aggregate(
                total=Sum('amount'),
                days=Sum('days_covered')
            )
            
            total_collected = float(cycle_contributions['total'] or 0)
            contributing_days = cycle_contributions['days'] or 0
            commission = float(client.calculate_commission(total_collected, contributing_days))
            
            current_cycle_data = {
                'id': str(current_cycle.id),
                'status': current_cycle.status,
                'total_collected': total_collected,
                'contributing_days': contributing_days,
                'cycle_length': current_cycle.cycle_length,
                'commission': commission,
                'progress_percentage': min((contributing_days / current_cycle.cycle_length) * 100, 100),
                'business_days_passed': contributing_days,
                'can_close': contributing_days >= current_cycle.cycle_length,
                'start_date': current_cycle.start_date.isoformat() if current_cycle.start_date else None,
                'end_date': current_cycle.end_date.isoformat() if current_cycle.end_date else None,
            }
        
        # Get cycle history
        history_cycles = client.savings_cycles.exclude(status='active').order_by('-end_date')[:10]
        cycle_history = []
        
        for cycle in history_cycles:
            cycle_contributions = cycle.contributions.aggregate(
                total=Sum('amount'),
                days=Sum('days_covered')
            )
            
            total_collected = float(cycle_contributions['total'] or 0)
            contributing_days = cycle_contributions['days'] or 0
            commission = float(client.calculate_commission(total_collected, contributing_days))
            
            cycle_history.append({
                'id': str(cycle.id),
                'status': cycle.status,
                'total_collected': total_collected,
                'contributing_days': contributing_days,
                'commission': commission,
                'closed_on': cycle.end_date.isoformat() if cycle.end_date else None,
                'start_date': cycle.start_date.isoformat() if cycle.start_date else None,
            })
        
        return Response({
            'current_cycle': current_cycle_data,
            'cycle_history': cycle_history,
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