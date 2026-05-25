import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Admin(Base):
    __tablename__ = "admins"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tests = relationship("Test", back_populates="admin")


class Test(Base):
    __tablename__ = "tests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    topic = Column(String(255), nullable=False)
    pin = Column(String(10), nullable=False, index=True)
    time_limit_minutes = Column(Integer, nullable=False, default=30)
    num_questions = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    admin_id = Column(String(36), ForeignKey("admins.id"), nullable=False)

    admin = relationship("Admin", back_populates="tests")
    questions = relationship("Question", back_populates="test", cascade="all, delete-orphan")
    attempts = relationship("TestAttempt", back_populates="test", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    question_text = Column(Text, nullable=False)
    option_a = Column(String(500), nullable=False)
    option_b = Column(String(500), nullable=False)
    option_c = Column(String(500), nullable=False)
    option_d = Column(String(500), nullable=False)
    correct_answer = Column(String(1), nullable=False)  # A, B, C, or D
    order_num = Column(Integer, nullable=False)
    test_id = Column(String(36), ForeignKey("tests.id"), nullable=False)

    test = relationship("Test", back_populates="questions")


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_name = Column(String(100), nullable=False)
    candidate_email = Column(String(255), nullable=False)
    score = Column(Integer, default=0)
    total_questions = Column(Integer, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    test_id = Column(String(36), ForeignKey("tests.id"), nullable=False)

    test = relationship("Test", back_populates="attempts")
    answers = relationship("CandidateAnswer", back_populates="attempt", cascade="all, delete-orphan")


class CandidateAnswer(Base):
    __tablename__ = "candidate_answers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    selected_option = Column(String(1), nullable=True)  # A, B, C, D or null
    is_correct = Column(Boolean, default=False)
    attempt_id = Column(String(36), ForeignKey("test_attempts.id"), nullable=False)
    question_id = Column(String(36), ForeignKey("questions.id"), nullable=False)

    attempt = relationship("TestAttempt", back_populates="answers")
    question = relationship("Question")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    admin_id = Column(String(36), ForeignKey("admins.id"), nullable=False)

    admin = relationship("Admin")
