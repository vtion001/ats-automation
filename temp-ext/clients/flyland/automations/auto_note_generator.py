"""
Auto-Note Generator
Automatically generates notes for unqualified/duplicate calls

Client: Flyland Recovery
Priority: HIGH
Phase: 1
"""

from core.config_loader import ConfigLoader
from core.logger import get_logger

logger = get_logger(__name__)


class AutoNoteGenerator:
    """Generates notes automatically based on call disposition."""

    def __init__(self, client: str = "flyland"):
        self.client = client
        self.config = ConfigLoader(client)
        self.templates = None

    def initialize(self):
        """Load configuration and templates."""
        config = self.config.load()

        if not config.get("automations", {}).get("auto_note_generator", {}).get("enabled"):
            logger.info("Auto-Note Generator is disabled")
            return False

        self.templates = self.config.get_templates()
        self.threshold = (
            config.get("automations", {})
            .get("auto_note_generator", {})
            .get("confidence_threshold", 0.7)
        )

        logger.info(f"Auto-Note Generator initialized with threshold: {self.threshold}")
        return True

    def generate_note(self, disposition: str, call_data: dict) -> dict:
        """
        Generate a note based on disposition.

        Args:
            disposition: Call disposition (unqualified, duplicate, etc.)
            call_data: Additional call data

        Returns:
            dict with 'note' and 'confidence'
        """
        if not self.templates:
            return {"note": "", "confidence": 0, "error": "Not initialized"}

        disposition_lower = disposition.lower()

        template_list = self.templates.get("templates", {}).get(disposition_lower, [])

        if not template_list:
            logger.warning(f"No templates found for disposition: {disposition}")
            return {
                "note": f"Call handled - {disposition}",
                "confidence": 0.5,
                "method": "fallback",
            }

        # Select first template (could use NLP for smarter selection)
        template = template_list[0]

        # Replace variables
        note = self._format_template(template, call_data)

        return {"note": note, "confidence": 0.9, "method": "template"}

    def _format_template(self, template: str, data: dict) -> str:
        """Replace template variables with actual data."""
        result = template

        replacements = {
            "{company}": data.get("company", "Flyland Recovery"),
            "{phone}": data.get("phone", ""),
            "{caller_name}": data.get("caller_name", ""),
            "{date}": data.get("date", ""),
            "{time}": data.get("time", ""),
        }

        for key, value in replacements.items():
            result = result.replace(key, str(value))

        return result

    def inject_note(self, note: str, target_system: str = "ctm") -> bool:
        """
        Inject the generated note into the target system.

        Args:
            note: The generated note text
            target_system: Where to inject (ctm, salesforce)

        Returns:
            bool: Success status
        """
        # This would be handled by PyAutoGUI or Playwright
        # For now, return True to indicate note is ready
        logger.info(f"Note ready for injection into {target_system}: {note[:50]}...")
        return True


def generate_note(client: str, disposition: str, call_data: dict) -> dict:
    """Quick function to generate a note."""
    generator = AutoNoteGenerator(client)
    if generator.initialize():
        return generator.generate_note(disposition, call_data)
    return {"error": "Not enabled"}


if __name__ == "__main__":
    # Test
    gen = AutoNoteGenerator("flyland")
    if gen.initialize():
        result = gen.generate_note(
            "unqualified", {"phone": "555-1234", "company": "Flyland Recovery"}
        )
        print(result)
