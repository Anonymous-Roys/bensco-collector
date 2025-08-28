from django.db import models
import uuid
from users.models import UserModel
from core.utils import generate_hex_id , generate_unique_code



class AddressModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    label = models.CharField(max_length=255)  # e.g., "Kasoa", "Asokwa", "Kumasi Central"
    region = models.CharField(max_length=100, blank=True, null=True)  # e.g., "Ashanti"
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.label
    pass

class ClientModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    unique_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    collector = models.ForeignKey(UserModel, on_delete=models.CASCADE, related_name='clients')
    address = models.ForeignKey(AddressModel, on_delete=models.SET_NULL, null=True, blank=True, related_name='clients')
    dob = models.DateField(blank=True, null=True)
    amount_daily = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    next_of_kin = models.CharField(max_length=255, blank=False, null=True)
    is_fixed = models.BooleanField(default=True)
    start_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.unique_code:
            self.unique_code = generate_unique_code(ClientModel, 'CLI')
        super().save(*args, **kwargs)
