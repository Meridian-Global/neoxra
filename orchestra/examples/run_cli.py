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

from backend.core.orchestrator import run_full_pipeline


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

    # Run full pipeline with two-pass refinement
    result = run_full_pipeline(idea)

    # Display results
    print_section("BRIEF", result["brief"].to_string())
    print_section("INSTAGRAM (after 2 passes)", result["instagram"])
    print_section("THREADS (after 2 passes)", result["threads"])
    print_section("LINKEDIN (after 2 passes)", result["linkedin"])
    print_section("INSTAGRAM (CRITIC IMPROVED)", result["critic_review"].instagram_improved)
    print_section("THREADS (CRITIC IMPROVED)", result["critic_review"].threads_improved)
    print_section("LINKEDIN (CRITIC IMPROVED)", result["critic_review"].linkedin_improved)

    print(f"\n{'='*60}")
    print("✅ Pipeline complete!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
