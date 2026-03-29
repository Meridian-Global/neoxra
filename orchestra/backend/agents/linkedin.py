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

    def build_prompt(self, brief: Brief, instagram_output: Optional[str] = None, threads_output: Optional[str] = None, is_refinement: bool = False) -> str:
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
"""

        if is_refinement:
            prompt += "\n\nREFINEMENT PASS: You've seen what other platforms wrote. Review and refine your output to:\n"
            prompt += "- Ensure you're not repeating their angle\n"
            prompt += "- Make your approach distinctly LinkedIn-native\n"
            prompt += "- Keep what's working, improve what's not\n\n"

        # If other agents have written, show their outputs
        if instagram_output:
            prompt += f"\n\nINSTAGRAM WROTE:\n{instagram_output}\n\n"

        if threads_output:
            prompt += f"\n\nTHREADS WROTE:\n{threads_output}\n\n"

        if is_refinement:
            prompt += "Refine your LinkedIn post based on what you see above. Make it distinctly different and platform-appropriate."
        else:
            prompt += "Write the LinkedIn post now. Be specific and true to the brand voice."

        return prompt

    def run(self, brief: Brief, instagram_output: Optional[str] = None, threads_output: Optional[str] = None, is_refinement: bool = False) -> str:
        """
        Generate or refine LinkedIn content.
        is_refinement=True means this is the second pass with full context.
        """
        prompt = self.build_prompt(
            brief=brief,
            instagram_output=instagram_output,
            threads_output=threads_output,
            is_refinement=is_refinement
        )
        return self.generate(prompt)
