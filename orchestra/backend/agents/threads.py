from .base import BaseAgent
from ..core.brief import Brief
from typing import Optional


class ThreadsAgent(BaseAgent):
    """
    Generates Threads content based on Brief.
    Can see other agents' outputs to react and differentiate.
    """

    def __init__(self):
        super().__init__(name="Threads")

    def build_prompt(self, brief: Brief, instagram_output: Optional[str] = None, linkedin_output: Optional[str] = None, is_refinement: bool = False) -> str:
        prompt = f"""You are a Threads content writer.

{brief.to_string()}

PLATFORM CONTEXT:
Threads prioritizes:
- Conversational, casual tone
- Quick, digestible thoughts
- Often more raw/unpolished than Instagram
- Can be a single thought or short thread
- Less focus on hashtags
- Direct engagement with the idea
"""

        if is_refinement:
            prompt += "\n\nREFINEMENT PASS: You've seen what other platforms wrote. Review and refine your output to:\n"
            prompt += "- Ensure you're not repeating their angle\n"
            prompt += "- Make your approach distinctly Threads-native\n"
            prompt += "- Keep what's working, improve what's not\n\n"

        # If other agents have written, show their outputs
        if instagram_output:
            prompt += f"\n\nINSTAGRAM WROTE:\n{instagram_output}\n\n"

        if linkedin_output:
            prompt += f"\n\nLINKEDIN WROTE:\n{linkedin_output}\n\n"

        if is_refinement:
            prompt += "Refine your Threads post based on what you see above. Make it distinctly different and platform-appropriate."
        else:
            prompt += "Write the Threads post now. Be specific and true to the brand voice."

        return prompt

    def run(self, brief: Brief, instagram_output: Optional[str] = None, linkedin_output: Optional[str] = None, is_refinement: bool = False) -> str:
        """
        Generate or refine Threads content.
        is_refinement=True means this is the second pass with full context.
        """
        prompt = self.build_prompt(
            brief=brief,
            instagram_output=instagram_output,
            linkedin_output=linkedin_output,
            is_refinement=is_refinement
        )
        return self.generate(prompt)
