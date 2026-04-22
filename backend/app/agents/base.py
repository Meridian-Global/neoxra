from abc import ABC, abstractmethod
from anthropic import Anthropic
import os
import json
import logging

# Re-export from neoxra-core. Local imports (e.g. from .base import AgentOutput)
# continue to work unchanged during migration.
from neoxra_core.models.outputs import AgentOutput

logger = logging.getLogger(__name__)
JSON_RETRY_INSTRUCTION = """

Your previous response was not valid JSON. Return valid JSON only, with no markdown fences, no prose, and no trailing commentary."""


class BaseAgent(ABC):
    """
    Base class for all agents in the system.
    Each agent implements build_prompt() and calls Claude via generate().
    """

    def __init__(self, name: str):
        self.name = name
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    @abstractmethod
    def build_prompt(self, **kwargs) -> str:
        """
        Build the prompt for this agent.
        Must be implemented by subclasses.
        """
        pass

    def generate(self, prompt: str, model: str = None, max_tokens: int = 4000) -> str:
        """
        Call Claude API and return response text.
        Reads model from ANTHROPIC_MODEL env var, defaults to claude-haiku-4-5.
        """
        if model is None:
            model = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5")

        response = self.client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    def generate_with_thinking(self, prompt: str, model: str = None, max_tokens: int = 4000) -> AgentOutput:
        """
        Call Claude API expecting JSON with 'thinking' and 'output' fields.
        Returns AgentOutput with both fields.
        """
        wrapped = prompt + """

Return ONLY valid JSON with this structure:
{
  "thinking": "1-3 lines: what angle you're taking and why, how you're reacting to other agents if present",
  "output": "your actual content here"
}"""
        last_raw = ""
        for attempt in range(3):
            retry_prompt = wrapped if attempt == 0 else wrapped + JSON_RETRY_INSTRUCTION
            raw = self.generate(retry_prompt, model=model, max_tokens=max_tokens)
            last_raw = raw

            # Strip markdown fences if present
            raw = raw.strip()
            if raw.startswith("```json"):
                raw = raw[7:]
            if raw.startswith("```"):
                raw = raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

            try:
                data = json.loads(raw)
                return AgentOutput(
                    thinking=data.get("thinking", "").strip(),
                    output=data.get("output", "").strip()
                )
            except json.JSONDecodeError:
                if attempt < 2:
                    logger.warning(
                        "agent JSON retry agent=%s attempt=%s reason=decode_failed",
                        self.name,
                        attempt + 1,
                    )
                    continue

        # Fallback: preserve demo continuity if the model still refuses JSON.
        return AgentOutput(thinking="(no thinking captured)", output=last_raw.strip())

    def run(self, **kwargs) -> str:
        """
        Standard run method: build prompt, call API, return result.
        Can be overridden if agent needs custom logic.
        """
        prompt = self.build_prompt(**kwargs)
        return self.generate(prompt)
