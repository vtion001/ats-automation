#!/usr/bin/env python3
"""
ATS Extension Monitor
Real-time log viewer for CTM/Extension debugging
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
from datetime import datetime

# Try to import colorama for colored output
try:
    from colorama import init, Fore, Style

    init(autoreset=True)
    COLORS = {
        "log": "",
        "warn": Fore.YELLOW,
        "error": Fore.RED,
        "info": Fore.CYAN,
        "success": Fore.GREEN,
    }
except ImportError:
    COLORS = {k: "" for k in ["log", "warn", "error", "info", "success"]}


class LogMonitor:
    def __init__(self, logs_dir="/tmp/ats_logs"):
        self.logs_dir = Path(logs_dir)
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.seen_entries = set()

    def find_latest_log(self):
        """Find the most recent log file"""
        if not self.logs_dir.exists():
            return None

        log_files = list(self.logs_dir.glob("*.json"))
        if not log_files:
            return None

        return max(log_files, key=lambda p: p.stat().st_mtime)

    def read_logs(self, filename=None):
        """Read logs from file"""
        if filename:
            log_file = self.logs_dir / filename
        else:
            log_file = self.find_latest_log()

        if not log_file or not log_file.exists():
            return []

        try:
            with open(log_file, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def filter_logs(self, logs, source=None, level=None, client=None):
        """Filter logs by criteria"""
        filtered = []
        for log in logs:
            if source and log.get("source") != source:
                continue
            if level and log.get("level") != level:
                continue
            if client and log.get("client") != client:
                continue
            filtered.append(log)
        return filtered

    def format_log(self, log):
        """Format a log entry for display"""
        timestamp = log.get("timestamp", "")
        if timestamp:
            # Simplify timestamp
            try:
                dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                timestamp = dt.strftime("%H:%M:%S")
            except:
                pass

        source = log.get("source", "unknown")
        level = log.get("level", "log")
        message = log.get("message", "")

        color = COLORS.get(level, "")
        reset = Style.RESET_ALL if color else ""

        source_indicator = {
            "ctm": "[CTM]",
            "extension": "[EXT]",
            "server": "[SRV]",
        }.get(source, f"[{source[:3].upper()}]")

        level_indicator = {
            "log": "",
            "warn": "⚠",
            "error": "✗",
            "info": "→",
        }.get(level, "")

        return f"{color}{timestamp} {source_indicator} {level_indicator} {message}{reset}"

    def monitor(self, source=None, level=None, client=None, poll_interval=2):
        """Monitor logs in real-time"""
        print(f"\n{'=' * 60}")
        print(f"ATS Extension Monitor - Watching for logs...")
        print(f"{'=' * 60}")
        print(
            f"Filters: source={source or 'all'}, level={level or 'all'}, client={client or 'all'}"
        )
        print(f"Press Ctrl+C to stop\n")

        try:
            while True:
                logs = self.read_logs()
                filtered = self.filter_logs(logs, source, level, client)

                for log in filtered:
                    # Create unique key to avoid duplicates
                    key = f"{log.get('timestamp', '')}:{log.get('message', '')}"
                    if key not in self.seen_entries:
                        self.seen_entries.add(key)
                        print(self.format_log(log))

                time.sleep(poll_interval)

        except KeyboardInterrupt:
            print("\n\nMonitoring stopped.")
            print(f"Total unique logs shown: {len(self.seen_entries)}")


def main():
    parser = argparse.ArgumentParser(description="ATS Extension Log Monitor")
    parser.add_argument(
        "--source", "-s", choices=["ctm", "extension", "server"], help="Filter by source"
    )
    parser.add_argument(
        "--level", "-l", choices=["log", "warn", "error", "info"], help="Filter by level"
    )
    parser.add_argument("--client", "-c", help="Filter by client name")
    parser.add_argument(
        "--poll", "-p", type=int, default=2, help="Poll interval in seconds (default: 2)"
    )
    parser.add_argument("--logs-dir", default="/tmp/ats_logs", help="Logs directory")

    args = parser.parse_args()

    monitor = LogMonitor(logs_dir=args.logs_dir)
    monitor.monitor(
        source=args.source, level=args.level, client=args.client, poll_interval=args.poll
    )


if __name__ == "__main__":
    main()
