import random
from datetime import date, timedelta
from savings.models import SavingsCycleModel
from django.db.models import Sum



def generate_hex_id(length=5):
    return ''.join(random.choices('0123456789ABCDEF', k=length))


def generate_unique_code(model_class, role_prefix):
    """
    example BSL-ADM-1A2B3
    """
    while True:
        hex_part = generate_hex_id()
        code = f"BSL-{role_prefix}-{hex_part}"
        print(f"Trying code: {code}") 
        if not model_class.objects.filter(unique_code=code).exists():
            return code


def check_and_close_all_cycles():
    active_cycles = SavingsCycleModel.objects.filter(status=SavingsCycleModel.Status.ACTIVE)
    for cycle in active_cycles:
        days_passed = (date.today() - cycle.start_date).days
        if days_passed >= cycle.cycle_length:
            cycle.status = SavingsCycleModel.Status.CLOSED
            cycle.end_date = date.today()
            cycle.save()

def get_active_or_create_savings_cycle(client):
    # Check for an active cycle
    active_cycle = SavingsCycleModel.objects.filter(client=client, status=SavingsCycleModel.Status.ACTIVE).first()
    
    if active_cycle:
        return active_cycle

    # If none, create a new one with today's date
    start = date.today()
    length = client.cycle_length if hasattr(client, 'cycle_length') else 31
    end = start + timedelta(days=length)

    return SavingsCycleModel.objects.create(
        client=client,
        start_date=start,
        cycle_length=length,
        expected_end_date=end,
        status=SavingsCycleModel.Status.ACTIVE
    )


#Check if Savings cycle is completed
# def check_and_close(self):
#     if self.status == self.Status.ACTIVE:
#         days_passed = (date.today() - self.start_date).days
#         if days_passed >= self.cycle_length:
#             self.status = self.Status.CLOSED
#             self.end_date = date.today()
#             self.save()
#             return True
#     return False

def check_and_close(self):
        if self.status != self.Status.ACTIVE:
            return False

        # 1) Has the client paid enough days *in this cycle*?
        contrib_days = self.contributions.aggregate(
            total_days=Sum('days_covered')
        )['total_days'] or 0

        # 2) Has the cycle run its natural course?
        days_passed = (date.today() - self.start_date).days

        if contrib_days >= self.cycle_length or days_passed >= self.cycle_length:
            self.status = self.Status.CLOSED
            self.end_date = date.today()
            self.save()
            return True

        return False


# def check_and_close(self):
#     if self.status != self.Status.ACTIVE:
#         return False

#     # 1) Has the client paid enough days in total?
#     contrib_days = self.contributions.aggregate(
#         total_days=Sum('days_covered')
#     )['total_days'] or 0

#     # 2) Has the cycle run its natural course?
#     days_passed = (date.today() - self.start_date).days

#     # Close if either condition is met
#     if contrib_days >= self.cycle_length or days_passed >= self.cycle_length:
#         self.status = self.Status.CLOSED
#         self.end_date = date.today()
#         self.save()
#         return True

#     return False
