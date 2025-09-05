"""
Security middleware for request validation and protection.
"""

import json
import logging
from typing import Callable, Dict, Any
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_429_TOO_MANY_REQUESTS, HTTP_403_FORBIDDEN

from app.core.database import AsyncSessionLocal
from app.services.validation_service import ValidationService, RateLimitExceeded, ValidationError
from app.config import settings

logger = logging.getLogger(__name__)


class SecurityMiddleware(BaseHTTPMiddleware):
    """Middleware for applying security measures to all requests."""
    
    def __init__(self, app, excluded_paths: list = None):
        super().__init__(app)
        self.excluded_paths = excluded_paths or [
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc"
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request through security checks."""
        # Skip security checks for excluded paths
        if any(request.url.path.startswith(path) for path in self.excluded_paths):
            return await call_next(request)
        
        # Add security headers to all responses
        response = await self._process_request_security(request, call_next)
        self._add_security_headers(response)
        
        return response
    
    async def _process_request_security(self, request: Request, call_next: Callable) -> Response:
        """Process request security validation."""
        try:
            # Validate request size
            content_length = request.headers.get('content-length')
            if content_length and int(content_length) > 1024 * 1024:  # 1MB limit
                logger.warning(f"Request too large: {content_length} bytes from {request.client.host}")
                return JSONResponse(
                    status_code=HTTP_400_BAD_REQUEST,
                    content={"error": "Request too large"}
                )
            
            # For webhook endpoints, apply additional validation
            if request.url.path.startswith("/webhook"):
                validation_result = await self._validate_webhook_request(request)
                if not validation_result["valid"]:
                    return JSONResponse(
                        status_code=HTTP_403_FORBIDDEN,
                        content={"error": "Invalid webhook request", "details": validation_result["errors"]}
                    )
            
            # Process the request
            response = await call_next(request)
            
            return response
            
        except RateLimitExceeded as e:
            logger.warning(f"Rate limit exceeded for {request.client.host}: {str(e)}")
            return JSONResponse(
                status_code=HTTP_429_TOO_MANY_REQUESTS,
                content={"error": str(e)}
            )
        
        except ValidationError as e:
            logger.warning(f"Validation error for {request.client.host}: {str(e)}")
            return JSONResponse(
                status_code=HTTP_400_BAD_REQUEST,
                content={"error": str(e)}
            )
        
        except Exception as e:
            logger.error(f"Security middleware error: {str(e)}")
            return JSONResponse(
                status_code=HTTP_400_BAD_REQUEST,
                content={"error": "Request processing error"}
            )
    
    async def _validate_webhook_request(self, request: Request) -> Dict[str, Any]:
        """Validate webhook request."""
        try:
            # Get request body
            body = await request.body()
            payload = body.decode('utf-8')
            
            # Get signature from headers
            signature = request.headers.get('x-hub-signature-256', '')
            
            # Convert headers to dict
            headers = dict(request.headers)
            
            # Validate using validation service
            async with AsyncSessionLocal() as db_session:
                validation_service = ValidationService(db_session)
                
                validation_result = await validation_service.validate_webhook_request(
                    payload=payload,
                    signature=signature,
                    verify_token=settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
                    headers=headers
                )
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Webhook validation error: {str(e)}")
            return {"valid": False, "errors": ["Webhook validation failed"]}
    
    def _add_security_headers(self, response: Response) -> None:
        """Add security headers to response."""
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self'; "
            "font-src 'self'; "
            "object-src 'none'; "
            "media-src 'self'; "
            "frame-src 'none';"
        )
        
        # HSTS header for HTTPS
        if hasattr(response, 'url') and response.url and response.url.scheme == 'https':
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware specifically for rate limiting."""
    
    def __init__(self, app, rate_limits: Dict[str, int] = None):
        super().__init__(app)
        self.rate_limits = rate_limits or {
            'requests_per_minute': 60,
            'requests_per_hour': 1000
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Apply rate limiting to requests."""
        try:
            # Get client identifier (IP address)
            client_ip = self._get_client_ip(request)
            
            # Apply rate limiting for API endpoints
            if request.url.path.startswith("/api/") or request.url.path.startswith("/webhook/"):
                async with AsyncSessionLocal() as db_session:
                    validation_service = ValidationService(db_session)
                    
                    # Use IP as identifier for rate limiting
                    await validation_service.rate_limiter.check_rate_limit(
                        phone_number=f"ip:{client_ip}",
                        action="api_request"
                    )
            
            return await call_next(request)
            
        except RateLimitExceeded as e:
            logger.warning(f"Rate limit exceeded for IP {client_ip}: {str(e)}")
            return JSONResponse(
                status_code=HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "message": str(e),
                    "retry_after": 60  # seconds
                },
                headers={"Retry-After": "60"}
            )
        
        except Exception as e:
            logger.error(f"Rate limit middleware error: {str(e)}")
            return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request."""
        # Check for forwarded headers first
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip
        
        # Fallback to client host
        return request.client.host if request.client else "unknown"


class InputValidationMiddleware(BaseHTTPMiddleware):
    """Middleware for validating request input."""
    
    def __init__(self, app, max_request_size: int = 1024 * 1024):  # 1MB default
        super().__init__(app)
        self.max_request_size = max_request_size
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Validate request input."""
        try:
            # Validate request method
            if request.method not in ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]:
                return JSONResponse(
                    status_code=HTTP_400_BAD_REQUEST,
                    content={"error": "Invalid HTTP method"}
                )
            
            # Validate content type for POST/PUT requests
            if request.method in ["POST", "PUT", "PATCH"]:
                content_type = request.headers.get('content-type', '').lower()
                
                if content_type and not any(
                    allowed in content_type for allowed in [
                        'application/json',
                        'application/x-www-form-urlencoded',
                        'multipart/form-data',
                        'text/plain'
                    ]
                ):
                    return JSONResponse(
                        status_code=HTTP_400_BAD_REQUEST,
                        content={"error": "Unsupported content type"}
                    )
                
                # Validate JSON payload if present
                if 'application/json' in content_type:
                    try:
                        body = await request.body()
                        if body:
                            json.loads(body.decode('utf-8'))
                    except json.JSONDecodeError:
                        return JSONResponse(
                            status_code=HTTP_400_BAD_REQUEST,
                            content={"error": "Invalid JSON payload"}
                        )
                    except UnicodeDecodeError:
                        return JSONResponse(
                            status_code=HTTP_400_BAD_REQUEST,
                            content={"error": "Invalid character encoding"}
                        )
            
            return await call_next(request)
            
        except Exception as e:
            logger.error(f"Input validation middleware error: {str(e)}")
            return JSONResponse(
                status_code=HTTP_400_BAD_REQUEST,
                content={"error": "Request validation failed"}
            )


def setup_security_middleware(app):
    """Setup all security middleware for the application."""
    # Add middleware in reverse order (last added is executed first)
    
    # Input validation (innermost)
    app.add_middleware(InputValidationMiddleware)
    
    # Rate limiting
    app.add_middleware(RateLimitMiddleware)
    
    # General security (outermost)
    app.add_middleware(SecurityMiddleware)
    
    logger.info("Security middleware configured successfully")