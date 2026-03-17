"""
Phone number utilities
"""

import re


def clean_phone(phone: str) -> str:
    """Clean and normalize phone number"""
    if not phone:
        return None
    phone = re.sub(r"[^\d+]", "", phone)
    if not phone.startswith("+"):
        phone = "+1" + phone
    return phone


def extract_phone_from_text(text: str) -> str:
    """Extract phone number from text"""
    phone_pattern = r"\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}"
    phones = re.findall(phone_pattern, text)
    if phones:
        return clean_phone(phones[0])
    return None


def normalize_phone(phone: str) -> str:
    """Normalize phone for storage/lookup"""
    if not phone:
        return ""
    return re.sub(r"[^\d+]", "", phone)
