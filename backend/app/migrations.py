"""
Lightweight migration runner — executes on app startup.
Each migration is idempotent (safe to re-run).
"""
from sqlalchemy import text
from app.database import engine


MIGRATIONS = [
    # Add credits columns to admins
    "ALTER TABLE admins ADD COLUMN credits INT DEFAULT 10",
    "ALTER TABLE admins ADD COLUMN credits_expire_at DATETIME",
    # Backfill existing rows
    "UPDATE admins SET credits = 10 WHERE credits IS NULL",
    "UPDATE admins SET credits_expire_at = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE credits_expire_at IS NULL",
]


def run_migrations():
    with engine.connect() as conn:
        for sql in MIGRATIONS:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                conn.rollback()
