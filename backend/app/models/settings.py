from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database.database import Base


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    currency = Column(String, default="USD")
    display_currency = Column(String, default="USD", nullable=False)
    theme = Column(String, default="light")  # light/dark mode
    email_notifications = Column(Boolean, default=True, nullable=False)
    budget_alerts = Column(Boolean, default=True, nullable=False)
    weekly_summary = Column(Boolean, default=False, nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    user = relationship("User", back_populates="settings")
