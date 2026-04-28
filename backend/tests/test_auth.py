from fastapi.testclient import TestClient

from app.db import Base, create_session, get_engine
from app.db.models import AuthSession, Organization, OrganizationMembership, User
from app.db.session import reset_database_state
from app.main import app

# TODO: Add Google OAuth flow tests
