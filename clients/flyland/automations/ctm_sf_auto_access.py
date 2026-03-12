"""
CTM-SF Auto-Account Access
Automatically opens Salesforce account when call comes via CTM

Client: Flyland Recovery
Priority: HIGH
Phase: 1
"""

from playwright.sync_api import sync_playwright, Page
from core.browser_manager import BrowserManager
from core.config_loader import ConfigLoader
from core.logger import get_logger
import time

logger = get_logger(__name__)


class CTMSFAutoAccess:
    """Automatically look up and display Salesforce account for incoming CTM calls."""

    def __init__(self, client: str = "flyland"):
        self.client = client
        self.config = ConfigLoader(client)
        self.browser_manager = None
        self.ctm_page = None
        self.sf_page = None

    def start(self):
        """Start the automation."""
        config = self.config.load()

        if not config.get("automations", {}).get("ctm_sf_auto_access", {}).get("enabled"):
            logger.info("CTM-SF Auto Access is disabled")
            return

        logger.info("Starting CTM-SF Auto Access automation")

        self.browser_manager = BrowserManager(headless=False)

        with self.browser_manager as browser:
            context = browser.new_context()

            # Open CTM
            logger.info("Opening CTM...")
            self.ctm_page = context.new_page()
            self.ctm_page.goto("https://www.calltrackingmetrics.com")

            # Agent logs in manually (automation works on existing session)
            logger.info("Please log into CTM. Automation will start after login.")

            # Wait for login
            self.ctm_page.wait_for_url("**/account**", timeout=60000)
            logger.info("CTM logged in, starting call monitoring...")

            # Start monitoring for calls
            self.monitor_calls(context)

    def monitor_calls(self, context):
        """Monitor CTM for incoming calls."""
        poll_interval = 500  # ms

        while True:
            try:
                call_data = self.detect_call(self.ctm_page)
                if call_data:
                    logger.info(f"Call detected: {call_data}")
                    self.lookup_salesforce(context, call_data["phone"])
            except Exception as e:
                logger.error(f"Error monitoring calls: {e}")

            time.sleep(poll_interval / 1000)

    def detect_call(self, page: Page) -> dict:
        """Detect if there's an active call in CTM."""
        try:
            # Look for call notification elements
            call_element = page.query_selector(".call-info, .caller-id, [class*='call-active']")

            if call_element:
                phone_element = page.query_selector("[class*='phone']")
                if phone_element:
                    phone = phone_element.text_content()
                    if phone:
                        return {"phone": phone.strip(), "timestamp": time.time()}
        except Exception as e:
            logger.debug(f"No call detected: {e}")

        return None

    def lookup_salesforce(self, context, phone: str):
        """Look up the phone number in Salesforce."""
        try:
            logger.info(f"Looking up {phone} in Salesforce...")

            # Open Salesforce in new tab
            sf_url = f"https://flyland.lightning.force.com/lightning/setup/FindRecords?term={phone}"
            self.sf_page = context.new_page()
            self.sf_page.goto(sf_url)

            logger.info("Salesforce search opened")

        except Exception as e:
            logger.error(f"Error looking up Salesforce: {e}")


def run(client: str = "flyland"):
    """Main entry point."""
    automation = CTMSFAutoAccess(client)
    automation.start()


if __name__ == "__main__":
    run()
