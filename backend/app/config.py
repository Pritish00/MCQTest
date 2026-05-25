from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    SECRET_KEY: str = "change-this-secret-key-in-production"
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    ADMIN_REGISTER_SECRET: str = "mcq-admin-setup-2024"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
