from .base import BaseAgent
from ..core.brief import Brief
from typing import Optional


class LinkedInAgent(BaseAgent):
    """
    Generates LinkedIn content based on Brief.
    Can see other agents' outputs to react and differentiate.
    """

    def __init__(self):
        super().__init__(name="LinkedIn")

    def build_prompt(self, brief: Brief, instagram_output: Optional[str] = None, threads_output: Optional[str] = None) -> str:
        prompt = f"""You are a LinkedIn content writer.

{brief.to_string()}

PLATFORM CONTEXT:
LinkedIn prioritizes:
- Professional but human tone
- Insights, lessons, or frameworks
- Storytelling with a takeaway
- Longer-form content accepted
- Industry-relevant context
- Value-driven, not self-promotional

YOUR TASK:
Write LinkedIn post for this idea. Use the Brief's guidance, especially the LinkedIn-specific notes.
"""

        # If other agents have written, show their outputs
        if instagram_output:
            prompt += f"\n\nINSTAGRAM WROTE:\n{instagram_output}\n\n(Make sure your LinkedIn post is distinctly different)"

        if threads_output:
            prompt += f"\n\nTHREADS WROTE:\n{threads_output}\n\n(Make sure your LinkedIn post is distinctly different)"

        prompt += "\n\nWrite the LinkedIn post now. Be specific and true to the brand voice."

        return prompt
