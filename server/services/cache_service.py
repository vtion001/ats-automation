"""
Cache service - in-memory caching for analysis results
"""

from datetime import datetime
from config.settings import CACHE_TTL_SECONDS
import logging

logger = logging.getLogger(__name__)

ANALYSIS_CACHE = {}


class CacheService:
    def __init__(self, ttl_seconds: int = CACHE_TTL_SECONDS):
        self.ttl = ttl_seconds

    def get(self, key: str) -> dict | None:
        """Get cached analysis for phone number"""
        if key not in ANALYSIS_CACHE:
            return None

        cached_time, cached_response = ANALYSIS_CACHE[key]
        if (datetime.now() - cached_time).total_seconds() < self.ttl:
            logger.info(f"Returning cached analysis for {key}")
            cached_response["from_cache"] = True
            return cached_response

        # Expired - remove from cache
        del ANALYSIS_CACHE[key]
        return None

    def set(self, key: str, value: dict) -> None:
        """Cache analysis result"""
        ANALYSIS_CACHE[key] = (datetime.now(), value)
        logger.info(f"Cached analysis for {key}")

    def clear(self) -> None:
        """Clear all cached data"""
        ANALYSIS_CACHE.clear()


cache_service = CacheService()
