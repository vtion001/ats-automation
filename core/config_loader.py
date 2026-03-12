import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).parent
CLIENTS_DIR = PROJECT_ROOT / "clients"
CORE_DIR = PROJECT_ROOT / "core"
SERVER_URL = os.getenv("ATS_SERVER_URL", "http://localhost:8000")
API_KEY = os.getenv("ATS_API_KEY", "")


class ConfigLoader:
    """Loads configuration from local files and optional central server."""

    def __init__(self, client: str):
        self.client = client.lower()
        self.client_dir = CLIENTS_DIR / self.client
        self._config: Optional[Dict] = None

    def load(self) -> Dict[str, Any]:
        """Load client configuration."""
        config_path = self.client_dir / "config.json"

        if not config_path.exists():
            raise FileNotFoundError(f"Config not found: {config_path}")

        with open(config_path, "r") as f:
            self._config = json.load(f)

        return self._config

    def get_automations(self) -> Dict[str, Any]:
        """Get automations configuration."""
        if not self._config:
            self.load()
        return self._config.get("automations", {})

    def get_systems(self) -> Dict[str, Any]:
        """Get systems configuration."""
        if not self._config:
            self.load()
        return self._config.get("systems", {})

    def get_dom_profile(self, system: str) -> Dict[str, Any]:
        """Get DOM profile for a specific system."""
        profile_path = self.client_dir / "dom_profiles" / f"{system}.json"

        if not profile_path.exists():
            return {}

        with open(profile_path, "r") as f:
            return json.load(f)

    def get_templates(self) -> Dict[str, Any]:
        """Get reply templates."""
        template_path = self.client_dir / "templates" / "reply_templates.json"

        if not template_path.exists():
            return {}

        with open(template_path, "r") as f:
            return json.load(f)

    def sync_from_server(self) -> bool:
        """Sync config from central server."""
        if not SERVER_URL or not API_KEY:
            logging.warning("Server URL or API key not configured, using local config")
            return False

        try:
            import requests

            response = requests.get(
                f"{SERVER_URL}/api/config/{self.client}",
                headers={"Authorization": f"Bearer {API_KEY}"},
                timeout=10,
            )
            if response.status_code == 200:
                config_path = self.client_dir / "config.json"
                with open(config_path, "w") as f:
                    f.write(response.text)
                logging.info(f"Synced config from server for {self.client}")
                return True
        except Exception as e:
            logging.error(f"Failed to sync config: {e}")

        return False


def get_client_config(client: str) -> Dict[str, Any]:
    """Helper function to get client config."""
    loader = ConfigLoader(client)
    return loader.load()
