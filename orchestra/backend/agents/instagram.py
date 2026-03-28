from .base import BaseAgent
from ..core.brief import Brief
from typing import Optional


class InstagramAgent(BaseAgent):
    """
    Generates Instagram content based on Brief.
    Can see other agents' outputs to react and differentiate.
    """

    def __init__(self):
        super().__init__(name="Instagram")

    def build_prompt(self, brief: Brief, threads_output: Optional[str] = None, linkedin_output: Optional[str] = None) -> str:
        prompt = f"""You are an Instagram content writer.

{brief.to_string()}

PLATFORM CONTEXT:
Instagram prioritizes:
- Visual storytelling
- Hooks in the first line
- Line breaks for readability
- Strategic hashtags (3-5 specific ones)
- Authentic, conversational tone
- Emojis used sparingly

YOUR TASK:
Write Instagram caption for this idea. Use the Brief's guidance, especially the Instagram-specific notes.
"""

        # If other agents have written, show their outputs
        if threads_output:
            prompt += f"\n\nTHREADS WROTE:\n{threads_output}\n\n(Make sure your Instagram post is distinctly different)"

        if linkedin_output:
            prompt += f"\n\nLINKEDIN WROTE:\n{linkedin_output}\n\n(Make sure your Instagram post is distinctly different)"

        prompt += "\n\nWrite the Instagram caption now. Be specific and true to the brand voice."

        return prompt
