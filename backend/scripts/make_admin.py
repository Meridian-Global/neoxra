"""Set is_admin=True for a user by email.

Usage:
    DATABASE_URL=... python scripts/make_admin.py purmonth@gmail.com
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db import create_session
from app.db.models import User


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/make_admin.py <email>")
        sys.exit(1)

    email = sys.argv[1].strip().lower()
    session = create_session()
    try:
        user = session.query(User).filter(User.email == email).one_or_none()
        if user is None:
            print(f"No user found with email: {email}")
            sys.exit(1)
        if user.is_admin:
            print(f"{email} is already an admin.")
            return
        user.is_admin = True
        session.commit()
        print(f"Done. {email} is now an admin.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
