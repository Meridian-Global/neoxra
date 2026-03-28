from .base import BaseAgent
from ..core.brief import Brief
import json
from dataclasses import dataclass


@dataclass
class CriticReview:
    """
    Critic's review with original and improved versions.
    """
    instagram_original: str
    instagram_improved: str
    threads_original: str
    threads_improved: str
    linkedin_original: str
    linkedin_improved: str


class CriticAgent(BaseAgent):
    """
    Reviews all platform outputs against brand voice.
    Rewrites each output to remove hedging, preachy tone, and explanatory fluff.
    Returns both original and improved versions.
    """

    def __init__(self):
        super().__init__(name="Critic")

    def build_prompt(self, brief: Brief, instagram_output: str, threads_output: str, linkedin_output: str, voice_profile: dict) -> str:
        return f"""You are a brand voice editor. Your job: make content more direct, observation-driven, and punchy.

{brief.to_string()}

BRAND VOICE:
{json.dumps(voice_profile, indent=2)}

GENERATED CONTENT:

=== INSTAGRAM ===
{instagram_output}

=== THREADS ===
{threads_output}

=== LINKEDIN ===
{linkedin_output}

YOUR TASK:
For each platform, rewrite the content to remove:
- Explanatory sentences that tell instead of show
- Hedging language ("kind of", "maybe", "sometimes")
- Preachy tone (drawing lessons FOR the reader)
- Generic hashtags (only use specific ones)
- Business-speak ("moving the needle", "game changer")

Make the content:
- Observation-driven (show what happened, not what you learned)
- Concise (cut at least 20%)
- Punchy (shorter sentences, stronger verbs)
- More "I noticed this" than "here's what this means"

Return ONLY valid JSON with this exact structure:
{{
  "instagram_improved": "improved instagram caption here",
  "threads_improved": "improved threads post here",
  "linkedin_improved": "improved linkedin post here"
}}

RULES:
- Keep the core insight from each original post
- Keep the same rough structure (don't change from carousel to single post)
- Remove any cutesy asides ("Spoiler:", "Plot twist:")
- Make hashtags specific or remove them entirely
- If the original is already strong, minimal edits are fine
- Return ONLY the JSON, no other text
"""

    def run(self, brief: Brief, instagram_output: str, threads_output: str, linkedin_output: str, voice_profile: dict) -> CriticReview:
        """
        Override run() to parse JSON and return CriticReview object.
        """
        prompt = self.build_prompt(
            brief=brief,
            instagram_output=instagram_output,
            threads_output=threads_output,
            linkedin_output=linkedin_output,
            voice_profile=voice_profile
        )
        response = self.generate(prompt, max_tokens=6000)

        # Strip markdown code blocks if present
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        response = response.strip()

        # Parse JSON response
        try:
            improved_data = json.loads(response)
            return CriticReview(
                instagram_original=instagram_output,
                instagram_improved=improved_data["instagram_improved"],
                threads_original=threads_output,
                threads_improved=improved_data["threads_improved"],
                linkedin_original=linkedin_output,
                linkedin_improved=improved_data["linkedin_improved"]
            )
        except (json.JSONDecodeError, KeyError) as e:
            raise ValueError(f"Critic did not return valid JSON. Error: {e}. Response: {response}")
