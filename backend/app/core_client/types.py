from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CoreInstagramGenerationRequest:
    topic: str
    template_text: str
    goal: str
    style_examples: list[str] = field(default_factory=list)
    reference_image_description: str = ""
