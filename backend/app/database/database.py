from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

# SQLAlchemy setup
# Only log SQL in debug mode; pre_ping avoids errors from stale pooled connections
engine = create_engine(
    settings.database_url, echo=settings.debug, pool_pre_ping=True, future=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
