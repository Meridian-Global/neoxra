# Re-export from neoxra-core. Local imports (e.g. from .voice_store import load_voice_profile)
# continue to work unchanged during migration.
#
# neoxra-core's load_voice_profile requires an explicit voice_dir.
# This thin wrapper supplies the neoxra-specific default path so
# existing call sites that pass only a profile name keep working.
from pathlib import Path

from neoxra_core.voice import load_voice_profile as _core_load

BACKEND_ROOT = Path(__file__).resolve().parents[2]
_VOICE_DIR = BACKEND_ROOT / "voice_profiles"


def load_voice_profile(profile_name: str = "default") -> dict:
    return _core_load(profile_name, voice_dir=_VOICE_DIR)
