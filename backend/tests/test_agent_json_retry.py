"""Tests for lightweight JSON retry behavior in public shell agents."""

from app.agents.base import BaseAgent


class FakeJsonAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="FakeJson")
        self.calls = 0

    def build_prompt(self, **kwargs) -> str:
        return "Return JSON"

    def generate(self, prompt: str, model: str = None, max_tokens: int = 4000) -> str:
        self.calls += 1
        if self.calls == 1:
            return "this is not json"
        return '{"thinking":"retry worked","output":"valid output"}'


def test_generate_with_thinking_retries_malformed_json_once():
    agent = FakeJsonAgent()

    result = agent.generate_with_thinking("Return JSON")

    assert agent.calls == 2
    assert result.thinking == "retry worked"
    assert result.output == "valid output"
