"""
Health check endpoints.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse

from app.services.monitoring_service import MonitoringService, get_monitoring_service, HealthStatus

router = APIRouter()


@router.get("/")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "healthy", "service": "advocacia-direta-whatsapp"}


@router.get("/ready")
async def readiness_check(
    monitoring_service: MonitoringService = Depends(get_monitoring_service)
):
    """Readiness check endpoint with comprehensive system health."""
    
    try:
        system_health = await monitoring_service.check_system_health()
        
        if system_health.is_healthy:
            return JSONResponse(
                status_code=200,
                content={
                    "status": "ready",
                    "overall_health": system_health.overall_status.value,
                    "uptime_seconds": system_health.uptime_seconds,
                    "checks": [
                        {
                            "service": check.service,
                            "status": check.status.value,
                            "message": check.message,
                            "response_time_ms": check.response_time_ms
                        }
                        for check in system_health.checks
                    ],
                    "timestamp": system_health.timestamp.isoformat()
                }
            )
        else:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "not_ready",
                    "overall_health": system_health.overall_status.value,
                    "uptime_seconds": system_health.uptime_seconds,
                    "checks": [
                        {
                            "service": check.service,
                            "status": check.status.value,
                            "message": check.message,
                            "response_time_ms": check.response_time_ms
                        }
                        for check in system_health.checks
                    ],
                    "timestamp": system_health.timestamp.isoformat()
                }
            )
    
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "message": f"Health check failed: {str(e)}",
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@router.get("/metrics")
async def get_metrics(
    start_date: Optional[str] = Query(None, description="Start date in ISO format"),
    end_date: Optional[str] = Query(None, description="End date in ISO format"),
    monitoring_service: MonitoringService = Depends(get_monitoring_service)
):
    """Get comprehensive performance metrics."""
    
    try:
        # Parse dates if provided
        parsed_start_date = None
        parsed_end_date = None
        
        if start_date:
            parsed_start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            parsed_end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Get performance summary
        summary = await monitoring_service.get_performance_summary(
            start_date=parsed_start_date,
            end_date=parsed_end_date
        )
        
        return summary
    
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve metrics: {str(e)}"
        )


@router.get("/csat")
async def get_csat_metrics(
    start_date: Optional[str] = Query(None, description="Start date in ISO format"),
    end_date: Optional[str] = Query(None, description="End date in ISO format"),
    monitoring_service: MonitoringService = Depends(get_monitoring_service)
):
    """Get Customer Satisfaction (CSAT) metrics."""
    
    try:
        # Parse dates if provided
        parsed_start_date = None
        parsed_end_date = None
        
        if start_date:
            parsed_start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            parsed_end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Get CSAT metrics
        csat_metrics = await monitoring_service.get_csat_metrics(
            start_date=parsed_start_date,
            end_date=parsed_end_date
        )
        
        return {
            "csat_metrics": csat_metrics,
            "period": {
                "start_date": parsed_start_date.isoformat() if parsed_start_date else None,
                "end_date": parsed_end_date.isoformat() if parsed_end_date else None
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve CSAT metrics: {str(e)}"
        )