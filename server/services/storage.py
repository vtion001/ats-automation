"""
Storage Service
Handles file-based storage for webhook results
"""

import json
import os
import threading
from typing import Dict, Optional

# Use absolute import
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import Config
except ImportError:

    class Config:
        pass


class StorageService:
    """Service for persistent storage"""

    def __init__(self):
        self.results_file = "/tmp/webhook_results.json"
        self.lock = threading.Lock()

    def load_results(self) -> Dict:
        """Load webhook results from file"""
        try:
            if os.path.exists(self.results_file):
                with open(self.results_file, "r") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error loading webhook results: {e}")
        return {}

    def save_results(self, results: Dict):
        """Save webhook results to file"""
        try:
            with open(self.results_file, "w") as f:
                json.dump(results, f)
        except Exception as e:
            logger.error(f"Error saving webhook results: {e}")

    def get_result(self, phone: str) -> Optional[Dict]:
        """Get result for a phone number"""
        with self.lock:
            results = self.load_results()
            if phone in results:
                result = results[phone]
                del results[phone]
                self.save_results(results)
                return result
        return None

    def save_result(self, phone: str, result: Dict):
        """Save result for a phone number"""
        with self.lock:
            results = self.load_results()
            results[phone] = result
            self.save_results(results)

    def get_all_results(self) -> list:
        """Get all stored results"""
        with self.lock:
            results = self.load_results()
            return list(results.values())


# Singleton instance
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """Get storage service singleton"""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
