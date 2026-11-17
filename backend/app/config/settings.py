from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"

class Settings(BaseSettings):
    APP_NAME: str = "NutriTrack API"
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "nutritrack_super_secret_dev_key_change_in_prod_2026"
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "nutriTrack"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    ACCESS_TOKEN_SECRET: str = "dev_jwt_access_secret_key_32bytes_min_nutritrack"
    REFRESH_TOKEN_SECRET: str = "dev_jwt_refresh_secret_key_32bytes_min_nutritrack"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_STORAGE_BUCKET: str = "uploads"
    OCR_ENGINE: str = "tesseract"

    @property
    def cors_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = (str(ENV_PATH), ".env")
        extra = "ignore"

settings = Settings()
