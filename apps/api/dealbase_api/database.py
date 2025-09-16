"""Database configuration and models."""

from sqlmodel import SQLModel, create_engine, Session
from .config import settings
from .models import *  # Import all models to register them

# Create engine
engine = create_engine(settings.db_url, echo=True)


def create_db_and_tables() -> None:
    """Create database and tables."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Session:
    """Get database session."""
    with Session(engine) as session:
        yield session
