"""
Knowledge base service - loads and manages client knowledge bases
"""

import json
import logging
from config.settings import KB_DIR

logger = logging.getLogger(__name__)

KNOWLEDGE_BASES = {}


def load_knowledge_bases() -> dict:
    """Load knowledge bases for all clients"""
    global KNOWLEDGE_BASES
    KNOWLEDGE_BASES = {}

    # Load Flyland KB
    flyland_kb_path = f"{KB_DIR}/flyland/knowledge-base/flyland-kb.json"
    if __import__("os").path.exists(flyland_kb_path):
        try:
            with open(flyland_kb_path, "r") as f:
                KNOWLEDGE_BASES["flyland"] = json.load(f)
                logger.info(f"Loaded Flyland knowledge base from {flyland_kb_path}")
        except Exception as e:
            logger.warning(f"Could not load Flyland KB: {e}")

    # Load other client KBs
    for client in ["legacy", "tbt", "banyan", "takami", "element"]:
        kb_path = f"{KB_DIR}/{client}/knowledge-base/qualification.json"
        if __import__("os").path.exists(kb_path):
            try:
                with open(kb_path, "r") as f:
                    KNOWLEDGE_BASES[client] = json.load(f)
                    logger.info(f"Loaded {client} knowledge base")
            except Exception as e:
                logger.warning(f"Could not load {client} KB: {e}")

    return KNOWLEDGE_BASES


def get_knowledge_base(client: str) -> dict | None:
    """Get knowledge base for a specific client"""
    return KNOWLEDGE_BASES.get(client)


def get_kb_context(client: str) -> str:
    """Get knowledge base context for AI prompt"""
    if client not in KNOWLEDGE_BASES:
        return ""

    kb = KNOWLEDGE_BASES[client]
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


# Load KBs on module import
load_knowledge_bases()
