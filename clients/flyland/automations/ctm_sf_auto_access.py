"""
CTM-SF Auto-Account Access
Automatically opens Salesforce account when call comes via CTM

Uses existing Chrome browser session where extension is installed.
Connect to Chrome via debugging port: chrome.exe --remote-debugging-port=9222
"""

from core.config_loader import ConfigLoader
from core.logger import get_logger
import time
import asyncio

logger = get_logger(__name__)


class CTMSFAutoAccess:
    """Automatically look up and display Salesforce account for incoming CTM calls."""

    def __init__(self, client: str = "flyland", debug_port: int = 9222):
        self.client = client
        self.config = ConfigLoader(client)
        self.debug_port = debug_port

    def start(self):
        """Start the automation."""
        config = self.config.load()

        if not config.get("automations", {}).get("ctm_sf_auto_access", {}).get("enabled"):
            logger.info("CTM-SF Auto Access is disabled")
            return

        logger.info("Starting CTM-SF Auto Access automation")
        logger.info("=" * 50)
        logger.info("IMPORTANT: Chrome must be running with remote debugging:")
        logger.info("  chrome.exe --remote-debugging-port=9222")
        logger.info("=" * 50)

        asyncio.run(self.run_automation())

    async def run_automation(self):
        """Run the automation connecting to existing Chrome."""
        try:
            from playwright.async_api import async_playwright
            
            async with async_playwright() as p:
                try:
                    browser = await p.chromium.connect_over_cdp(
                        f"http://localhost:{self.debug_port}/"
                    )
                except Exception as e:
                    logger.error(f"Cannot connect to Chrome on port {self.debug_port}")
                    logger.error(f"Make sure Chrome is running with: chrome.exe --remote-debugging-port=9222")
                    logger.error(f"Error: {e}")
                    return

                logger.info("Connected to Chrome browser")

                contexts = browser.contexts
                if not contexts:
                    logger.error("No browser contexts found")
                    return

                context = contexts[0]
                
                ctm_page = None
                for page in context.pages:
                    if "calltrackingmetrics" in page.url.lower():
                        ctm_page = page
                        break
                
                if not ctm_page:
                    logger.error("CTM page not found. Please open CTM in Chrome first.")
                    logger.info("Open https://www.calltrackingmetrics.com in Chrome and log in.")
                    return
                
                logger.info(f"Found CTM page: {ctm_page.url}")
                logger.info("Monitoring for calls... (Press Ctrl+C to stop)")
                
                poll_interval = 0.5
                while True:
                    try:
                        call_data = await self.detect_call(ctm_page)
                        if call_data:
                            logger.info(f"Call detected: {call_data}")
                            await self.lookup_salesforce(context, call_data["phone"])
                    except Exception as e:
                        logger.debug(f"Monitoring: {e}")
                    
                    await asyncio.sleep(poll_interval)
                    
        except Exception as e:
            logger.error(f"Automation error: {e}")

    async def detect_call(self, page):
        """Detect if there's an active call in CTM."""
        try:
            call_element = await page.query_selector(".call-info, .caller-id, [class*='call-active']")
            
            if call_element:
                phone_element = await page.query_selector("[class*='phone']")
                if phone_element:
                    phone = await phone_element.text_content()
                    if phone:
                        return {"phone": phone.strip(), "timestamp": time.time()}
        except Exception as e:
            logger.debug(f"No call detected: {e}")
        
        return None

    async def lookup_salesforce(self, context, phone: str):
        """Look up the phone number in Salesforce."""
        try:
            logger.info(f"Looking up {phone} in Salesforce...")
            
            sf_url = f"https://flyland.lightning.force.com/lightning/setup/FindRecords?term={phone}"
            
            sf_page = await context.new_page()
            await sf_page.goto(sf_url)
            
            logger.info("Salesforce search opened")
            
        except Exception as e:
            logger.error(f"Error looking up Salesforce: {e}")


def run(client: str = "flyland"):
    """Main entry point."""
    automation = CTMSFAutoAccess(client)
    automation.start()


if __name__ == "__main__":
    run()
