#!/usr/bin/env python3
"""
CLI demo for Neoxra content generation.

Single idea:
  cd backend && python scripts/run_cli.py "your content idea here"

Batch mode:
  cd backend && python scripts/run_cli.py --batch ideas.txt --voice default
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent

load_dotenv(BACKEND_ROOT / ".env")
sys.path.insert(0, str(BACKEND_ROOT))

from app.api.unified_routes import (  # noqa: E402
    UnifiedGenerateRequest,
    _build_brief,
    _generate_facebook,
    _generate_instagram,
    _generate_seo,
    _generate_threads,
)
from app.core.pipeline import run_full_pipeline  # noqa: E402
from app.core_client import get_core_client  # noqa: E402


def print_section(title: str, content: str):
    print(f"\n{'-' * 60}")
    print(f"  {title}")
    print(f"{'-' * 60}")
    print(content)


def slugify(value: str) -> str:
    slug = re.sub(r"[^\w\u4e00-\u9fff]+", "-", value.strip().lower(), flags=re.UNICODE)
    slug = slug.strip("-")
    return slug[:80] or "idea"


def write_json(path: Path, payload: object) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def run_single_legacy(idea: str) -> None:
    print("\nNEOXRA - Multi-Agent Content System")
    print(f"   Idea: {idea}")

    result = run_full_pipeline(idea)
    cr = result["critic_review"]

    print(f"\n\n{'=' * 60}")
    print("  CRITIC NOTES")
    print(f"{'=' * 60}")
    print(cr.notes)

    print_section("INSTAGRAM - final", cr.instagram_improved)
    print_section("THREADS - final", cr.threads_improved)
    print_section("LINKEDIN - final", cr.linkedin_improved)

    print(f"\n{'=' * 60}")
    print("  Pipeline complete.")
    print(f"{'=' * 60}\n")


def run_unified_package(core_client, *, idea: str, voice: str, locale: str) -> dict[str, object]:
    req = UnifiedGenerateRequest(
        idea=idea,
        industry="general",
        audience="",
        voice_profile=voice,
        locale=locale,
    )
    brief = _build_brief(core_client, req)
    instagram = _generate_instagram(core_client, req, brief)
    seo = _generate_seo(core_client, req, brief)
    threads = _generate_threads(core_client, req, brief)
    facebook = _generate_facebook(core_client, req, brief, instagram)
    return {
        "brief": brief,
        "instagram": instagram,
        "seo": seo,
        "threads": threads,
        "facebook": facebook,
    }


def run_batch(batch_path: Path, *, voice: str, locale: str, output_root: Path) -> None:
    ideas = [
        line.strip()
        for line in batch_path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    if not ideas:
        raise SystemExit(f"No ideas found in {batch_path}")

    core_client = get_core_client()
    date_dir = output_root / datetime.now().strftime("%Y-%m-%d")
    date_dir.mkdir(parents=True, exist_ok=True)

    started = time.perf_counter()
    succeeded = 0
    failed = 0

    for index, idea in enumerate(ideas, start=1):
        idea_dir = date_dir / slugify(idea)
        idea_dir.mkdir(parents=True, exist_ok=True)
        print(f"[{index}/{len(ideas)}] Generating: {idea}")

        try:
            outputs = run_unified_package(core_client, idea=idea, voice=voice, locale=locale)
            write_json(idea_dir / "brief.json", outputs["brief"])
            write_json(idea_dir / "instagram.json", outputs["instagram"])
            write_json(idea_dir / "seo.json", outputs["seo"])
            write_json(idea_dir / "threads.json", outputs["threads"])
            write_json(idea_dir / "facebook.json", outputs["facebook"])
            succeeded += 1
        except Exception as exc:
            failed += 1
            write_json(
                idea_dir / "error.json",
                {
                    "idea": idea,
                    "error": str(exc),
                    "type": type(exc).__name__,
                },
            )
            print(f"  skipped: {type(exc).__name__}: {exc}")

    elapsed = time.perf_counter() - started
    minutes = int(elapsed // 60)
    seconds = int(elapsed % 60)
    estimated_cost = succeeded * 0.17
    print(
        f"Generated {succeeded} content packages in {minutes}m {seconds}s. "
        f"Skipped {failed}. Cost: ~${estimated_cost:.2f}"
    )
    print(f"Output directory: {date_dir}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Neoxra content generation.")
    parser.add_argument("idea", nargs="*", help="Single idea to generate with the legacy full pipeline.")
    parser.add_argument("--batch", type=Path, help="Path to a file with one idea per line.")
    parser.add_argument("--voice", default="default", help="Voice profile for batch mode.")
    parser.add_argument("--locale", default="zh-TW", help="Output locale for batch mode.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=REPO_ROOT / "output",
        help="Batch output root directory.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.batch:
        run_batch(args.batch, voice=args.voice, locale=args.locale, output_root=args.output_dir)
        return

    if not args.idea:
        raise SystemExit('Usage: python run_cli.py "your content idea here"')

    run_single_legacy(" ".join(args.idea))


if __name__ == "__main__":
    main()
