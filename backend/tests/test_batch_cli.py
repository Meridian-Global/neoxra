"""Batch CLI smoke tests."""

from pathlib import Path

from backend.scripts import run_cli


def test_batch_cli_writes_expected_output_files(tmp_path, monkeypatch):
    ideas_file = tmp_path / "ideas.txt"
    ideas_file.write_text("Idea one\n\n# ignored\nIdea two\n", encoding="utf-8")

    monkeypatch.setattr(run_cli, "get_core_client", lambda: object())
    monkeypatch.setattr(
        run_cli,
        "run_unified_package",
        lambda core_client, *, idea, voice, locale: {
            "brief": {"idea": idea},
            "instagram": {"caption": "caption"},
            "seo": {"h1": "article"},
            "threads": {"posts": []},
            "facebook": {"body": "post"},
        },
    )

    run_cli.run_batch(ideas_file, voice="default", locale="zh-TW", output_root=tmp_path / "output")

    output_files = list((tmp_path / "output").glob("*/*/*.json"))
    names = {path.name for path in output_files}
    assert {"brief.json", "instagram.json", "seo.json", "threads.json", "facebook.json"}.issubset(names)
