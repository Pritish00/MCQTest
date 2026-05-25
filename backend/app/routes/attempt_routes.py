from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Test, Question, TestAttempt, CandidateAnswer
from app.schemas import (
    StartAttempt, SubmitTest, TestPublic, QuestionPublic,
    AttemptDetailResponse, ResultResponse, AnswerDetailResponse,
)

router = APIRouter(prefix="/api/attempt", tags=["Test Attempts"])


@router.post("/start")
def start_attempt(data: StartAttempt, db: Session = Depends(get_db)):
    test = (
        db.query(Test)
        .options(joinedload(Test.questions))
        .filter(Test.pin == data.pin, Test.is_active == True)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Invalid PIN or test is not active")

    # Check if candidate already attempted
    existing = (
        db.query(TestAttempt)
        .filter(
            TestAttempt.test_id == test.id,
            TestAttempt.candidate_email == data.candidate_email,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You have already attempted this test")

    attempt = TestAttempt(
        candidate_name=data.candidate_name,
        candidate_email=data.candidate_email,
        total_questions=test.num_questions,
        test_id=test.id,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    questions = sorted(test.questions, key=lambda q: q.order_num)
    test_data = TestPublic(
        id=test.id,
        title=test.title,
        topic=test.topic,
        time_limit_minutes=test.time_limit_minutes,
        num_questions=test.num_questions,
        questions=[QuestionPublic.model_validate(q) for q in questions],
    )

    return {
        "attempt_id": attempt.id,
        "test": test_data.model_dump(),
    }


@router.post("/{attempt_id}/submit", response_model=ResultResponse)
def submit_attempt(attempt_id: str, data: SubmitTest, db: Session = Depends(get_db)):
    attempt = (
        db.query(TestAttempt)
        .options(joinedload(TestAttempt.test).joinedload(Test.questions))
        .filter(TestAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.is_completed:
        raise HTTPException(status_code=400, detail="Test already submitted")

    # Build question lookup
    questions_map = {q.id: q for q in attempt.test.questions}

    score = 0
    for ans in data.answers:
        question = questions_map.get(ans.question_id)
        if not question:
            continue
        is_correct = (ans.selected_option or "").upper() == question.correct_answer
        if is_correct:
            score += 1

        candidate_answer = CandidateAnswer(
            selected_option=ans.selected_option,
            is_correct=is_correct,
            attempt_id=attempt.id,
            question_id=ans.question_id,
        )
        db.add(candidate_answer)

    attempt.score = score
    attempt.is_completed = True
    attempt.completed_at = datetime.utcnow()
    db.commit()

    percentage = round((score / attempt.total_questions) * 100, 1) if attempt.total_questions > 0 else 0

    return ResultResponse(
        score=score,
        total_questions=attempt.total_questions,
        percentage=percentage,
        candidate_name=attempt.candidate_name,
        test_title=attempt.test.title,
    )


@router.get("/{attempt_id}", response_model=AttemptDetailResponse)
def get_attempt_detail(attempt_id: str, db: Session = Depends(get_db)):
    attempt = (
        db.query(TestAttempt)
        .options(
            joinedload(TestAttempt.answers),
            joinedload(TestAttempt.test).joinedload(Test.questions),
        )
        .filter(TestAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return AttemptDetailResponse.model_validate(attempt)


@router.get("/{attempt_id}/answers", response_model=list[AnswerDetailResponse])
def get_attempt_answers(attempt_id: str, db: Session = Depends(get_db)):
    attempt = (
        db.query(TestAttempt)
        .options(
            joinedload(TestAttempt.answers).joinedload(CandidateAnswer.question),
        )
        .filter(TestAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    result = []
    for ans in attempt.answers:
        q = ans.question
        result.append(AnswerDetailResponse(
            question_text=q.question_text,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            correct_answer=q.correct_answer,
            selected_option=ans.selected_option,
            is_correct=ans.is_correct,
            order_num=q.order_num,
        ))
    result.sort(key=lambda x: x.order_num)
    return result
