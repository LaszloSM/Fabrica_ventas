from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    APP_NAME: str = "CoimpactoB CRM API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    COSMOS_CONNECTION_STRING: str = "mongodb://localhost:27017"
    COSMOS_DATABASE: str = "fabrica_ventas"
    USE_MOCK_DB: bool = False

    # Groq AI (GRATIS - $0/mes)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "mixtral-8x7b-32768"

    # Email
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@coimpactob.com"

    # JWT
    SECRET_KEY: str = "dev_secret_key_for_local_testing_only"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    class Config:
        env_file = (".env.local", ".env")
        case_sensitive = True

settings = Settings()
