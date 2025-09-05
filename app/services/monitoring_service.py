"""
Monitoring service for system health checks and performance metrics.
"""

import time
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.conversation import AnalyticsEvent, UserSession
from app.services.analytics_service import AnalyticsService, EventType
from app.core.database import get_db


class HealthStatus(Enum):
    """Health check status levels."""
    
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    DOWN = "down"


class MetricType(Enum):
    """Types of performance metrics."""
    
    RESPONSE_TIME = "response_time"
    THROUGHPUT = "throughput"
    ERROR_RATE = "error_rate"
    UPTIME = "uptime"
    DATABASE_CONNECTIONS = "database_connections"
    MEMORY_USAGE = "memory_usage"


@dataclass
class HealthCheck:
    """Health check result."""
    
    service: str
    status: HealthStatus
    message: str
    timestamp: datetime
    response_time_ms: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PerformanceMetric:
    """Performance metric data point."""
    
    metric_type: MetricType
    value: float
    unit: str
    timestamp: datetime
    labels: Dict[str, str] = field(default_factory=dict)


@dataclass
class SystemHealth:
    """Overall system health status."""
    
    overall_status: HealthStatus
    checks: List[HealthCheck]
    timestamp: datetime
    uptime_seconds: float
    
    @property
    def is_healthy(self) -> bool:
        """Check if system is healthy."""
        return self.overall_status in [HealthStatus.HEALTHY, HealthStatus.WARNING]


class ResponseTimeTracker:
    """Context manager for tracking response times."""
    
    def __init__(self, monitoring_service: 'MonitoringService', operation: str, session_id: Optional[str] = None):
        self.monitoring_service = monitoring_service
        self.operation = operation
        self.session_id = session_id
        self.start_time = None
        self.end_time = None
    
    async def __aenter__(self):
        self.start_time = time.time()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.time()
        response_time_ms = (self.end_time - self.start_time) * 1000
        
        await self.monitoring_service.record_response_time(
            operation=self.operation,
            response_time_ms=response_time_ms,
            session_id=self.session_id,
            success=exc_type is None
        )
        
        return False  # Don't suppress exceptions


class MonitoringService:
    """Service for monitoring system performance and health."""
    
    def __init__(self, db_session: AsyncSession, analytics_service: AnalyticsService):
        self.db = db_session
        self.analytics = analytics_service
        self.logger = logging.getLogger(__name__)
        self.start_time = datetime.utcnow()
        self._metrics_cache: Dict[str, List[PerformanceMetric]] = {}
        self._health_checks: Dict[str, HealthCheck] = {}
    
    def track_response_time(self, operation: str, session_id: Optional[str] = None) -> ResponseTimeTracker:
        """Create a response time tracker context manager."""
        return ResponseTimeTracker(self, operation, session_id)
    
    async def record_response_time(
        self,
        operation: str,
        response_time_ms: float,
        session_id: Optional[str] = None,
        success: bool = True
    ) -> None:
        """Record response time metric."""
        
        # Record in analytics if session_id is provided
        if session_id:
            try:
                import uuid
                # Handle both string and UUID types
                if isinstance(session_id, str):
                    # Try to parse as UUID, if it fails, skip analytics recording
                    try:
                        session_uuid = uuid.UUID(session_id)
                    except ValueError:
                        # If it's not a valid UUID string, skip analytics recording
                        session_uuid = None
                else:
                    session_uuid = session_id
                
                if session_uuid:
                    await self.analytics.record_response_time(
                        session_id=session_uuid,
                        response_time_ms=response_time_ms,
                        operation_type=operation
                    )
            except Exception as e:
                self.logger.warning(f"Failed to record analytics response time: {e}")
        
        # Store in metrics cache
        metric = PerformanceMetric(
            metric_type=MetricType.RESPONSE_TIME,
            value=response_time_ms,
            unit="ms",
            timestamp=datetime.utcnow(),
            labels={"operation": operation, "success": str(success)}
        )
        
        self._add_metric_to_cache("response_time", metric)
        
        # Log slow operations
        if response_time_ms > 2000:  # 2 seconds threshold
            self.logger.warning(
                f"Slow operation detected: {operation} took {response_time_ms:.2f}ms"
            )
    
    async def record_throughput(self, operation: str, count: int, time_window_seconds: int = 60) -> None:
        """Record throughput metric (operations per time window)."""
        
        throughput = count / time_window_seconds
        
        metric = PerformanceMetric(
            metric_type=MetricType.THROUGHPUT,
            value=throughput,
            unit="ops/sec",
            timestamp=datetime.utcnow(),
            labels={"operation": operation, "window_seconds": str(time_window_seconds)}
        )
        
        self._add_metric_to_cache("throughput", metric)
    
    async def check_database_health(self) -> HealthCheck:
        """Check database connectivity and performance."""
        
        start_time = time.time()
        
        try:
            # Simple query to test database connectivity
            result = await self.db.execute(select(func.count()).select_from(UserSession))
            session_count = result.scalar()
            
            response_time_ms = (time.time() - start_time) * 1000
            
            if response_time_ms > 1000:  # 1 second threshold
                status = HealthStatus.WARNING
                message = f"Database responding slowly ({response_time_ms:.2f}ms)"
            else:
                status = HealthStatus.HEALTHY
                message = f"Database healthy ({session_count} sessions)"
            
            return HealthCheck(
                service="database",
                status=status,
                message=message,
                timestamp=datetime.utcnow(),
                response_time_ms=response_time_ms,
                metadata={"session_count": session_count}
            )
            
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            self.logger.error(f"Database health check failed: {e}")
            
            return HealthCheck(
                service="database",
                status=HealthStatus.CRITICAL,
                message=f"Database connection failed: {str(e)}",
                timestamp=datetime.utcnow(),
                response_time_ms=response_time_ms,
                metadata={"error": str(e)}
            )
    
    async def check_analytics_health(self) -> HealthCheck:
        """Check analytics service health."""
        
        start_time = time.time()
        
        try:
            # Test analytics service by getting recent metrics
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(hours=1)
            
            completion_rate = await self.analytics.get_flow_completion_rate(start_date, end_date)
            
            response_time_ms = (time.time() - start_time) * 1000
            
            return HealthCheck(
                service="analytics",
                status=HealthStatus.HEALTHY,
                message=f"Analytics service healthy (completion rate: {completion_rate:.1f}%)",
                timestamp=datetime.utcnow(),
                response_time_ms=response_time_ms,
                metadata={"completion_rate": completion_rate}
            )
            
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            self.logger.error(f"Analytics health check failed: {e}")
            
            return HealthCheck(
                service="analytics",
                status=HealthStatus.WARNING,
                message=f"Analytics service degraded: {str(e)}",
                timestamp=datetime.utcnow(),
                response_time_ms=response_time_ms,
                metadata={"error": str(e)}
            )
    
    async def check_system_health(self) -> SystemHealth:
        """Perform comprehensive system health check."""
        
        checks = []
        
        # Run all health checks
        db_check = await self.check_database_health()
        checks.append(db_check)
        
        analytics_check = await self.check_analytics_health()
        checks.append(analytics_check)
        
        # Determine overall status
        statuses = [check.status for check in checks]
        
        if HealthStatus.CRITICAL in statuses or HealthStatus.DOWN in statuses:
            overall_status = HealthStatus.CRITICAL
        elif HealthStatus.WARNING in statuses:
            overall_status = HealthStatus.WARNING
        else:
            overall_status = HealthStatus.HEALTHY
        
        # Calculate uptime
        uptime_seconds = (datetime.utcnow() - self.start_time).total_seconds()
        
        return SystemHealth(
            overall_status=overall_status,
            checks=checks,
            timestamp=datetime.utcnow(),
            uptime_seconds=uptime_seconds
        )
    
    async def get_csat_metrics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, float]:
        """Get Customer Satisfaction (CSAT) metrics."""
        
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # For now, return mock CSAT data since we don't have actual CSAT collection implemented
        # In a real implementation, this would query actual CSAT survey responses
        
        completion_rate = await self.analytics.get_flow_completion_rate(start_date, end_date)
        handoff_rate = await self.analytics.get_handoff_rate(start_date, end_date)
        
        # Calculate estimated CSAT based on completion and handoff rates
        # Higher completion rate and lower handoff rate suggest better satisfaction
        estimated_csat = max(1.0, min(5.0, 4.5 - (handoff_rate / 100) + (completion_rate / 100)))
        
        return {
            "estimated_csat": round(estimated_csat, 2),
            "completion_rate": completion_rate,
            "handoff_rate": handoff_rate,
            "sample_size": 0,  # Would be actual survey responses
            "response_rate": 0.0  # Would be actual survey response rate
        }
    
    async def get_performance_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get comprehensive performance summary."""
        
        # Get analytics summary
        analytics_summary = await self.analytics.get_analytics_summary(start_date, end_date)
        
        # Get CSAT metrics
        csat_metrics = await self.get_csat_metrics(start_date, end_date)
        
        # Get system health
        system_health = await self.check_system_health()
        
        # Get recent metrics from cache
        recent_metrics = self._get_recent_metrics_from_cache()
        
        return {
            "analytics": {
                "total_sessions": analytics_summary.total_sessions,
                "completion_rate": analytics_summary.completion_rate,
                "handoff_rate": analytics_summary.handoff_rate,
                "average_response_time": analytics_summary.average_response_time,
                "error_rate": analytics_summary.error_rate,
                "timeout_rate": analytics_summary.timeout_rate
            },
            "csat": csat_metrics,
            "system_health": {
                "status": system_health.overall_status.value,
                "uptime_seconds": system_health.uptime_seconds,
                "checks": [
                    {
                        "service": check.service,
                        "status": check.status.value,
                        "message": check.message,
                        "response_time_ms": check.response_time_ms
                    }
                    for check in system_health.checks
                ]
            },
            "performance_metrics": recent_metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _add_metric_to_cache(self, metric_key: str, metric: PerformanceMetric) -> None:
        """Add metric to in-memory cache."""
        
        if metric_key not in self._metrics_cache:
            self._metrics_cache[metric_key] = []
        
        self._metrics_cache[metric_key].append(metric)
        
        # Keep only last 100 metrics per type
        if len(self._metrics_cache[metric_key]) > 100:
            self._metrics_cache[metric_key] = self._metrics_cache[metric_key][-100:]
    
    def _get_recent_metrics_from_cache(self, minutes: int = 60) -> Dict[str, List[Dict]]:
        """Get recent metrics from cache."""
        
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)
        recent_metrics = {}
        
        for metric_key, metrics in self._metrics_cache.items():
            recent = [
                {
                    "value": metric.value,
                    "unit": metric.unit,
                    "timestamp": metric.timestamp.isoformat(),
                    "labels": metric.labels
                }
                for metric in metrics
                if metric.timestamp >= cutoff_time
            ]
            
            if recent:
                recent_metrics[metric_key] = recent
        
        return recent_metrics
    
    async def log_error(
        self,
        error: Exception,
        context: Dict[str, Any],
        session_id: Optional[str] = None
    ) -> None:
        """Log error with context and record analytics event."""
        
        error_message = str(error)
        error_type = type(error).__name__
        
        # Log the error
        self.logger.error(
            f"Error in {context.get('operation', 'unknown')}: {error_message}",
            extra={
                "error_type": error_type,
                "context": context,
                "session_id": session_id
            }
        )
        
        # Record analytics event if session_id is provided
        if session_id:
            try:
                import uuid
                # Handle both string and UUID types
                if isinstance(session_id, str):
                    # Try to parse as UUID, if it fails, skip analytics recording
                    try:
                        session_uuid = uuid.UUID(session_id)
                    except ValueError:
                        # If it's not a valid UUID string, skip analytics recording
                        session_uuid = None
                else:
                    session_uuid = session_id
                
                if session_uuid:
                    await self.analytics.record_error(
                        session_id=session_uuid,
                        error_type=error_type,
                        error_message=error_message,
                        step_id=context.get('step_id')
                    )
            except Exception as e:
                self.logger.warning(f"Failed to record analytics error: {e}")


async def get_monitoring_service() -> MonitoringService:
    """Dependency injection for MonitoringService."""
    
    async for db in get_db():
        from app.services.analytics_service import get_analytics_service
        analytics_service = await get_analytics_service()
        return MonitoringService(db, analytics_service)