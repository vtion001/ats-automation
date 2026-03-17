"""
Cache Service
In-memory caching for analyzed calls
"""

from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from loguru import logger

# Use absolute import
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import Config
except ImportError:

    class Config:
        CACHE_TTL_SECONDS = 300


class CacheService:
    """Simple in-memory cache for analysis results"""

    def __init__(self):
        self.cache: Dict[str, Tuple[datetime, Dict]] = {}
        self.ttl = Config.CACHE_TTL_SECONDS

    def get(self, key: str) -> Optional[Dict]:
        """Get cached result if not expired"""
        if key in self.cache:
            cached_time, response = self.cache[key]
            if (datetime.now() - cached_time).total_seconds() < self.ttl:
                logger.info(f"Cache hit for {key}")
                response["from_cache"] = True
                return response
            else:
                del self.cache[key]
        return None

    def set(self, key: str, value: Dict):
        """Cache a result"""
        self.cache[key] = (datetime.now(), value)
        logger.info(f"Cached result for {key}")

    def clear(self):
        """Clear all cached results"""
        self.cache.clear()


# Singleton instance
_cache_service: Optional[CacheService] = None


def get_cache_service() -> CacheService:
    """Get cache service singleton"""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service
