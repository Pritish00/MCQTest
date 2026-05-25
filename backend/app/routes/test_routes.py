import random
import string
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Admin, Test, Question, TestAttempt
from app.schemas import TestCreate, TestResponse, TestListResponse, GeneratePreview, PreviewQuestion
from app.auth import get_current_admin
from app.gemini_service import generate_mcq_questions

router = APIRouter(prefix="/api/tests", tags=["Tests"])


def generate_pin(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


@router.post("/preview", response_model=list[PreviewQuestion])
def preview_questions(data: GeneratePreview, admin: Admin = Depends(get_current_admin)):
    try:
        questions_data = generate_mcq_questions(data.topic, data.num_questions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")
    return [PreviewQuestion(**q) for q in questions_data]


@router.post("/", response_model=TestResponse)
def create_test(data: TestCreate, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    # Check credits
    if admin.credits_expire_at and admin.credits_expire_at < datetime.utcnow():
        admin.credits = 0
        db.commit()
    if (admin.credits or 0) <= 0:
        raise HTTPException(status_code=403, detail="No test credits remaining. Please contact support to add credits.")

    # Use pre-generated questions if provided, otherwise generate new ones
    if data.questions:
        questions_data = [q.model_dump() for q in data.questions]
    else:
        try:
            questions_data = generate_mcq_questions(data.topic, data.num_questions)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

    # Generate unique PIN
    pin = generate_pin()
    while db.query(Test).filter(Test.pin == pin, Test.is_active == True).first():
        pin = generate_pin()

    test = Test(
        title=data.title,
        topic=data.topic,
        pin=pin,
        time_limit_minutes=data.time_limit_minutes,
        num_questions=data.num_questions,
        admin_id=admin.id,
    )
    db.add(test)
    db.flush()

    for i, q in enumerate(questions_data):
        question = Question(
            question_text=q["question_text"],
            option_a=q["option_a"],
            option_b=q["option_b"],
            option_c=q["option_c"],
            option_d=q["option_d"],
            correct_answer=q["correct_answer"],
            order_num=i + 1,
            test_id=test.id,
        )
        db.add(question)

    # Deduct one credit
    admin.credits = (admin.credits or 0) - 1
    db.commit()
    db.refresh(test)

    test_with_relations = (
        db.query(Test)
        .options(joinedload(Test.questions), joinedload(Test.attempts))
        .filter(Test.id == test.id)
        .first()
    )
    return TestResponse.model_validate(test_with_relations)


@router.get("/", response_model=list[TestListResponse])
def list_tests(admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    tests = (
        db.query(
            Test,
            func.count(TestAttempt.id).label("attempt_count"),
        )
        .outerjoin(TestAttempt, TestAttempt.test_id == Test.id)
        .filter(Test.admin_id == admin.id)
        .group_by(Test.id, Test.title, Test.topic, Test.pin, Test.time_limit_minutes,
                  Test.num_questions, Test.is_active, Test.created_at, Test.admin_id)
        .order_by(Test.created_at.desc())
        .all()
    )
    result = []
    for t, count in tests:
        item = TestListResponse.model_validate(t)
        item.attempt_count = count
        result.append(item)
    return result


@router.get("/{test_id}", response_model=TestResponse)
def get_test(test_id: str, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    test = (
        db.query(Test)
        .options(joinedload(Test.questions), joinedload(Test.attempts))
        .filter(Test.id == test_id, Test.admin_id == admin.id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return TestResponse.model_validate(test)


@router.patch("/{test_id}/toggle")
def toggle_test(test_id: str, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    test = db.query(Test).filter(Test.id == test_id, Test.admin_id == admin.id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    test.is_active = not test.is_active
    db.commit()
    return {"is_active": test.is_active}


@router.delete("/{test_id}")
def delete_test(test_id: str, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    test = db.query(Test).filter(Test.id == test_id, Test.admin_id == admin.id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    db.delete(test)
    db.commit()
    return {"detail": "Test deleted"}
