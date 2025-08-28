from django.db import models
import uuid
from users.models import UserModel
from clients.models import ClientModel
from core.utils import generate_unique_code

class PasswordResetModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(UserModel, on_delete=models.CASCADE)
    token_hash = models.CharField(max_length=256)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)



    def save(self, *args, **kwargs):
        if not self.unique_code:
            self.unique_code = generate_unique_code(ClientModel, 'CLI')
        super().save(*args, **kwargs)


    def __str__(self):
        return f"Reset token for {self.user.username}"
