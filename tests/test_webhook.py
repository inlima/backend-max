#!/usr/bin/env python3
"""
Simple script to test the WhatsApp webhook endpoints.
"""

import requests
import json

BASE_URL = "http://localhost:8001"

def test_health():
    """Test health endpoint."""
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health/")
        print(f"Health Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_webhook_verification():
    """Test webhook verification."""
    print("\nTesting webhook verification...")
    try:
        params = {
            "hub.mode": "subscribe",
            "hub.challenge": "test_challenge_123",
            "hub.verify_token": "VERIFICARTOKEN"
        }
        
        response = requests.get(f"{BASE_URL}/webhooks", params=params)
        print(f"Webhook Verification Status: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200 and response.text == "test_challenge_123"
    except Exception as e:
        print(f"Webhook verification failed: {e}")
        return False

def test_webhook_message():
    """Test webhook message processing."""
    print("\nTesting webhook message processing...")
    try:
        # Sample WhatsApp webhook payload
        payload = {
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "id": "wamid.test123",
                            "from": "5573982005612",
                            "timestamp": "1234567890",
                            "type": "text",
                            "text": {
                                "body": "Olá"
                            }
                        }],
                        "contacts": [{
                            "profile": {
                                "name": "Test User"
                            }
                        }],
                        "metadata": {
                            "phone_number_id": "613456848528474"
                        }
                    }
                }]
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/webhooks",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        print(f"Webhook Message Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Webhook message test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("=== WhatsApp Webhook MVP Tests ===\n")
    
    tests = [
        ("Health Check", test_health),
        ("Webhook Verification", test_webhook_verification),
        ("Webhook Message", test_webhook_message)
    ]
    
    results = []
    for test_name, test_func in tests:
        result = test_func()
        results.append((test_name, result))
        print(f"✅ {test_name}: {'PASSED' if result else 'FAILED'}")
    
    print(f"\n=== Test Summary ===")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! MVP is working correctly.")
    else:
        print("❌ Some tests failed. Check the output above.")

if __name__ == "__main__":
    main()