from .base import BaseAgent
from ..core.brief import Brief
from ..core.localization import DEFAULT_LOCALE, locale_instruction
import json
import logging

logger = logging.getLogger(__name__)
JSON_RETRY_INSTRUCTION = "\n\nYour previous response was not valid JSON. Return valid JSON only, with no markdown fences or commentary."


class PlannerAgent(BaseAgent):
    """
    Takes raw idea + voice profile, produces structured Brief.
    """

    def __init__(self):
        super().__init__(name="Planner")

    def build_prompt(
        self,
        idea: str,
        voice_profile: dict,
        locale: str = DEFAULT_LOCALE,
    ) -> str:
        return f"""You are a content strategist planning social media content.

INPUT:
Idea: {idea}

BRAND VOICE:
{json.dumps(voice_profile, indent=2)}

OUTPUT LANGUAGE:
{locale_instruction(locale)}

TASK:
Create a content brief for this idea. Return ONLY valid JSON with these exact keys:
{{
  "original_idea": "the original idea",
  "core_angle": "the central message or hook",
  "target_audience": "who this is for",
  "tone": "the tone to use (based on brand voice)",
  "instagram_notes": "platform-specific guidance for Instagram",
  "threads_notes": "platform-specific guidance for Threads",
  "linkedin_notes": "platform-specific guidance for LinkedIn"
}}

RULES:
- Be specific, not generic
- Consider what works on each platform
- Stay true to the brand voice
- Return ONLY the JSON, no other text
- Ensure the brief and platform notes are written in the requested output language"""

    def run(
        self,
        idea: str,
        voice_profile: dict,
        locale: str = DEFAULT_LOCALE,
    ) -> Brief:
        """
        Override run() to parse JSON and return Brief object.
        """
        prompt = self.build_prompt(idea=idea, voice_profile=voice_profile, locale=locale)
        last_response = ""
        for attempt in range(3):
            response = self.generate(prompt if attempt == 0 else prompt + JSON_RETRY_INSTRUCTION)
            last_response = response

            # Strip markdown code blocks if present
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]  # Remove ```json
            if response.startswith("```"):
                response = response[3:]  # Remove ```
            if response.endswith("```"):
                response = response[:-3]  # Remove trailing ```
            response = response.strip()

            # Parse JSON response
            try:
                brief_data = json.loads(response)
                return Brief(**brief_data)
            except json.JSONDecodeError:
                if attempt < 2:
                    logger.warning("agent JSON retry agent=Planner attempt=%s reason=decode_failed", attempt + 1)
                    continue

        raise ValueError(f"Planner did not return valid JSON. Response: {last_response}")
