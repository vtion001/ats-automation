"""
CTM-SF Auto-Account Pop-Up
Automatically displays Salesforce account for incoming CTM calls

Client: Banyan
Priority: HIGH
Phase: 1
"""

from playwright.sync_api import Page
from core.config_loader import ConfigLoader
from core.logger import get_logger

logger = get_logger(__name__)


class CTMSFPopup:
    """Displays SF account popup for CTM calls."""

    def __init__(self, client: str = "banyan"):
        self.client = client
        self.config = ConfigLoader(client)

    def initialize(self):
        """Load configuration."""
        config = self.config.load()
        if not config.get("automations", {}).get("ctm_sf_popup", {}).get("enabled"):
            logger.info("CTM-SF Popup is disabled")
            return False
        logger.info("CTM-SF Popup initialized")
        return True

    def monitor_ctm(self, ctm_page: Page):
        """Monitor CTM for incoming calls."""
        poll_interval = 500  # ms

        import time

        while True:
            try:
                call_element = ctm_page.query_selector(".call-info, .caller-id")
                if call_element:
                    phone_elem = ctm_page.query_selector("[class*='phone']")
                    if phone_elem:
                        phone = phone_elem.text_content().strip()
                        if phone:
                            logger.info(f"Call detected: {phone}")
                            return phone
            except Exception as e:
                logger.debug(f"Monitoring: {e}")

            time.sleep(poll_interval / 1000)


def run(client: str = "banyan"):
    """Main entry point."""
    popup = CTMSFPopup(client)
    if popup.initialize():
        logger.info("CTM-SF Popup ready")


if __name__ == "__main__":
    run()
