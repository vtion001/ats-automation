"""
Remote log storage service - file-based persistent log store
"""

import json
import logging
import os
import threading
import time
from datetime import datetime

logger = logging.getLogger(__name__)

LOG_FILE = "/tmp/ats_remote_logs.json"
MAX_LOGS = 10000
LOG_LOCK = threading.Lock()


def _load_logs() -> list:
    try:
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, "r") as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Error loading remote logs: {e}")
    return []


def _save_logs(logs: list) -> None:
    try:
        with open(LOG_FILE, "w") as f:
            json.dump(logs, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving remote logs: {e}")


def store_log(client: str, log_entry: dict) -> dict:
    with LOG_LOCK:
        logs = _load_logs()

        entry = {
            **log_entry,
            "client": client,
            "received_at": datetime.now().isoformat(),
        }

        logs.insert(0, entry)

        if len(logs) > MAX_LOGS:
            logs = logs[:MAX_LOGS]

        _save_logs(logs)
        logger.info(
            f"Remote log stored for {client}: {entry.get('level', 'log')} - {entry.get('message', '')[:60]}"
        )

    return entry


def get_logs(source: str = None, level: str = None, client: str = None) -> list:
    with LOG_LOCK:
        logs = _load_logs()

    filtered = []
    for log in logs:
        if source and log.get("source") != source:
            continue
        if level and log.get("level") != level:
            continue
        if client and log.get("client") != client:
            continue
        filtered.append(log)

    return filtered


def clear_logs() -> int:
    with LOG_LOCK:
        logs = _load_logs()
        count = len(logs)
        _save_logs([])
    logger.info(f"Cleared {count} remote logs")
    return count
