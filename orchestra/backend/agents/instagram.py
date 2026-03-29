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

    def build_prompt(self, brief: Brief, threads_output: Optional[str] = None, linkedin_output: Optional[str] = None, is_refinement: bool = False) -> str:
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
"""

        if is_refinement:
            prompt += "\n\nREFINEMENT PASS: You've seen what other platforms wrote. Review and refine your output to:\n"
            prompt += "- Ensure you're not repeating their angle\n"
            prompt += "- Make your approach distinctly Instagram-native\n"
            prompt += "- Keep what's working, improve what's not\n\n"

        # If other agents have written, show their outputs
        if threads_output:
            prompt += f"\n\nTHREADS WROTE:\n{threads_output}\n\n"

        if linkedin_output:
            prompt += f"\n\nLINKEDIN WROTE:\n{linkedin_output}\n\n"

        if is_refinement:
            prompt += "Refine your Instagram caption based on what you see above. Make it distinctly different and platform-appropriate."
        else:
            prompt += "Write the Instagram caption now. Be specific and true to the brand voice."

        return prompt

    def run(self, brief: Brief, threads_output: Optional[str] = None, linkedin_output: Optional[str] = None, is_refinement: bool = False) -> str:
        """
        Generate or refine Instagram content.
        is_refinement=True means this is the second pass with full context.
        """
        prompt = self.build_prompt(
            brief=brief,
            threads_output=threads_output,
            linkedin_output=linkedin_output,
            is_refinement=is_refinement
        )
        return self.generate(prompt)
