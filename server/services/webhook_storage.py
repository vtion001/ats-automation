"""
Webhook results storage service
"""

import json
import threading
import time
import logging
from config.settings import WEBHOOK_RESULTS_FILE
from utils.phone_utils import normalize_phone

logger = logging.getLogger(__name__)

WEBHOOK_RESULTS_LOCK = threading.Lock()


class WebhookStorage:
    def __init__(self, filepath: str = WEBHOOK_RESULTS_FILE):
        self.filepath = filepath

    def load(self) -> dict:
        """Load webhook results from file"""
        try:
            if os.path.exists(self.filepath):
                with open(self.filepath, "r") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error loading webhook results: {e}")
        return {}

    def save(self, results: dict) -> None:
        """Save webhook results to file"""
        try:
            with open(self.filepath, "w") as f:
                json.dump(results, f)
        except Exception as e:
            logger.error(f"Error saving webhook results: {e}")

    def store(self, phone: str, data: dict) -> None:
        """Store result for a phone number"""
        with WEBHOOK_RESULTS_LOCK:
            results = self.load()
            results[normalize_phone(phone)] = data
            results[normalize_phone(phone)]["timestamp"] = time.time()
            self.save(results)
        logger.info(f"Webhook result stored for phone: {phone}")

    def get(self, phone: str, delete: bool = True) -> dict | None:
        """Get result for a phone number"""
        with WEBHOOK_RESULTS_LOCK:
            results = self.load()
            normalized = normalize_phone(phone)

            if normalized in results:
                result = results[normalized]
                if delete:
                    del results[normalized]
                    self.save(results)
                return result

        return None

    def get_all(self) -> list:
        """Get all stored results"""
        with WEBHOOK_RESULTS_LOCK:
            results = self.load()
            return list(results.values())


import os

webhook_storage = WebhookStorage()
