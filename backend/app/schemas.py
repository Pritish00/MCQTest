from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


# Auth schemas
class AdminCreate(BaseModel):
    name: str
    email: str
    password: str


class AdminLogin(BaseModel):
    email: str
    password: str


class AdminResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    admin: AdminResponse


# Test schemas
class GeneratePreview(BaseModel):
    topic: str
    num_questions: int


class PreviewQuestion(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str


class TestCreate(BaseModel):
    title: str
    topic: str
    num_questions: int
    time_limit_minutes: int
    questions: list[PreviewQuestion] = []


class QuestionResponse(BaseModel):
    id: str
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    order_num: int

    class Config:
        from_attributes = True


class QuestionPublic(BaseModel):
    id: str
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    order_num: int

    class Config:
        from_attributes = True


class TestResponse(BaseModel):
    id: str
    title: str
    topic: str
    pin: str
    time_limit_minutes: int
    num_questions: int
    is_active: bool
    created_at: datetime
    questions: list[QuestionResponse] = []
    attempts: list["AttemptResponse"] = []

    class Config:
        from_attributes = True


class TestListResponse(BaseModel):
    id: str
    title: str
    topic: str
    pin: str
    time_limit_minutes: int
    num_questions: int
    is_active: bool
    created_at: datetime
    attempt_count: int = 0

    class Config:
        from_attributes = True


class TestPublic(BaseModel):
    id: str
    title: str
    topic: str
    time_limit_minutes: int
    num_questions: int
    questions: list[QuestionPublic] = []

    class Config:
        from_attributes = True


# Attempt schemas
class StartAttempt(BaseModel):
    candidate_name: str
    candidate_email: str
    pin: str


class SubmitAnswer(BaseModel):
    question_id: str
    selected_option: Optional[str] = None


class SubmitTest(BaseModel):
    answers: list[SubmitAnswer]


class AnswerResponse(BaseModel):
    id: str
    selected_option: Optional[str]
    is_correct: bool
    question_id: str

    class Config:
        from_attributes = True


class AnswerDetailResponse(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    selected_option: Optional[str]
    is_correct: bool
    order_num: int


class AttemptResponse(BaseModel):
    id: str
    candidate_name: str
    candidate_email: str
    score: int
    total_questions: int
    started_at: datetime
    completed_at: Optional[datetime]
    is_completed: bool

    class Config:
        from_attributes = True


class AttemptDetailResponse(AttemptResponse):
    answers: list[AnswerResponse] = []
    test: Optional[TestPublic] = None

    class Config:
        from_attributes = True


class ResultResponse(BaseModel):
    score: int
    total_questions: int
    percentage: float
    candidate_name: str
    test_title: str
