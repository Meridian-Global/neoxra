#!/usr/bin/env python3
"""
CLI demo for Orchestra multi-agent content system.
Usage: python examples/run_cli.py "your content idea here"
"""

import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Add parent directory to path so we can import backend modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.core.voice_store import load_voice_profile
from backend.agents.planner import PlannerAgent
from backend.agents.instagram import InstagramAgent
from backend.agents.threads import ThreadsAgent
from backend.agents.linkedin import LinkedInAgent
from backend.agents.critic import CriticAgent


def print_section(title: str, content: str):
    """Print a formatted section"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")
    print(content)


def main():
    if len(sys.argv) < 2:
        print("Usage: python run_cli.py \"your content idea here\"")
        sys.exit(1)

    idea = " ".join(sys.argv[1:])

    print("\n🎼 ORCHESTRA - Multi-Agent Content System")
    print(f"Idea: {idea}\n")

    # Load voice profile
    print("📖 Loading voice profile...")
    voice_profile = load_voice_profile("default")

    # Step 1: Planner creates Brief
    print("🎯 Running Planner agent...")
    planner = PlannerAgent()
    brief = planner.run(idea=idea, voice_profile=voice_profile)
    print_section("BRIEF", brief.to_string())

    # Step 2: Platform agents generate content
    print("\n📱 Running platform agents...")

    print("  → Instagram agent...")
    instagram = InstagramAgent()
    instagram_output = instagram.run(brief=brief)

    print("  → Threads agent...")
    threads = ThreadsAgent()
    threads_output = threads.run(brief=brief, instagram_output=instagram_output)

    print("  → LinkedIn agent...")
    linkedin = LinkedInAgent()
    linkedin_output = linkedin.run(brief=brief, instagram_output=instagram_output, threads_output=threads_output)

    # Print platform outputs
    print_section("INSTAGRAM", instagram_output)
    print_section("THREADS", threads_output)
    print_section("LINKEDIN", linkedin_output)

    # Step 3: Critic reviews and rewrites all outputs
    print("\n🎭 Running Critic agent...")
    critic = CriticAgent()
    critic_review = critic.run(
        brief=brief,
        instagram_output=instagram_output,
        threads_output=threads_output,
        linkedin_output=linkedin_output,
        voice_profile=voice_profile
    )

    # Display improved versions
    print_section("INSTAGRAM (IMPROVED)", critic_review.instagram_improved)
    print_section("THREADS (IMPROVED)", critic_review.threads_improved)
    print_section("LINKEDIN (IMPROVED)", critic_review.linkedin_improved)

    print(f"\n{'='*60}")
    print("✅ Pipeline complete!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
