from .base import BaseAgent, AgentOutput
from ..core.brief import Brief
from ..core.localization import DEFAULT_LOCALE, locale_instruction
from typing import Optional


class InstagramAgent(BaseAgent):
    """
    Generates Instagram content based on Brief.
    Can see other agents' outputs to react and differentiate.
    """

    def __init__(self):
        super().__init__(name="Instagram")

    def build_prompt(
        self,
        brief: Brief,
        threads_output: Optional[str] = None,
        linkedin_output: Optional[str] = None,
        is_refinement: bool = False,
        locale: str = DEFAULT_LOCALE,
    ) -> str:
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

OUTPUT LANGUAGE:
- {locale_instruction(locale)}
"""

        if threads_output or linkedin_output:
            prompt += "\nOTHER AGENTS WROTE:\n"
            if threads_output:
                prompt += f"\nTHREADS:\n{threads_output}\n"
            if linkedin_output:
                prompt += f"\nLINKEDIN:\n{linkedin_output}\n"
            prompt += "\nReact to the above: take a different angle, don't repeat their hook or structure.\n"

        if is_refinement:
            prompt += "\nThis is your refinement pass. Tighten and differentiate — make it unmistakably Instagram-native.\n"

        prompt += "\nWrite the Instagram caption. Be specific and true to the brand voice."
        return prompt

    def run(
        self,
        brief: Brief,
        threads_output: Optional[str] = None,
        linkedin_output: Optional[str] = None,
        is_refinement: bool = False,
        locale: str = DEFAULT_LOCALE,
    ) -> AgentOutput:
        prompt = self.build_prompt(
            brief=brief,
            threads_output=threads_output,
            linkedin_output=linkedin_output,
            is_refinement=is_refinement,
            locale=locale,
        )
        return self.generate_with_thinking(prompt)
