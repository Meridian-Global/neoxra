from dataclasses import dataclass, field
from typing import Optional
from .brief import Brief


@dataclass
class AgentContext:
    """
    Shared context that flows through the multi-agent system.
    Each agent can read from and write to this context.
    """
    brief: Optional[Brief] = None
    instagram_output: Optional[str] = None
    threads_output: Optional[str] = None
    linkedin_output: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert context to dict for easy access"""
        return {
            "brief": self.brief,
            "instagram_output": self.instagram_output,
            "threads_output": self.threads_output,
            "linkedin_output": self.linkedin_output
        }

    def get_other_outputs(self, exclude_platform: str) -> dict:
        """
        Get all platform outputs except the specified one.
        Useful for agents to see what others have written.
        """
        outputs = {}
        if exclude_platform != "instagram" and self.instagram_output:
            outputs["instagram"] = self.instagram_output
        if exclude_platform != "threads" and self.threads_output:
            outputs["threads"] = self.threads_output
        if exclude_platform != "linkedin" and self.linkedin_output:
            outputs["linkedin"] = self.linkedin_output
        return outputs
