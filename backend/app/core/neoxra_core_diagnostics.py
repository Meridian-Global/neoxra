from __future__ import annotations

import importlib
import importlib.util
import os
from importlib import metadata

DIST_NAME = "neoxra-core"
IMPORT_NAME = "neoxra_core"
DEFAULT_REPO_URL = "https://github.com/Meridian-Global/orchestra-core.git"
CRITICAL_IMPORTS = (
    "neoxra_core",
    "neoxra_core.models.outputs",
    "neoxra_core.models.brief",
    "neoxra_core.models.context",
    "neoxra_core.voice",
)


def get_neoxra_core_diagnostics() -> dict[str, object]:
    diagnostics: dict[str, object] = {
        "distribution_name": DIST_NAME,
        "import_name": IMPORT_NAME,
        "module_spec_found": importlib.util.find_spec(IMPORT_NAME) is not None,
        "core_git_url": os.getenv("NEOXRA_CORE_GIT_URL", DEFAULT_REPO_URL),
        "core_git_ref": os.getenv("NEOXRA_CORE_GIT_REF", "main"),
        "github_token_present": bool(os.getenv("GITHUB_TOKEN")),
    }

    try:
        dist = metadata.distribution(DIST_NAME)
        diagnostics["distribution_installed"] = True
        diagnostics["distribution_version"] = dist.version
        direct_url = None
        try:
            direct_url = dist.read_text("direct_url.json")
        except FileNotFoundError:
            direct_url = None
        if direct_url:
            diagnostics["direct_url"] = direct_url
    except metadata.PackageNotFoundError:
        diagnostics["distribution_installed"] = False

    imported_modules: list[str] = []
    try:
        module = importlib.import_module(IMPORT_NAME)
        diagnostics["import_ok"] = True
        diagnostics["module_file"] = getattr(module, "__file__", None)
        imported_modules.append(IMPORT_NAME)

        for module_name in CRITICAL_IMPORTS[1:]:
            importlib.import_module(module_name)
            imported_modules.append(module_name)
    except Exception as exc:
        diagnostics["import_ok"] = False
        diagnostics["error_type"] = type(exc).__name__
        diagnostics["error_message"] = str(exc)
        diagnostics["failing_import"] = (
            imported_modules[-1] if imported_modules else IMPORT_NAME
        )
        if isinstance(exc, ModuleNotFoundError):
            diagnostics["missing_module"] = exc.name
    else:
        diagnostics["verified_imports"] = imported_modules

    return diagnostics


def format_neoxra_core_diagnostics(diagnostics: dict[str, object]) -> str:
    if diagnostics.get("import_ok"):
        version = diagnostics.get("distribution_version", "unknown")
        module_file = diagnostics.get("module_file", "unknown")
        return (
            f"{DIST_NAME} import OK "
            f"(version={version}, module_file={module_file})"
        )

    if not diagnostics.get("distribution_installed"):
        return (
            f"{DIST_NAME} distribution is not installed; "
            f"import name should be '{IMPORT_NAME}'. "
            f"Expected build source: {diagnostics.get('core_git_url')}@{diagnostics.get('core_git_ref')}."
        )

    error_type = diagnostics.get("error_type", "UnknownError")
    error_message = diagnostics.get("error_message", "unknown error")
    missing_module = diagnostics.get("missing_module")
    direct_url = diagnostics.get("direct_url")
    if missing_module:
        if missing_module == IMPORT_NAME:
            return (
                f"{DIST_NAME} distribution is installed but the '{IMPORT_NAME}' module is missing. "
                f"This suggests a stale repo/package mismatch or broken packaging metadata "
                f"({error_type}: {error_message})."
            )
        return (
            f"{DIST_NAME} is installed but import failed because "
            f"module '{missing_module}' is missing "
            f"({error_type}: {error_message})."
        )

    if error_type == "ImportError":
        return (
            f"{DIST_NAME} is installed but a transitive import failed "
            f"({error_type}: {error_message}). "
            f"Installed source: {direct_url or 'unknown'}."
        )

    return (
        f"{DIST_NAME} is installed but import failed "
        f"({error_type}: {error_message}). "
        f"Installed source: {direct_url or 'unknown'}."
    )
