"""
Orchestrator: coordinates multi-agent content generation with two-pass refinement.

Pass 1: Each agent generates initial output based on Brief
Pass 2: Each agent refines its output after seeing what others wrote
"""

from .context import AgentContext
from .voice_store import load_voice_profile
from ..agents.planner import PlannerAgent
from ..agents.instagram import InstagramAgent
from ..agents.threads import ThreadsAgent
from ..agents.linkedin import LinkedInAgent
from ..agents.critic import CriticAgent, CriticReview


def run_full_pipeline(idea: str, voice_profile_name: str = "default") -> dict:
    """
    Run the complete multi-agent content generation pipeline.

    Args:
        idea: The content idea to develop
        voice_profile_name: Name of the voice profile to use

    Returns:
        dict with keys: brief, instagram, threads, linkedin, critic_review
    """
    # Load voice profile
    voice_profile = load_voice_profile(voice_profile_name)

    # Initialize shared context
    context = AgentContext()

    # Step 1: Planner creates Brief
    print("🎯 Running Planner...")
    planner = PlannerAgent()
    context.brief = planner.run(idea=idea, voice_profile=voice_profile)

    # Step 2: First Pass - Initial content generation
    print("📱 First Pass: Generating initial content...")

    print("  → Instagram (pass 1)")
    instagram_agent = InstagramAgent()
    context.instagram_output = instagram_agent.run(brief=context.brief)

    print("  → Threads (pass 1)")
    threads_agent = ThreadsAgent()
    context.threads_output = threads_agent.run(
        brief=context.brief,
        instagram_output=context.instagram_output
    )

    print("  → LinkedIn (pass 1)")
    linkedin_agent = LinkedInAgent()
    context.linkedin_output = linkedin_agent.run(
        brief=context.brief,
        instagram_output=context.instagram_output,
        threads_output=context.threads_output
    )

    # Step 3: Second Pass - Refinement with full context
    print("\n🔄 Second Pass: Refining with full context...")

    print("  → Instagram (pass 2)")
    context.instagram_output = instagram_agent.run(
        brief=context.brief,
        threads_output=context.threads_output,
        linkedin_output=context.linkedin_output,
        is_refinement=True
    )

    print("  → Threads (pass 2)")
    context.threads_output = threads_agent.run(
        brief=context.brief,
        instagram_output=context.instagram_output,
        linkedin_output=context.linkedin_output,
        is_refinement=True
    )

    print("  → LinkedIn (pass 2)")
    context.linkedin_output = linkedin_agent.run(
        brief=context.brief,
        instagram_output=context.instagram_output,
        threads_output=context.threads_output,
        is_refinement=True
    )

    # Step 4: Critic reviews and rewrites
    print("\n🎭 Running Critic...")
    critic = CriticAgent()
    critic_review = critic.run(
        brief=context.brief,
        instagram_output=context.instagram_output,
        threads_output=context.threads_output,
        linkedin_output=context.linkedin_output,
        voice_profile=voice_profile
    )

    # Return complete result
    return {
        "brief": context.brief,
        "instagram": context.instagram_output,
        "threads": context.threads_output,
        "linkedin": context.linkedin_output,
        "critic_review": critic_review
    }
