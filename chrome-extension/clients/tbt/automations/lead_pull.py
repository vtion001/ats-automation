"""
Auto-Lead Pull & Inbound Routing
Monitors Salesforce queue and routes incoming leads

Client: TBT
Priority: HIGH
Phase: 1
"""

from playwright.sync_api import Page
from core.config_loader import ConfigLoader
from core.logger import get_logger

logger = get_logger(__name__)


class LeadPull:
    """Monitors SF queue and routes leads."""

    def __init__(self, client: str = "tbt"):
        self.client = client
        self.config = ConfigLoader(client)

    def initialize(self):
        """Load configuration."""
        config = self.config.load()
        if not config.get("automations", {}).get("lead_pull", {}).get("enabled"):
            logger.info("Lead Pull is disabled")
            return False
        logger.info("Lead Pull initialized")
        return True

    def check_queue(self, sf_page: Page) -> list:
        """Check Salesforce queue for new leads."""
        try:
            # Navigate to queue
            sf_page.goto(
                "https://wethebest.lightning.force.com/lightning/setup/ObjectManager/Lead/View"
            )
            sf_page.wait_for_load_state()

            # Find queue items
            rows = sf_page.query_selector_all(".forceTable tr")
            leads = []

            for row in rows[1:]:  # Skip header
                cells = row.query_selector_all("td")
                if len(cells) >= 3:
                    leads.append(
                        {
                            "name": cells[0].text_content().strip(),
                            "phone": cells[1].text_content().strip(),
                            "status": cells[2].text_content().strip(),
                        }
                    )

            logger.info(f"Found {len(leads)} leads in queue")
            return leads

        except Exception as e:
            logger.error(f"Error checking queue: {e}")
            return []


def run(client: str = "tbt"):
    """Main entry point."""
    pull = LeadPull(client)
    if pull.initialize():
        logger.info("Lead Pull ready")


if __name__ == "__main__":
    run()
