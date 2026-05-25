from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Notification
from app.auth import get_current_admin

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/")
def get_notifications(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    notifs = (
        db.query(Notification)
        .filter(Notification.admin_id == admin.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": n.id,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifs
    ]


@router.post("/read-all")
def mark_all_read(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.admin_id == admin.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"status": "ok"}
