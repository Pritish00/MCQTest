"""
Lightweight migration runner — executes on app startup.
Each migration is idempotent (safe to re-run).
Works with both MySQL and SQL Server.
"""
from datetime import datetime, timedelta
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal


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


def cleanup_old_tests():
    """Delete tests older than 60 days (and their questions, attempts, answers via cascade)."""
    from app.models import Test
    db: Session = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(days=60)
        old_tests = db.query(Test).filter(Test.created_at < cutoff).all()
        count = len(old_tests)
        for test in old_tests:
            db.delete(test)
        if count > 0:
            db.commit()
            print(f"[Cleanup] Deleted {count} tests older than 60 days")
    except Exception as e:
        db.rollback()
        print(f"[Cleanup] Error: {e}")
    finally:
        db.close()
