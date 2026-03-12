#!/usr/bin/env python3
"""
ATS Automation - Main Entry Point

Usage:
    python main.py start --client flyland
    python main.py test --client flyland
    python main.py config --client flyland
"""

import argparse
import sys
import os
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from core.config_loader import ConfigLoader
from core.logger import setup_logging, get_logger


def start_automation(client: str):
    """Start the automation for a specific client."""
    print(f"Starting ATS Automation for: {client}")

    setup_logging(client)
    logger = get_logger(__name__)

    try:
        config = ConfigLoader(client).load()
        logger.info(f"Loaded config for {client}")
        print(f"[OK] Config loaded: {config.get('display_name', client)}")
    except FileNotFoundError:
        print(f"[X] Config not found for client: {client}")
        print(f"  Available clients: {get_available_clients()}")
        return

    automations = config.get("automations", {})
    enabled = [k for k, v in automations.items() if v.get("enabled")]

    print(f"[OK] Enabled automations: {', '.join(enabled)}")

    if not enabled:
        print("[!] No automations enabled for this client")
        return

    for auto_name in enabled:
        print(f"\n> Running automation: {auto_name}")
        try:
            run_automation(client, auto_name)
            print(f"[OK] {auto_name} completed")
        except Exception as e:
            print(f"[X] {auto_name} failed: {e}")
            logger.exception(f"Automation {auto_name} failed")


def run_automation(client: str, automation_name: str):
    """Run a specific automation."""
    import importlib.util

    auto_module_path = PROJECT_ROOT / "clients" / client / "automations" / f"{automation_name}.py"

    if not auto_module_path.exists():
        raise FileNotFoundError(f"Automation script not found: {auto_module_path}")

    spec = importlib.util.spec_from_file_location(f"automation_{automation_name}", auto_module_path)
    if spec is None or spec.loader is None:
        raise ValueError(f"Cannot load automation {automation_name}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    if hasattr(module, "run"):
        module.run(client)
    elif hasattr(module, "main"):
        module.main(client)
    else:
        raise ValueError(f"Automation {automation_name} has no run() or main() function")


def test_automation(client: str):
    """Test the automation setup for a client."""
    print(f"Testing ATS Automation for: {client}")

    setup_logging(client, "DEBUG")
    logger = get_logger(__name__)

    try:
        config_loader = ConfigLoader(client)
        config = config_loader.load()
        print("[OK] Config loaded")

        # Test DOM profiles
        systems = config.get("systems", {})
        for system in systems:
            profile = config_loader.get_dom_profile(system)
            if profile:
                print(f"[OK] DOM profile loaded: {system}")
            else:
                print(f"[!] No DOM profile: {system}")

        # Test templates
        templates = config_loader.get_templates()
        if templates:
            print(f"[OK] Templates loaded")
        else:
            print(f"[!] No templates found")

        print("\n[PASS] All tests passed!")

    except Exception as e:
        print(f"[X] Test failed: {e}")
        logger.exception("Test failed")


def show_config(client: str):
    """Show configuration for a client."""
    try:
        config = ConfigLoader(client).load()
        import json

        print(json.dumps(config, indent=2))
    except FileNotFoundError:
        print(f"Config not found for: {client}")


def get_available_clients():
    """Get list of available clients."""
    clients_dir = PROJECT_ROOT / "clients"
    if not clients_dir.exists():
        return []
    return [d.name for d in clients_dir.iterdir() if d.is_dir()]


def main():
    parser = argparse.ArgumentParser(description="ATS Automation System")
    parser.add_argument(
        "command", choices=["start", "test", "config", "list"], help="Command to run"
    )
    parser.add_argument("--client", "-c", help="Client name (e.g., flyland, legacy)")
    parser.add_argument("--debug", "-d", action="store_true", help="Enable debug logging")

    args = parser.parse_args()

    if args.command == "list":
        clients = get_available_clients()
        print("Available clients:")
        for c in clients:
            print(f"  - {c}")
        return

    if not args.client:
        print("Error: --client is required")
        print(f"Available clients: {get_available_clients()}")
        sys.exit(1)

    if args.command == "start":
        start_automation(args.client)
    elif args.command == "test":
        test_automation(args.client)
    elif args.command == "config":
        show_config(args.client)


if __name__ == "__main__":
    main()
