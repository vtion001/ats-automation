"""
NLP Processor
Local NLP processing for note generation and classification
"""

import json
import random
from pathlib import Path
from typing import Dict, List, Optional


class NLPProcessor:
    def __init__(self, client: str = "flyland"):
        self.client = client
        self.config = self._load_config()
        self.model_loaded = False

    def _load_config(self) -> dict:
        config_path = Path(__file__).parent.parent / "nlp-models" / "config.json"
        if config_path.exists():
            with open(config_path) as f:
                return json.load(f)
        return {}

    def load_models(self):
        if self.config.get("offline_mode"):
            print("[NLP] Running in offline mode - using template-based responses")
            return
        
        try:
            from transformers import pipeline
            self.summarizer = pipeline("summarization", model="distilbert-base-uncased-distilled-sstnli")
            self.classifier = pipeline("text-classification", model="distilbert-base-uncased-finetuned-sst-2-english")
            self.model_loaded = True
            print("[NLP] Models loaded successfully")
        except Exception as e:
            print(f"[NLP] Error loading models: {e}")
            print("[NLP] Falling back to template-based mode")

    def generate_note(self, transcript: str, disposition: str) -> str:
        templates = self.config.get("dispositions", {}).get(disposition, {}).get("templates", [])
        
        if templates:
            return random.choice(templates)
        
        if self.model_loaded:
            try:
                summary = self.summarizer(transcript[:512], max_length=100, min_length=20)
                return summary[0]["summary_text"]
            except Exception as e:
                print(f"[NLP] Summarization error: {e}")
        
        return "Call processed. Please add notes manually."

    def classify_sentiment(self, text: str) -> Dict[str, float]:
        if self.model_loaded:
            try:
                result = self.classifier(text[:512])
                return {result[0]["label"].lower(): result[0]["score"]}
            except Exception as e:
                print(f"[NLP] Classification error: {e}")
        
        return {"neutral": 0.5}

    def suggest_reply(self, context: str, intent: str = "general_inquiry") -> str:
        templates = self.config.get("reply_templates", {}).get(intent, [])
        
        if templates:
            return random.choice(templates)
        
        if self.model_loaded:
            return self.generate_note(context, "general")
        
        return "Thank you for reaching out. We'll be in touch soon."

    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        entities = {
            "names": [],
            "phones": [],
            "emails": [],
            "dates": []
        }
        
        import re
        
        phone_pattern = r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"
        entities["phones"] = re.findall(phone_pattern, text)
        
        email_pattern = r"\b[\w.-]+@[\w.-]+\.\w+\b"
        entities["emails"] = re.findall(email_pattern, text)
        
        date_pattern = r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b"
        entities["dates"] = re.findall(date_pattern, text)
        
        return entities


class AutoNoteGenerator:
    def __init__(self, client: str = "flyland"):
        self.nlp = NLPProcessor(client)
        self.nlp.load_models()

    def generate_call_note(self, transcript: str, disposition: str, caller_info: Optional[Dict] = None) -> str:
        note = self.nlp.generate_note(transcript, disposition)
        
        if caller_info:
            if caller_info.get("name"):
                note = f"Caller: {caller_info['name']}. {note}"
            if caller_info.get("phone"):
                note = f"Phone: {caller_info['phone']}. {note}"
        
        return note

    def generate_summary(self, long_text: str) -> str:
        return self.nlp.generate_note(long_text, "general")


if __name__ == "__main__":
    generator = AutoNoteGenerator()
    
    test_transcript = "Hello, I'm calling to inquire about your addiction counseling services. I've been struggling with substance abuse and need help."
    note = generator.generate_call_note(test_transcript, "general_inquiry")
    print("Generated note:", note)
