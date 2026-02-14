import requests
import json
import sys

def test_scan(roll_no, event_id=1):
    url = "http://localhost:8000/api/scan/"
    payload = {
        "roll_no": roll_no,
        "event_id": event_id
    }
    print(f"Testing scan for {roll_no} at {url}...")
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    roll = sys.argv[1] if len(sys.argv) > 1 else "TEST001"
    test_scan(roll)
