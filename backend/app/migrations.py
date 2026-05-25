"""
Lightweight migration runner — executes on app startup.
Each migration is idempotent (safe to re-run).
Works with both MySQL and SQL Server.
"""
from sqlalchemy import text, inspect
from app.database import engine


def run_migrations():
    inspector = inspect(engine)
    existing_cols = {c["name"] for c in inspector.get_columns("admins")}

    with engine.connect() as conn:
        if "credits" not in existing_cols:
            try:
                conn.execute(text("ALTER TABLE admins ADD credits INT DEFAULT 10"))
                conn.commit()
            except Exception:
                conn.rollback()

        if "credits_expire_at" not in existing_cols:
            try:
                conn.execute(text("ALTER TABLE admins ADD credits_expire_at DATETIME"))
                conn.commit()
            except Exception:
                conn.rollback()

        # Backfill existing rows
        try:
            conn.execute(text("UPDATE admins SET credits = 10 WHERE credits IS NULL"))
            conn.execute(text("UPDATE admins SET credits_expire_at = DATEADD(DAY, 30, GETDATE()) WHERE credits_expire_at IS NULL"))
            conn.commit()
        except Exception:
            conn.rollback()
            try:
                conn.execute(text("UPDATE admins SET credits_expire_at = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE credits_expire_at IS NULL"))
                conn.commit()
            except Exception:
                conn.rollback()
