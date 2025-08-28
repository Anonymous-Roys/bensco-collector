from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .serializers import PayoutModelSerializer
from rest_framework.response import Response
from .models import PayoutModel
from django.utils import timezone

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
