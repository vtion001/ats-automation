import sys
import logging
from pathlib import Path
from loguru import logger
from datetime import datetime


def setup_logging(client: str, log_level: str = "INFO") -> None:
    """Setup logging for the automation system."""

    log_dir = Path(__file__).parent.parent / "logs" / client
    log_dir.mkdir(parents=True, exist_ok=True)

    logger.remove()

    logger.add(
        sys.stderr,
        level=log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    )

    logger.add(
        log_dir / "automation.log",
        rotation="10 MB",
        retention="7 days",
        level=log_level,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}",
    )

    logger.add(
        log_dir / "errors.log",
        rotation="10 MB",
        retention="30 days",
        level="ERROR",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}",
    )

    logger.info(f"Logging initialized for client: {client}")
    logger.info(f"Log files at: {log_dir}")


def get_logger(name: str = __name__):
    """Get a logger instance."""
    return logger.bind(name=name)
