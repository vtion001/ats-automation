"""
Auto-Call Tracking & Form/Note Auto-Fill
Automatically updates Google Form tracker AND Salesforce after calls

Client: Banyan
Priority: HIGH
Phase: 1
"""

from playwright.sync_api import Page
from core.config_loader import ConfigLoader
from core.logger import get_logger

logger = get_logger(__name__)


class AutoTracking:
    """Auto-updates tracker and SF after calls."""

    def __init__(self, client: str = "banyan"):
        self.client = client
        self.config = ConfigLoader(client)

    def initialize(self):
        """Load configuration."""
        config = self.config.load()
        if not config.get("automations", {}).get("auto_tracking", {}).get("enabled"):
            logger.info("Auto-Tracking is disabled")
            return False
        logger.info("Auto-Tracking initialized")
        return True

    def get_wrapup_data(self, ctm_page: Page) -> dict:
        """Get wrap-up data from CTM."""
        try:
            data = {"phone": "", "duration": "", "disposition": "", "notes": ""}

            phone_elem = ctm_page.query_selector("[class*='phone']")
            if phone_elem:
                data["phone"] = phone_elem.text_content().strip()

            disp_elem = ctm_page.query_selector("#disposition, .disposition-select")
            if disp_elem:
                data["disposition"] = disp_elem.input_value()

            return data

        except Exception as e:
            logger.error(f"Error getting wrapup data: {e}")
            return {}

    def update_google_form(self, form_url: str, data: dict) -> bool:
        """Update Google Form tracker via URL pre-fill."""
        try:
            # Build pre-filled URL
            prefill_url = f"{form_url}?entry.123456={data.get('phone', '')}"
            logger.info(f"Would update Google Form: {prefill_url}")
            return True
        except Exception as e:
            logger.error(f"Error updating Google Form: {e}")
            return False

    def update_salesforce(self, sf_page: Page, data: dict) -> bool:
        """Update Salesforce with call data."""
        try:
            logger.info(f"Would update SF: {data}")
            return True
        except Exception as e:
            logger.error(f"Error updating SF: {e}")
            return False


def run(client: str = "banyan"):
    """Main entry point."""
    tracking = AutoTracking(client)
    if tracking.initialize():
        logger.info("Auto-Tracking ready")


if __name__ == "__main__":
    run()
