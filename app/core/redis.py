"""
Redis configuration and connection management.
"""

import redis.asyncio as redis
from app.config import settings

# Create Redis connection pool
redis_pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
)

# Create Redis client
redis_client = redis.Redis(connection_pool=redis_pool)


async def get_redis() -> redis.Redis:
    """Dependency to get Redis client."""
    return redis_client