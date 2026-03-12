"""
Claim-Type-Based Appeal Router
Determines appeal destination based on claim type

Client: Takahami
Priority: HIGH
Phase: 1
"""

from playwright.sync_api import Page
from core.config_loader import ConfigLoader
from core.logger import get_logger

logger = get_logger(__name__)


class AppealRouter:
    """Routes appeals based on claim type."""

    def __init__(self, client: str = "takami"):
        self.client = client
        self.config = ConfigLoader(client)
        self.rules = []

    def initialize(self):
        """Load configuration."""
        config = self.config.load()
        if not config.get("automations", {}).get("appeal_router", {}).get("enabled"):
            logger.info("Appeal Router is disabled")
            return False

        # Load routing rules
        templates = self.config.get_templates()
        self.carrier_fax = templates.get("carrier_fax", {})

        logger.info("Appeal Router initialized")
        return True

    def get_claim_info(self, page: Page) -> dict:
        """Extract claim info from CollaborateMD."""
        try:
            info = {"claim_id": "", "claim_type": "", "insurance": "", "status": ""}

            claim_row = page.query_selector(".claimRow")
            if claim_row:
                cells = claim_row.query_selector_all("td")
                if len(cells) >= 4:
                    info["claim_id"] = cells[0].text_content().strip()
                    info["claim_type"] = cells[1].text_content().strip()
                    info["insurance"] = cells[2].text_content().strip()
                    info["status"] = cells[3].text_content().strip()

            return info

        except Exception as e:
            logger.error(f"Error getting claim info: {e}")
            return {}

    def route_appeal(self, claim_info: dict) -> dict:
        """Determine appeal destination."""
        insurance = claim_info.get("insurance", "").lower()

        # Find fax number
        fax_number = self.carrier_fax.get(insurance, "")

        if fax_number:
            return {
                "destination": "fax",
                "fax_number": fax_number,
                "insurance": insurance,
                "action": f"Send appeal via fax to {fax_number}",
            }

        return {"destination": "manual", "action": "Manual routing required - unknown insurance"}


def run(client: str = "takami"):
    """Main entry point."""
    router = AppealRouter(client)
    if router.initialize():
        logger.info("Appeal Router ready")


if __name__ == "__main__":
    run()
