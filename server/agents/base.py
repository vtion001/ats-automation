"""
Base Agent Class
Abstract base class for all AI agents with common functionality
"""

import json
import re
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, Tuple, List
import requests
from loguru import logger

# Use absolute imports
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import Config, AgentConfig
except ImportError:

    class Config:
        API_KEY = ""
        OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
        MODEL_ANALYSIS = "openai/gpt-3.5-turbo"
        MODEL_ANALYSIS_FALLBACK = "google/gemini-pro"
        MODEL_FAST = "anthropic/claude-3-haiku"

    class AgentConfig:
        INTENT_MODEL = Config.MODEL_FAST
        INTENT_MAX_TOKENS = 400
        INTENT_TEMPERATURE = 0.3


class BaseAgent(ABC):
    """Base class for all AI agents"""

    def __init__(self, model: str, max_tokens: int, temperature: float, system_prompt: str):
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.system_prompt = system_prompt
        self.api_key = Config.API_KEY
        self.api_url = Config.OPENROUTER_URL

    @abstractmethod
    async def run(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Run the agent with input data and return results"""
        pass

    async def call_ai(
        self, user_message: str, fallback_model: Optional[str] = None, max_retries: int = 3
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """Make API call to OpenRouter with retry logic"""

        models = [self.model]
        if fallback_model:
            models.append(fallback_model)

        for attempt in range(max_retries):
            for model in models:
                try:
                    response = await self._make_request(model, user_message)
                    if response:
                        return response, None
                except Exception as e:
                    logger.warning(f"Attempt {attempt + 1} failed with {model}: {e}")
                    continue

            logger.info(f"Retry {attempt + 1}/{max_retries}...")

        return None, "Failed to get valid response after all retries"

    async def _make_request(self, model: str, user_message: str) -> Optional[Dict]:
        """Make a single API request"""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ats-automation.local",
            "X-Title": "ATS Automation",
        }

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": user_message},
            ],
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
        }

        response = requests.post(self.api_url, headers=headers, json=payload, timeout=30)

        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            return self._extract_json(content)

        logger.error(f"API error: {response.status_code}")
        return None

    def _extract_json(self, content: str) -> Optional[Dict]:
        """Extract JSON from AI response with multiple fallback strategies"""
        content = content.strip()

        # Strategy 1: Direct JSON parse
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
            except json.JSONDecodeError:
                pass

        logger.warning("All JSON extraction strategies failed")
        return None

    def get_fallback_response(self, error: str) -> Dict[str, Any]:
        """Get fallback response when agent fails"""
        return {"error": error, "agent": self.__class__.__name__}


class OrchestratorAgent(BaseAgent):
    """Agent that orchestrates other agents for complete analysis"""

    def __init__(self):
        system_prompt = """You are a call analysis orchestrator. 
Coordinate multiple specialized agents to provide complete analysis.
Each agent handles a specific aspect of the call."""

        super().__init__(
            model=Config.MODEL_ANALYSIS,
            max_tokens=1000,
            temperature=0.3,
            system_prompt=system_prompt,
        )

    async def run(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Run full analysis by coordinating all agents"""
        from .intent_agent import IntentAgent
        from .ner_agent import NERAgent
        from .sentiment_agent import SentimentAgent
        from .qualification_agent import QualificationAgent
        from .summary_agent import SummaryAgent

        transcription = input_data.get("transcription", "")
        phone = input_data.get("phone")
        client = input_data.get("client", "flyland")

        # Build context from KB
        kb_context = context.get("kb_context", "")

        # Run all agents in parallel where possible
        import asyncio

        # Parallel agents
        intent_task = IntentAgent().run(
            {"transcription": transcription}, {"kb_context": kb_context}
        )
        ner_task = NERAgent().run({"transcription": transcription}, {})
        sentiment_task = SentimentAgent().run({"transcription": transcription}, {})

        intent_result, ner_result, sentiment_result = await asyncio.gather(
            intent_task, ner_task, sentiment_task
        )

        # Sequential agents that depend on earlier results
        qualification_input = {
            "transcription": transcription,
            "intent": intent_result.get("call_type"),
            "entities": ner_result,
        }
        qualification_result = await QualificationAgent().run(
            qualification_input, {"kb_context": kb_context}
        )

        summary_input = {
            "transcription": transcription,
            "entities": ner_result,
            "sentiment": sentiment_result.get("sentiment"),
        }
        summary_result = await SummaryAgent().run(summary_input, {"kb_context": kb_context})

        # Combine all results
        return {
            "call_type": intent_result.get("call_type"),
            "primary_intent": intent_result.get("primary_intent"),
            "entities": ner_result,
            "sentiment": sentiment_result.get("sentiment"),
            "urgency": sentiment_result.get("urgency"),
            "qualification": qualification_result,
            "summary": summary_result.get("summary"),
            "tags": qualification_result.get("tags", []),
            "qualification_score": qualification_result.get("score", 0),
            "scoring_breakdown": qualification_result.get("breakdown", {}),
            "mentioned_names": ner_result.get("names", []),
            "mentioned_locations": ner_result.get("locations", []),
            "mentioned_phones": ner_result.get("phones", []),
        }
