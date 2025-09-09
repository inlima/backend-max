#!/usr/bin/env python3
"""
Test script for API integration with frontend.
"""

import asyncio
import httpx
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

async def test_api_endpoints():
    """Test all API endpoints that the frontend will use."""
    
    async with httpx.AsyncClient() as client:
        print("🧪 Testing API Integration...")
        
        # Test health endpoint
        try:
            response = await client.get(f"{BASE_URL}/health/")
            print(f"✅ Health check: {response.status_code}")
        except Exception as e:
            print(f"❌ Health check failed: {e}")
        
        # Test dashboard metrics
        try:
            response = await client.get(f"{BASE_URL}/api/dashboard/metrics")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Dashboard metrics: {data}")
            else:
                print(f"❌ Dashboard metrics failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Dashboard metrics error: {e}")
        
        # Test chart data
        try:
            response = await client.get(f"{BASE_URL}/api/dashboard/chart-data?days=7")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Chart data: {len(data)} data points")
            else:
                print(f"❌ Chart data failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Chart data error: {e}")
        
        # Test recent activity
        try:
            response = await client.get(f"{BASE_URL}/api/dashboard/recent-activity?limit=5")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Recent activity: {len(data)} items")
            else:
                print(f"❌ Recent activity failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Recent activity error: {e}")
        
        # Test contatos list
        try:
            response = await client.get(f"{BASE_URL}/api/contatos?page=1&limit=10")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Contatos list: {data['total']} total contatos")
            else:
                print(f"❌ Contatos list failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Contatos list error: {e}")
        
        # Test processos list
        try:
            response = await client.get(f"{BASE_URL}/api/processos?page=1&limit=10")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Processos list: {data['total']} total processos")
            else:
                print(f"❌ Processos list failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Processos list error: {e}")
        
        # Test creating a manual contato
        try:
            contato_data = {
                "nome": "Teste API",
                "telefone": "5573999887766",
                "areaInteresse": "Direito Civil"
            }
            response = await client.post(
                f"{BASE_URL}/api/contatos",
                json=contato_data
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Create contato: {data['nome']} created with ID {data['id']}")
                
                # Test getting the created contato
                contato_id = data['id']
                response = await client.get(f"{BASE_URL}/api/contatos/{contato_id}")
                if response.status_code == 200:
                    print(f"✅ Get contato: Retrieved contato {contato_id}")
                else:
                    print(f"❌ Get contato failed: {response.status_code}")
                    
            else:
                print(f"❌ Create contato failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Create contato error: {e}")

if __name__ == "__main__":
    print("Starting API integration tests...")
    print("Make sure the FastAPI server is running on localhost:8000")
    print()
    
    asyncio.run(test_api_endpoints())
    
    print()
    print("🏁 API integration tests completed!")
    print("If all tests passed, the backend is ready for frontend integration.")