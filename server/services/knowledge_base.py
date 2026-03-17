"""
Knowledge Base Service
Manages loading and accessing client knowledge bases
"""

import json
import os
from pathlib import Path
from typing import Dict, Optional, Any
from loguru import logger

# Use absolute import for config
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import Config
except ImportError:
    # Fallback if config not available
    class Config:
        @staticmethod
        def get_kb_dir():
            base = Path(__file__).parent.parent
            local_path = base / "clients"
            if local_path.exists():
                return str(local_path)
            if Path("/app/clients").exists():
                return "/app/clients"
            return str(local_path)


class KnowledgeBaseService:
    """Service for managing knowledge bases"""

    def __init__(self):
        self.kb_dir = Config.get_kb_dir()
        self.knowledge_bases: Dict[str, Dict] = {}
        self._load_all()

    def _load_all(self):
        """Load all knowledge bases"""
        # Load Flyland KB
        flyland_kb_path = os.path.join(self.kb_dir, "flyland", "knowledge-base", "flyland-kb.json")
        if os.path.exists(flyland_kb_path):
            try:
                with open(flyland_kb_path, "r") as f:
                    self.knowledge_bases["flyland"] = json.load(f)
                    logger.info(f"Loaded Flyland KB from {flyland_kb_path}")
            except Exception as e:
                logger.warning(f"Could not load Flyland KB: {e}")

        # Load other client KBs
        for client in ["legacy", "tbt", "banyan", "takami", "element"]:
            kb_path = os.path.join(self.kb_dir, client, "knowledge-base", "qualification.json")
            if os.path.exists(kb_path):
                try:
                    with open(kb_path, "r") as f:
                        self.knowledge_bases[client] = json.load(f)
                        logger.info(f"Loaded {client} KB")
                except Exception as e:
                    logger.warning(f"Could not load {client} KB: {e}")

    def get_kb(self, client: str) -> Optional[Dict]:
        """Get knowledge base for a client"""
        return self.knowledge_bases.get(client)

    def get_context(self, client: str) -> str:
        """Get KB context for AI prompts - optimized for speed"""
        kb = self.get_kb(client)
        if not kb:
            return ""

        context = f"\n\n=== {kb.get('name', client.upper())} (Quick Reference) ===\n"

        if client == "flyland":
            context += "QUALIFICATION CRITERIA:\n"
            for criteria, data in kb.get("qualification_criteria", {}).items():
                context += f"- {criteria}: {data.get('keywords', [])}\n"

            states_ext = kb.get("states", {}).get("states_with_extension", [])
            if states_ext:
                context += f"\nStates with 60-day sober window: {', '.join(states_ext[:5])}\n"

            context += "\nDepartments: "
            depts = list(kb.get("departments", {}).keys())[:3]
            context += ", ".join(depts) + "\n"

            kb_ins = kb.get("knowledge_topics", {}).get("insurance_info", {})
            accepted = kb_ins.get("accepted", [])[:5]
            if accepted:
                context += f"Accepted insurance: {', '.join(accepted)}\n"

        context += "\n=== END ===\n"
        return context

    def get_clients(self) -> list:
        """Get list of available clients"""
        return list(self.knowledge_bases.keys())


# Singleton instance
_kb_service: Optional[KnowledgeBaseService] = None


def get_kb_service() -> KnowledgeBaseService:
    """Get KB service singleton"""
    global _kb_service
    if _kb_service is None:
        _kb_service = KnowledgeBaseService()
    return _kb_service
