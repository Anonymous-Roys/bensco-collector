import requests
import json
import time

BASE_URL = 'https://bensco-collector1.onrender.com'

def test_endpoint(url, description):
    print(f"\n=== {description} ===")
    start_time = time.time()
    
    try:
        response = requests.get(f"{BASE_URL}{url}")
        end_time = time.time()
        
        print(f"Status: {response.status_code}")
        print(f"Response time: {end_time - start_time:.3f}s")
        
        if response.status_code == 200:
            data = response.json()
            if 'results' in data:
                print(f"Total records: {data.get('count', 'N/A')}")
                print(f"Current page: {data.get('current_page', 'N/A')}")
                print(f"Total pages: {data.get('total_pages', 'N/A')}")
                print(f"Records in this page: {len(data['results'])}")
                
                # Show first record if available
                if data['results']:
                    first_record = data['results'][0]
                    print(f"First record: {first_record.get('name', 'N/A')} - {first_record.get('unique_code', 'N/A')}")
            else:
                print(f"Response: {json.dumps(data, indent=2)[:200]}...")
        else:
            print(f"Error: {response.text[:200]}...")
            
    except Exception as e:
        print(f"Error: {str(e)}")

def main():
    print("Testing Optimized Client Endpoints")
    print("=" * 50)
    
    # Test pagination
    test_endpoint('/clients/list/', 'Client List - Page 1 (Default 10 records)')
    test_endpoint('/clients/list/?page=2', 'Client List - Page 2')
    test_endpoint('/clients/list/?page_size=5', 'Client List - Custom page size (5 records)')
    
    # Test search functionality
    test_endpoint('/clients/search/?q=John', 'Search for "John"')
    test_endpoint('/clients/search/?q=0', 'Search for phone numbers starting with "0"')
    test_endpoint('/clients/search/?q=CLI', 'Search for unique codes starting with "CLI"')
    
    # Test filters
    test_endpoint('/clients/list/?amount=fixed', 'Filter by Fixed Amount clients')
    test_endpoint('/clients/list/?amount=variable', 'Filter by Variable Amount clients')
    
    # Test addresses endpoint
    test_endpoint('/clients/addresses/', 'Get Addresses')

if __name__ == '__main__':
    main()