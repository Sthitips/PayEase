
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Numeric,
    CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)

    # Group in which the expense was recorded
    group_id = Column(
        Integer,
        ForeignKey("groups.id", ondelete="RESTRICT"),
        nullable=False
    )

    # User who paid for the expense
    paid_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    amount = Column(Numeric(12, 2), nullable=False)

    description = Column(String(255), nullable=False)
    merchant = Column(String(255), nullable=True)

    # How the expense was recorded
    input_source = Column(
        String(20),
        default="manual",
        nullable=False
    )

    # Optional original voice transcription
    transcription_text = Column(Text, nullable=True)

    # Optional QR/payment reference
    source_reference = Column(String(255), nullable=True)

    # How the expense is divided
    split_type = Column(
        String(20),
        default="equal",
        nullable=False
    )

    expense_date = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    group = relationship("Group", back_populates="expenses")

    payer = relationship(
        "User",
        back_populates="paid_expenses"
    )

    splits = relationship(
        "ExpenseSplit",
        back_populates="expense",
        cascade="all, delete-orphan"
    )

    payment_transactions = relationship(
        "PaymentTransaction",
        back_populates="expense"
    )

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_expense_amount"),
    )
