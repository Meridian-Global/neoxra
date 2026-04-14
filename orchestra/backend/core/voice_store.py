# Re-export from orchestra-core. Local imports (e.g. from .voice_store import load_voice_profile)
# continue to work unchanged during migration.
#
# orchestra-core's load_voice_profile requires an explicit voice_dir.
# This thin wrapper supplies the orchestra-specific default path so
# existing call sites that pass only a profile name keep working.
from pathlib import Path

from orchestra_core.voice import load_voice_profile as _core_load

_VOICE_DIR = Path(__file__).parent.parent.parent / "voice_profiles"


def load_voice_profile(profile_name: str = "default") -> dict:
    return _core_load(profile_name, voice_dir=_VOICE_DIR)
