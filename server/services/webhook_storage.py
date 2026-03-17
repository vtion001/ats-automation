"""
Webhook results storage service
"""

import json
import logging
import os
import threading
import time
from config.settings import WEBHOOK_RESULTS_FILE
from utils.phone_utils import normalize_phone

logger = logging.getLogger(__name__)

WEBHOOK_RESULTS_LOCK = threading.Lock()


class WebhookStorage:
    def __init__(self, filepath: str = WEBHOOK_RESULTS_FILE):
        self.filepath = filepath
        logger.info(f"WebhookStorage initialized with filepath: {self.filepath}")

    def load(self) -> dict:
        """Load webhook results from file"""
        try:
            logger.info(f"Loading from: {self.filepath}, exists: {os.path.exists(self.filepath)}")
            if os.path.exists(self.filepath):
                with open(self.filepath, "r") as f:
                    data = json.load(f)
                    logger.info(f"Loaded keys: {list(data.keys())}")
                    return data
        except Exception as e:
            logger.error(f"Error loading webhook results: {e}")
        return {}

    def save(self, results: dict) -> None:
        """Save webhook results to file"""
        try:
            with open(self.filepath, "w") as f:
                json.dump(results, f)
            logger.info(f"Saved, new keys: {list(results.keys())}")
        except Exception as e:
            logger.error(f"Error saving webhook results: {e}")

    def store(self, phone: str, data: dict) -> None:
        """Store result for a phone number"""
        with WEBHOOK_RESULTS_LOCK:
            results = self.load()
            normalized = normalize_phone(phone)
            logger.info(f"Storing for phone: {phone} -> normalized: {normalized}")
            results[normalized] = data
            results[normalized]["timestamp"] = time.time()
            self.save(results)
        logger.info(f"Webhook result stored for phone: {phone}")

    def get(self, phone: str, delete: bool = True) -> dict | None:
        """Get result for a phone number"""
        with WEBHOOK_RESULTS_LOCK:
            results = self.load()
            normalized = normalize_phone(phone)
            logger.info(f"GET looking for: {normalized}, available keys: {list(results.keys())}")

            if normalized in results:
                result = results[normalized]
                logger.info(f"Found result for {normalized}")
                if delete:
                    del results[normalized]
                    self.save(results)
                return result

        logger.info(f"No result found for {normalized}")
        return None

    def get_all(self) -> list:
        """Get all stored results"""
        with WEBHOOK_RESULTS_LOCK:
            results = self.load()
            return list(results.values())


webhook_storage = WebhookStorage()
