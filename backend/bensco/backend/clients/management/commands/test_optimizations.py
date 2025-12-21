from django.core.management.base import BaseCommand
from clients.models import ClientModel
from users.models import UserModel
from django.db.models import Q
from core.pagination import ClientsPagination, SearchPagination
from django.core.paginator import Paginator
import time

class Command(BaseCommand):
    help = 'Test the optimized client queries and pagination'

    def handle(self, *args, **options):
        self.stdout.write("Testing Optimized Client Functionality")
        self.stdout.write("=" * 50)
        
        # Test basic query performance
        self.test_basic_queries()
        
        # Test pagination
        self.test_pagination()
        
        # Test search functionality
        self.test_search()
        
        # Test filters
        self.test_filters()
        
        # Test balance calculation
        self.test_balance_calculation()
        
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("[OK] All optimization tests completed!"))

    def test_basic_queries(self):
        self.stdout.write("\n=== Basic Query Performance ===")
        
        start_time = time.time()
        total_clients = ClientModel.objects.count()
        end_time = time.time()
        
        self.stdout.write(f"[OK] Total clients: {total_clients}")
        self.stdout.write(f"[OK] Query time: {end_time - start_time:.3f}s")
        
        # Test optimized query with select_related
        start_time = time.time()
        clients_with_relations = ClientModel.objects.select_related('collector', 'address')[:10]
        list(clients_with_relations)  # Force evaluation
        end_time = time.time()
        
        self.stdout.write(f"[OK] Optimized query (10 records with relations): {end_time - start_time:.3f}s")

    def test_pagination(self):
        self.stdout.write("\n=== Pagination Testing ===")
        
        # Test default pagination
        clients = ClientModel.objects.all().order_by('-created_at')
        paginator = Paginator(clients, 10)
        
        self.stdout.write(f"[OK] Total pages with 10 records per page: {paginator.num_pages}")
        self.stdout.write(f"[OK] Total records: {paginator.count}")
        
        # Test first page
        page1 = paginator.get_page(1)
        self.stdout.write(f"[OK] Page 1 has {len(page1)} records")
        
        # Test custom page size
        paginator_custom = Paginator(clients, 5)
        self.stdout.write(f"[OK] With 5 records per page: {paginator_custom.num_pages} pages")

    def test_search(self):
        self.stdout.write("\n=== Search Functionality Testing ===")
        
        # Test search by name
        start_time = time.time()
        search_results = ClientModel.objects.filter(
            Q(name__icontains='John') |
            Q(phone_number__icontains='John') |
            Q(unique_code__icontains='John')
        )
        count = search_results.count()
        end_time = time.time()
        
        self.stdout.write(f"[OK] Search for 'John': {count} results in {end_time - start_time:.3f}s")
        
        # Test search by phone pattern
        start_time = time.time()
        phone_search = ClientModel.objects.filter(
            Q(name__icontains='0') |
            Q(phone_number__icontains='0') |
            Q(unique_code__icontains='0')
        )
        count = phone_search.count()
        end_time = time.time()
        
        self.stdout.write(f"[OK] Search for '0': {count} results in {end_time - start_time:.3f}s")
        
        # Test search by unique code
        start_time = time.time()
        code_search = ClientModel.objects.filter(
            Q(name__icontains='CLI') |
            Q(phone_number__icontains='CLI') |
            Q(unique_code__icontains='CLI')
        )
        count = code_search.count()
        end_time = time.time()
        
        self.stdout.write(f"[OK] Search for 'CLI': {count} results in {end_time - start_time:.3f}s")

    def test_filters(self):
        self.stdout.write("\n=== Filter Testing ===")
        
        # Test fixed amount filter
        fixed_clients = ClientModel.objects.filter(is_fixed=True).count()
        self.stdout.write(f"[OK] Fixed amount clients: {fixed_clients}")
        
        # Test variable amount filter
        variable_clients = ClientModel.objects.filter(is_fixed=False).count()
        self.stdout.write(f"[OK] Variable amount clients: {variable_clients}")
        
        # Test collector filter
        collectors = UserModel.objects.filter(role='collector')
        if collectors.exists():
            collector = collectors.first()
            collector_clients = ClientModel.objects.filter(collector=collector).count()
            self.stdout.write(f"[OK] Clients for collector '{collector.username}': {collector_clients}")
        
        # Test shared clients (no collector)
        shared_clients = ClientModel.objects.filter(collector__isnull=True).count()
        self.stdout.write(f"[OK] Shared clients (no specific collector): {shared_clients}")

    def test_balance_calculation(self):
        self.stdout.write("\n=== Balance Calculation Performance ===")
        
        clients_with_data = ClientModel.objects.filter(contributions__isnull=False).distinct()[:5]
        
        for client in clients_with_data:
            start_time = time.time()
            balance = client.get_available_balance()
            end_time = time.time()
            
            self.stdout.write(f"[OK] {client.name} balance: {balance} (calculated in {end_time - start_time:.3f}s)")