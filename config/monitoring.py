"""
Monitoring and health check configuration
"""
import asyncio
import logging
import time
from typing import Dict, Any
from datetime import datetime, timedelta

import psutil
import redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.services.redis_service import get_redis_client

logger = logging.getLogger(__name__)

class HealthChecker:
    """Health check service for monitoring application components"""
    
    def __init__(self):
        self.checks = {
            "database": self._check_database,
            "redis": self._check_redis,
            "disk_space": self._check_disk_space,
            "memory": self._check_memory,
            "whatsapp_api": self._check_whatsapp_api,
        }
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status of all components"""
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {},
            "uptime": self._get_uptime(),
        }
        
        for check_name, check_func in self.checks.items():
            try:
                start_time = time.time()
                result = await check_func()
                response_time = (time.time() - start_time) * 1000  # ms
                
                health_status["checks"][check_name] = {
                    "status": "healthy" if result["healthy"] else "unhealthy",
                    "response_time_ms": round(response_time, 2),
                    **result
                }
                
                if not result["healthy"]:
                    health_status["status"] = "unhealthy"
                    
            except Exception as e:
                logger.error(f"Health check failed for {check_name}: {str(e)}")
                health_status["checks"][check_name] = {
                    "status": "unhealthy",
                    "error": str(e),
                    "response_time_ms": None,
                }
                health_status["status"] = "unhealthy"
        
        return health_status
    
    async def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            async with get_db_session() as session:
                # Test basic connectivity
                result = await session.execute(text("SELECT 1"))
                result.fetchone()
                
                # Check connection pool status
                pool = session.bind.pool
                pool_status = {
                    "size": pool.size(),
                    "checked_in": pool.checkedin(),
                    "checked_out": pool.checkedout(),
                }
                
                return {
                    "healthy": True,
                    "pool_status": pool_status,
                }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
            }
    
    async def _check_redis(self) -> Dict[str, Any]:
        """Check Redis connectivity and performance"""
        try:
            redis_client = await get_redis_client()
            
            # Test basic connectivity
            await redis_client.ping()
            
            # Get Redis info
            info = await redis_client.info()
            memory_usage = info.get("used_memory_human", "unknown")
            connected_clients = info.get("connected_clients", 0)
            
            return {
                "healthy": True,
                "memory_usage": memory_usage,
                "connected_clients": connected_clients,
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
            }
    
    async def _check_disk_space(self) -> Dict[str, Any]:
        """Check available disk space"""
        try:
            disk_usage = psutil.disk_usage("/")
            free_gb = disk_usage.free / (1024**3)
            total_gb = disk_usage.total / (1024**3)
            used_percent = (disk_usage.used / disk_usage.total) * 100
            
            # Consider unhealthy if less than 1GB free or more than 90% used
            is_healthy = free_gb > 1.0 and used_percent < 90
            
            return {
                "healthy": is_healthy,
                "free_gb": round(free_gb, 2),
                "total_gb": round(total_gb, 2),
                "used_percent": round(used_percent, 2),
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
            }
    
    async def _check_memory(self) -> Dict[str, Any]:
        """Check memory usage"""
        try:
            memory = psutil.virtual_memory()
            available_gb = memory.available / (1024**3)
            total_gb = memory.total / (1024**3)
            used_percent = memory.percent
            
            # Consider unhealthy if less than 500MB available or more than 90% used
            is_healthy = available_gb > 0.5 and used_percent < 90
            
            return {
                "healthy": is_healthy,
                "available_gb": round(available_gb, 2),
                "total_gb": round(total_gb, 2),
                "used_percent": round(used_percent, 2),
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
            }
    
    async def _check_whatsapp_api(self) -> Dict[str, Any]:
        """Check WhatsApp API connectivity (basic check)"""
        try:
            # This is a basic check - in production you might want to
            # make a lightweight API call to verify connectivity
            import os
            
            required_vars = [
                "WHATSAPP_ACCESS_TOKEN",
                "WHATSAPP_PHONE_NUMBER_ID",
                "WHATSAPP_WEBHOOK_VERIFY_TOKEN"
            ]
            
            missing_vars = [var for var in required_vars if not os.getenv(var)]
            
            if missing_vars:
                return {
                    "healthy": False,
                    "error": f"Missing environment variables: {', '.join(missing_vars)}",
                }
            
            return {
                "healthy": True,
                "configured": True,
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
            }
    
    def _get_uptime(self) -> str:
        """Get application uptime"""
        try:
            boot_time = psutil.boot_time()
            uptime_seconds = time.time() - boot_time
            uptime_delta = timedelta(seconds=uptime_seconds)
            return str(uptime_delta).split('.')[0]  # Remove microseconds
        except Exception:
            return "unknown"

# Global health checker instance
health_checker = HealthChecker()