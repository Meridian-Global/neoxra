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

    def build_prompt(self, brief: Brief, instagram_output: Optional[str] = None, linkedin_output: Optional[str] = None) -> str:
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

YOUR TASK:
Write Threads post for this idea. Use the Brief's guidance, especially the Threads-specific notes.
"""

        # If other agents have written, show their outputs
        if instagram_output:
            prompt += f"\n\nINSTAGRAM WROTE:\n{instagram_output}\n\n(Make sure your Threads post is distinctly different)"

        if linkedin_output:
            prompt += f"\n\nLINKEDIN WROTE:\n{linkedin_output}\n\n(Make sure your Threads post is distinctly different)"

        prompt += "\n\nWrite the Threads post now. Be specific and true to the brand voice."

        return prompt
