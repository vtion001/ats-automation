"""
Customer History Auto-Pull
Automatically loads caller history from Salesforce

Client: Legacy
Priority: HIGH
Phase: 1
"""

from playwright.sync_api import Page
from core.config_loader import ConfigLoader
from core.logger import get_logger

logger = get_logger(__name__)


class HistoryAutoPull:
    """Auto-loads customer history from Salesforce."""

    def __init__(self, client: str = "legacy"):
        self.client = client
        self.config = ConfigLoader(client)

    def initialize(self):
        """Load configuration."""
        config = self.config.load()
        if not config.get("automations", {}).get("history_auto_pull", {}).get("enabled"):
            logger.info("History Auto-Pull is disabled")
            return False
        logger.info("History Auto-Pull initialized")
        return True

    def get_caller_history(self, phone: str, sf_page: Page) -> dict:
        """Query Salesforce for caller history."""
        try:
            logger.info(f"Querying history for: {phone}")

            # Navigate to SF search
            sf_page.goto(
                f"https://flyland.lightning.force.com/lightning/setup/FindRecords?term={phone}"
            )
            sf_page.wait_for_load_state()

            # Extract history from results
            history = {"phone": phone, "calls": [], "last_contact": None, "status": "unknown"}

            # Look for previous interactions
            result_rows = sf_page.query_selector_all(".forceListRecordSelector tr")
            if result_rows:
                history["calls"] = len(result_rows)
                history["last_contact"] = "found"

            logger.info(f"History found: {history}")
            return history

        except Exception as e:
            logger.error(f"Error getting history: {e}")
            return {"phone": phone, "error": str(e)}

    def create_reminder(self, history: dict) -> str:
        """Create reminder message based on history."""
        if history.get("calls", 0) > 0:
            return f"Previous contact: {history.get('calls')} prior calls"
        return "New contact"


def run(client: str = "legacy"):
    """Main entry point."""
    pull = HistoryAutoPull(client)
    if pull.initialize():
        logger.info("History Auto-Pull ready")


if __name__ == "__main__":
    run()
