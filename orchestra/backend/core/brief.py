from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class Brief:
    """
    Central data structure for a content generation run.
    Created by Planner, consumed by all downstream agents.
    """
    original_idea: str
    core_angle: str
    target_audience: str
    tone: str
    instagram_notes: str
    threads_notes: str
    linkedin_notes: str

    def to_dict(self):
        return asdict(self)

    def to_string(self) -> str:
        """Format Brief as readable text for agent prompts"""
        return f"""
BRIEF
-----
Original Idea: {self.original_idea}
Core Angle: {self.core_angle}
Target Audience: {self.target_audience}
Tone: {self.tone}

Platform Notes:
- Instagram: {self.instagram_notes}
- Threads: {self.threads_notes}
- LinkedIn: {self.linkedin_notes}
"""
