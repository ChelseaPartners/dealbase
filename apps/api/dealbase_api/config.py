"""Configuration settings."""

import os
from typing import Optional

from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    """Application settings."""

    db_url: str = "sqlite:///./dealbase.sqlite3"
    port: int = 8000
    log_level: str = "info"
    api_base_url: str = "http://localhost:8000/api"

    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=False
    )


settings = Settings()
