#!/usr/bin/env python3
"""
WhatsApp Business API integration testing script
"""
import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional

import httpx
from config.whatsapp import WhatsAppConfig
from config.webhook_security import WebhookSecurity

class WhatsAppIntegrationTester:
    """Comprehensive WhatsApp integration tester"""
    
    def __init__(self):
        self.whatsapp_config = WhatsAppConfig()
        self.webhook_security = WebhookSecurity()
        self.test_results = []
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run comprehensive integration tests"""
        print("🚀 Starting WhatsApp Business API Integration Tests")
        print("=" * 60)
        
        overall_result = {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "tests": [],
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "warnings": 0,
            }
        }
        
        # Test configuration validation
        await self._test_configuration_validation(overall_result)
        
        # Test API connectivity
        await self._test_api_connectivity(overall_result)
        
        # Test webhook security
        await self._test_webhook_security(overall_result)
        
        # Test webhook endpoint
        await self._test_webhook_endpoint(overall_result)
        
        # Test rate limiting
        await self._test_rate_limiting(overall_result)
        
        # Test message sending (only in non-production)
        if os.getenv("ENVIRONMENT", "development") != "production":
            await self._test_message_sending(overall_result)
        
        # Calculate summary
        for test in overall_result["tests"]:
            overall_result["summary"]["total"] += 1
            if test["status"] == "PASS":
                overall_result["summary"]["passed"] += 1
            elif test["status"] == "FAIL":
                overall_result["summary"]["failed"] += 1
                overall_result["success"] = False
            elif test["status"] == "WARN":
                overall_result["summary"]["warnings"] += 1
        
        # Print summary
        self._print_summary(overall_result)
        
        return overall_result
    
    async def _test_configuration_validation(self, overall_result: Dict[str, Any]):
        """Test WhatsApp configuration validation"""
        print("\n📋 Testing Configuration Validation...")
        
        try:
            validation_result = await self.whatsapp_config.validate_configuration()
            
            test_result = {
                "name": "Configuration Validation",
                "status": "PASS" if validation_result["valid"] else "FAIL",
                "details": validation_result,
                "timestamp": datetime.utcnow().isoformat(),
            }
            
            if validation_result["valid"]:
                print("   ✅ Configuration validation passed")
                if validation_result.get("phone_number_info"):
                    phone_info = validation_result["phone_number_info"]
                    print(f"   📞 Phone: {phone_info.get('display_phone_number')}")
                    print(f"   ✅ Verified Name: {phone_info.get('verified_name')}")
            else:
                print("   ❌ Configuration validation failed")
                for error in validation_result["errors"]:
                    print(f"   ❌ {error}")
            
            for warning in validation_result.get("warnings", []):
                print(f"   ⚠️  {warning}")
        
        except Exception as e:
            test_result = {
                "name": "Configuration Validation",
                "status": "FAIL",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
            print(f"   ❌ Configuration validation error: {str(e)}")
        
        overall_result["tests"].append(test_result)
    
    async def _test_api_connectivity(self, overall_result: Dict[str, Any]):
        """Test basic API connectivity"""
        print("\n🌐 Testing API Connectivity...")
        
        try:
            async with httpx.AsyncClient() as client:
                # Test basic API endpoint
                response = await client.get(
                    f"{self.whatsapp_config.api_url}/{self.whatsapp_config.phone_number_id}",
                    headers=self.whatsapp_config.headers,
                    timeout=30.0
                )
                
                test_result = {
                    "name": "API Connectivity",
                    "status": "PASS" if response.status_code == 200 else "FAIL",
                    "response_code": response.status_code,
                    "response_time_ms": response.elapsed.total_seconds() * 1000,
                    "timestamp": datetime.utcnow().isoformat(),
                }
                
                if response.status_code == 200:
                    print("   ✅ API connectivity successful")
                    print(f"   ⏱️  Response time: {test_result['response_time_ms']:.2f}ms")
                else:
                    print(f"   ❌ API connectivity failed: HTTP {response.status_code}")
                    test_result["error"] = response.text
        
        except httpx.TimeoutException:
            test_result = {
                "name": "API Connectivity",
                "status": "FAIL",
                "error": "Request timeout",
                "timestamp": datetime.utcnow().isoformat(),
            }
            print("   ❌ API connectivity timeout")
        
        except Exception as e:
            test_result = {
                "name": "API Connectivity",
                "status": "FAIL",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
            print(f"   ❌ API connectivity error: {str(e)}")
        
        overall_result["tests"].append(test_result)
    
    async def _test_webhook_security(self, overall_result: Dict[str, Any]):
        """Test webhook security functions"""
        print("\n🔒 Testing Webhook Security...")
        
        # Test webhook token verification
        test_token = self.whatsapp_config.webhook_verify_token
        if test_token:
            is_valid = self.webhook_security.verify_webhook_token(test_token)
            print(f"   {'✅' if is_valid else '❌'} Webhook token verification: {'PASS' if is_valid else 'FAIL'}")
        else:
            print("   ⚠️  Webhook token not configured")
        
        # Test payload validation
        test_payload = {
            "object": "whatsapp_business_account",
            "entry": [
                {
                    "id": "test_id",
                    "changes": [
                        {
                            "field": "messages",
                            "value": {
                                "messaging_product": "whatsapp",
                                "metadata": {
                                    "display_phone_number": "1234567890",
                                    "phone_number_id": "test_phone_id"
                                },
                                "messages": []
                            }
                        }
                    ]
                }
            ]
        }
        
        validation_result = self.webhook_security.validate_webhook_payload(test_payload)
        
        test_result = {
            "name": "Webhook Security",
            "status": "PASS" if validation_result["valid"] else "FAIL",
            "details": validation_result,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        if validation_result["valid"]:
            print("   ✅ Webhook payload validation passed")
        else:
            print("   ❌ Webhook payload validation failed")
            for error in validation_result["errors"]:
                print(f"   ❌ {error}")
        
        overall_result["tests"].append(test_result)
    
    async def _test_webhook_endpoint(self, overall_result: Dict[str, Any]):
        """Test webhook endpoint availability"""
        print("\n🔗 Testing Webhook Endpoint...")
        
        webhook_url = os.getenv("WEBHOOK_URL")
        if not webhook_url:
            test_result = {
                "name": "Webhook Endpoint",
                "status": "WARN",
                "warning": "WEBHOOK_URL not configured",
                "timestamp": datetime.utcnow().isoformat(),
            }
            print("   ⚠️  WEBHOOK_URL environment variable not set")
            overall_result["tests"].append(test_result)
            return
        
        try:
            async with httpx.AsyncClient() as client:
                # Test GET request (webhook verification)
                verify_token = self.whatsapp_config.webhook_verify_token
                response = await client.get(
                    f"{webhook_url}/webhooks/whatsapp",
                    params={
                        "hub.mode": "subscribe",
                        "hub.verify_token": verify_token,
                        "hub.challenge": "test_challenge"
                    },
                    timeout=30.0
                )
                
                test_result = {
                    "name": "Webhook Endpoint",
                    "status": "PASS" if response.status_code == 200 else "FAIL",
                    "response_code": response.status_code,
                    "webhook_url": webhook_url,
                    "timestamp": datetime.utcnow().isoformat(),
                }
                
                if response.status_code == 200:
                    print("   ✅ Webhook endpoint accessible")
                    if response.text == "test_challenge":
                        print("   ✅ Webhook verification working")
                    else:
                        print("   ⚠️  Webhook verification response unexpected")
                else:
                    print(f"   ❌ Webhook endpoint failed: HTTP {response.status_code}")
        
        except Exception as e:
            test_result = {
                "name": "Webhook Endpoint",
                "status": "FAIL",
                "error": str(e),
                "webhook_url": webhook_url,
                "timestamp": datetime.utcnow().isoformat(),
            }
            print(f"   ❌ Webhook endpoint error: {str(e)}")
        
        overall_result["tests"].append(test_result)
    
    async def _test_rate_limiting(self, overall_result: Dict[str, Any]):
        """Test rate limiting functionality"""
        print("\n⏱️  Testing Rate Limiting...")
        
        # Test rate limit check
        test_ip = "127.0.0.1"
        
        # Should pass initially
        is_allowed = self.webhook_security.check_rate_limit(test_ip)
        
        test_result = {
            "name": "Rate Limiting",
            "status": "PASS" if is_allowed else "WARN",
            "details": {
                "initial_check": is_allowed,
                "rate_limit_window": self.webhook_security.rate_limit_window,
                "max_requests": self.webhook_security.max_requests_per_window,
            },
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        if is_allowed:
            print("   ✅ Rate limiting functional")
            print(f"   📊 Limit: {self.webhook_security.max_requests_per_window} requests per {self.webhook_security.rate_limit_window}s")
        else:
            print("   ⚠️  Rate limiting may be too restrictive")
        
        overall_result["tests"].append(test_result)
    
    async def _test_message_sending(self, overall_result: Dict[str, Any]):
        """Test message sending (non-production only)"""
        print("\n📤 Testing Message Sending (Development Only)...")
        
        test_phone = os.getenv("TEST_PHONE_NUMBER")
        if not test_phone:
            test_result = {
                "name": "Message Sending",
                "status": "WARN",
                "warning": "TEST_PHONE_NUMBER not configured",
                "timestamp": datetime.utcnow().isoformat(),
            }
            print("   ⚠️  TEST_PHONE_NUMBER not set - skipping message test")
            overall_result["tests"].append(test_result)
            return
        
        try:
            result = await self.whatsapp_config.test_message_sending(test_phone)
            
            test_result = {
                "name": "Message Sending",
                "status": "PASS" if result["success"] else "FAIL",
                "details": result,
                "timestamp": datetime.utcnow().isoformat(),
            }
            
            if result["success"]:
                print(f"   ✅ Test message sent successfully")
                print(f"   📧 Message ID: {result['message_id']}")
            else:
                print(f"   ❌ Message sending failed: {result['error']}")
        
        except Exception as e:
            test_result = {
                "name": "Message Sending",
                "status": "FAIL",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
            print(f"   ❌ Message sending error: {str(e)}")
        
        overall_result["tests"].append(test_result)
    
    def _print_summary(self, overall_result: Dict[str, Any]):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        summary = overall_result["summary"]
        print(f"Total Tests: {summary['total']}")
        print(f"✅ Passed: {summary['passed']}")
        print(f"❌ Failed: {summary['failed']}")
        print(f"⚠️  Warnings: {summary['warnings']}")
        
        if overall_result["success"]:
            print("\n🎉 All critical tests passed! WhatsApp integration is ready.")
        else:
            print("\n❌ Some tests failed. Please review the issues above.")
        
        print(f"\nTest completed at: {overall_result['timestamp']}")

async def main():
    """Main test runner"""
    tester = WhatsAppIntegrationTester()
    
    try:
        results = await tester.run_all_tests()
        
        # Save results to file
        results_file = f"whatsapp_integration_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📄 Test results saved to: {results_file}")
        
        # Exit with appropriate code
        sys.exit(0 if results["success"] else 1)
    
    except Exception as e:
        print(f"\n❌ Test runner error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())