import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import relationship

from app.database.database import Base


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (Index("ix_transactions_user_date", "user_id", "date"),)

    id = Column(Integer, primary_key=True, index=True)
    # Numeric (not Float) so money is stored exactly, e.g. 0.10 + 0.20 == 0.30
    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(Enum(TransactionType), nullable=False)
    description = Column(String, nullable=True)
    date = Column(
        DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )

    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    user = relationship("User", back_populates="transactions")

    category_id = Column(
        Integer, ForeignKey("categories.id"), nullable=True, index=True
    )
    category = relationship("Category", back_populates="transactions")
