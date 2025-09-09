#!/usr/bin/env python3
"""
Test script for frontend-backend integration.
"""

import asyncio
import httpx
import json
from datetime import datetime

BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

async def test_cors_and_api_access():
    """Test CORS configuration and API access from frontend perspective."""
    
    print("🔗 Testing Frontend-Backend Integration...")
    
    async with httpx.AsyncClient() as client:
        
        # Test CORS preflight for API endpoints
        try:
            response = await client.options(
                f"{BACKEND_URL}/api/dashboard/metrics",
                headers={
                    "Origin": FRONTEND_URL,
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "Content-Type"
                }
            )
            
            if response.status_code in [200, 204]:
                print("✅ CORS preflight successful")
                
                # Check CORS headers
                cors_headers = response.headers
                if "access-control-allow-origin" in cors_headers:
                    print(f"✅ CORS Origin: {cors_headers['access-control-allow-origin']}")
                else:
                    print("⚠️  CORS headers not found")
            else:
                print(f"❌ CORS preflight failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ CORS test error: {e}")
        
        # Test actual API calls with Origin header (simulating frontend)
        try:
            response = await client.get(
                f"{BACKEND_URL}/api/dashboard/metrics",
                headers={"Origin": FRONTEND_URL}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ API call from frontend origin successful")
                print(f"   Dashboard metrics: {data['totalContatos']} contatos")
            else:
                print(f"❌ API call failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ API call error: {e}")
        
        # Test WebSocket endpoint accessibility
        try:
            # Just test if the WebSocket endpoint is reachable
            response = await client.get(f"{BACKEND_URL}/ws")
            # WebSocket endpoints typically return 426 Upgrade Required for HTTP requests
            if response.status_code == 426:
                print("✅ WebSocket endpoint is accessible")
            else:
                print(f"⚠️  WebSocket endpoint response: {response.status_code}")
                
        except Exception as e:
            print(f"❌ WebSocket endpoint test error: {e}")
        
        # Test all main API endpoints that frontend will use
        endpoints_to_test = [
            "/api/contatos",
            "/api/processos", 
            "/api/dashboard/chart-data",
            "/api/dashboard/recent-activity"
        ]
        
        for endpoint in endpoints_to_test:
            try:
                response = await client.get(
                    f"{BACKEND_URL}{endpoint}",
                    headers={"Origin": FRONTEND_URL}
                )
                
                if response.status_code == 200:
                    print(f"✅ {endpoint} - OK")
                else:
                    print(f"❌ {endpoint} - {response.status_code}")
                    
            except Exception as e:
                print(f"❌ {endpoint} - Error: {e}")

async def test_data_consistency():
    """Test data consistency between API responses."""
    
    print("\n📊 Testing Data Consistency...")
    
    async with httpx.AsyncClient() as client:
        
        # Get dashboard metrics
        metrics_response = await client.get(f"{BACKEND_URL}/api/dashboard/metrics")
        metrics = metrics_response.json()
        
        # Get contatos list
        contatos_response = await client.get(f"{BACKEND_URL}/api/contatos")
        contatos_data = contatos_response.json()
        
        # Get processos list
        processos_response = await client.get(f"{BACKEND_URL}/api/processos")
        processos_data = processos_response.json()
        
        print(f"✅ Dashboard shows {metrics['totalContatos']} total contatos")
        print(f"✅ Contatos API returns {contatos_data['total']} contatos")
        print(f"✅ Processos API returns {processos_data['total']} processos")
        
        # Test creating a contato and checking if it appears in lists
        new_contato = {
            "nome": "Teste Integração",
            "telefone": "5573999888777",
            "areaInteresse": "Direito Digital"
        }
        
        create_response = await client.post(
            f"{BACKEND_URL}/api/contatos",
            json=new_contato
        )
        
        if create_response.status_code == 200:
            created_contato = create_response.json()
            print(f"✅ Created contato: {created_contato['nome']} (ID: {created_contato['id']})")
            
            # Verify it appears in the list
            updated_contatos_response = await client.get(f"{BACKEND_URL}/api/contatos")
            updated_contatos_data = updated_contatos_response.json()
            
            if updated_contatos_data['total'] > contatos_data['total']:
                print("✅ New contato appears in list")
            else:
                print("⚠️  New contato not immediately visible in list")
                
        else:
            print(f"❌ Failed to create contato: {create_response.status_code}")

if __name__ == "__main__":
    print("Starting Frontend-Backend Integration Tests...")
    print("Make sure both servers are running:")
    print("- Backend: python -m app.main (port 8000)")
    print("- Frontend: npm run dev (port 3000)")
    print()
    
    asyncio.run(test_cors_and_api_access())
    asyncio.run(test_data_consistency())
    
    print()
    print("🏁 Frontend-Backend integration tests completed!")
    print()
    print("Next steps:")
    print("1. Open http://localhost:3000 in your browser")
    print("2. Navigate to Dashboard, Contatos, and Processos pages")
    print("3. Verify real-time updates work")
    print("4. Test creating new contatos and processos")