"""
Auto-Lead Pruning
Automatically removes unresponsive leads based on last contact date

Client: TBT
Priority: HIGH
Phase: 1
"""

import csv
import os
from datetime import datetime, timedelta
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from core.config_loader import ConfigLoader
from core.logger import get_logger

logger = get_logger(__name__)


class LeadPruning:
    """Prunes unresponsive leads from CSV exports."""

    def __init__(self, client: str = "tbt"):
        self.client = client
        self.config = ConfigLoader(client)
        self.prune_threshold_days = 30

    def initialize(self):
        """Load configuration."""
        config = self.config.load()
        if not config.get("automations", {}).get("lead_pruning", {}).get("enabled"):
            logger.info("Lead Pruning is disabled")
            return False
        logger.info("Lead Pruning initialized")
        return True

    def prune_leads(self, csv_path: str) -> dict:
        """Prune leads with no activity in threshold days."""
        try:
            pruned_count = 0
            kept_leads = []

            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                fieldnames = reader.fieldnames

                for row in reader:
                    last_activity = row.get("Last_Activity", row.get("LastActivityDate", ""))

                    if last_activity:
                        try:
                            activity_date = datetime.strptime(last_activity, "%Y-%m-%d")
                            days_since = (datetime.now() - activity_date).days

                            if days_since > self.prune_threshold_days:
                                pruned_count += 1
                                continue
                        except ValueError:
                            pass

                    kept_leads.append(row)

            # Write pruned results
            pruned_path = csv_path.replace(".csv", "_pruned.csv")
            with open(pruned_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(kept_leads)

            logger.info(f"Pruned {pruned_count} leads, kept {len(kept_leads)}")
            return {"pruned": pruned_count, "kept": len(kept_leads), "output": pruned_path}

        except Exception as e:
            logger.error(f"Error pruning leads: {e}")
            return {"error": str(e)}


class CSVWatcher(FileSystemEventHandler):
    """Watches Downloads folder for new CSV files."""

    def __init__(self, pruning):
        self.pruning = pruning

    def on_created(self, event):
        if event.is_directory:
            return
        if event.src_path.endswith(".csv"):
            logger.info(f"New CSV detected: {event.src_path}")
            self.pruning.prune_leads(event.src_path)


def run(client: str = "tbt"):
    """Main entry point."""
    pruning = LeadPruning(client)
    if pruning.initialize():
        logger.info("Lead Pruning ready - watching for CSV files")


if __name__ == "__main__":
    run()
