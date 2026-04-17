# Re-export from neoxra-core. Local imports (e.g. from ..core.brief import Brief)
# continue to work unchanged during migration.
from neoxra_core.models.brief import Brief

__all__ = ["Brief"]
