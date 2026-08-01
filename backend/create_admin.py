"""Create or promote a user to ADMIN.

CLI:  python create_admin.py --email admin@spottery.com --password 'xxx'
Idempotent: existing email is promoted to ADMIN, missing one is created.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.dependencies.auth import hash_password  # noqa: E402
from app.models.user import User  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description="Create or promote a user to ADMIN")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == args.email).first()
        if user:
            user.role = "ADMIN"
            db.add(user)
            print(f"promoted {args.email} to ADMIN")
        else:
            db.add(User(email=args.email, password_hash=hash_password(args.password), role="ADMIN"))
            print(f"created ADMIN {args.email}")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
