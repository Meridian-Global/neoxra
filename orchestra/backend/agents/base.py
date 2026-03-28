from abc import ABC, abstractmethod
from anthropic import Anthropic
import os


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

    def run(self, **kwargs) -> str:
        """
        Standard run method: build prompt, call API, return result.
        Can be overridden if agent needs custom logic.
        """
        prompt = self.build_prompt(**kwargs)
        return self.generate(prompt)
