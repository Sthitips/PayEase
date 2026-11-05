
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    Numeric,
    UniqueConstraint,
    CheckConstraint
)
from sqlalchemy.orm import relationship

from app.database.connection import Base


class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(Integer, primary_key=True, index=True)

    expense_id = Column(
        Integer,
        ForeignKey("expenses.id", ondelete="CASCADE"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    share_amount = Column(Numeric(12, 2), nullable=False)

    # Relationships
    expense = relationship("Expense", back_populates="splits")

    user = relationship("User", back_populates="expense_splits")

    __table_args__ = (
        UniqueConstraint(
            "expense_id",
            "user_id",
            name="unique_expense_participant"
        ),
        CheckConstraint(
            "share_amount >= 0",
            name="check_share_amount"
        ),
    )
