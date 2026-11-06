from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Numeric,
    JSON,
    CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base

class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)

    # Linked after the expense is created
    expense_id = Column(
        Integer,
        ForeignKey("expenses.id", ondelete="RESTRICT"),
        nullable=True
    )

    # User who paid the merchant
    payer_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    # Merchant details obtained from the QR
    merchant_name = Column(String(255), nullable=True)
    merchant_reference = Column(String(255), nullable=True)

    # Payment provider
    provider = Column(String(30), nullable=False, default="paypal")

    # PayPal identifiers
    provider_order_id = Column(
        String(255),
        unique=True,
        nullable=False
    )

    provider_capture_id = Column(
        String(255),
        unique=True,
        nullable=True
    )

    # Duplicate request protection
    idempotency_key = Column(
        String(255),
        unique=True,
        nullable=False
    )

    # Financial details
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False)

    # created, approved, completed, failed
    status = Column(
        String(30),
        nullable=False,
        default="created"
    )

    # Optional PayPal response metadata
    provider_data = Column(JSON, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    expense = relationship(
        "Expense",
        back_populates="payment_transactions"
    )

    payer = relationship(
        "User",
        back_populates="payment_transactions"
    )

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="check_payment_transaction_amount"
        ),
    )
