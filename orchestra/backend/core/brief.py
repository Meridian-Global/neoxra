# Re-export from orchestra-core. Local imports (e.g. from ..core.brief import Brief)
# continue to work unchanged during migration.
from orchestra_core.models.brief import Brief

__all__ = ["Brief"]
