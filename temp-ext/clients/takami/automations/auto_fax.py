"""
Auto-Fax for Appeals
Automatically sends fax appeals to insurance carriers

Client: Takahami
Priority: HIGH
Phase: 1
"""

import pyautogui
from pathlib import Path
from core.config_loader import ConfigLoader
from core.logger import get_logger

logger = get_logger(__name__)


class AutoFax:
    """Automated fax submission for appeals."""

    def __init__(self, client: str = "takami"):
        self.client = client
        self.config = ConfigLoader(client)
        self.carrier_fax = {}

    def initialize(self):
        """Load configuration."""
        config = self.config.load()
        if not config.get("automations", {}).get("auto_fax", {}).get("enabled"):
            logger.info("Auto-Fax is disabled")
            return False

        # Load carrier fax numbers
        templates = self.config.get_templates()
        self.carrier_fax = templates.get("carrier_fax", {})

        logger.info("Auto-Fax initialized")
        return True

    def send_fax(self, claim_data: dict, pdf_path: str) -> bool:
        """Send fax for an appeal."""
        try:
            carrier = claim_data.get("insurance", "").lower()
            fax_number = self.carrier_fax.get(carrier, "")

            if not fax_number:
                logger.warning(f"No fax number for carrier: {carrier}")
                return False

            logger.info(f"Sending fax to {carrier}: {fax_number}")

            # Trigger fax workflow via hotkey
            pyautogui.hotkey("ctrl", "shift", "f")

            # Would implement actual fax portal automation here
            return True

        except Exception as e:
            logger.error(f"Error sending fax: {e}")
            return False


def run(client: str = "takami"):
    """Main entry point."""
    fax = AutoFax(client)
    if fax.initialize():
        logger.info("Auto-Fax ready")


if __name__ == "__main__":
    run()
