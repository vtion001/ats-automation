"""
JSON extraction utilities for AI responses
"""

import json
import logging

logger = logging.getLogger(__name__)


def extract_json_from_response(content: str) -> dict | None:
    """Extract JSON from AI response with multiple fallback strategies"""
    content = content.strip()
    logger.info(f"Extracting JSON from response: {content[:200]}...")

    # Strategy 1: Try direct JSON parse
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # Strategy 2: Handle markdown code blocks
    if content.startswith("```"):
        parts = content.split("```")
        for part in parts[1:]:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            try:
                return json.loads(part)
            except json.JSONDecodeError:
                continue

    # Strategy 3: Find JSON object in content
    json_start = content.find("{")
    json_end = content.rfind("}")
    if json_start >= 0 and json_end > json_start:
        json_str = content[json_start : json_end + 1]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.warning(f"JSON extraction failed: {e}")

    logger.warning("All JSON extraction strategies failed")
    return None
