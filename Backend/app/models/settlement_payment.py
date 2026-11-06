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


class SettlementPayment(Base):
    __tablename__ = "settlement_payments"

    id = Column(Integer, primary_key=True, index=True)

    # The settlement this payment is fulfilling
    settlement_id = Column(
        Integer,
        ForeignKey("settlements.id", ondelete="RESTRICT"),
        nullable=False
    )

    # User making the payment (the debtor)
    payer_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    # User confirming receipt (the creditor)
    confirmed_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True
    )

    # Payment details
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False)

    # Payment provider and method
    provider = Column(String(30), nullable=True)
    payment_method = Column(String(30), nullable=False)

    # Reference from an external payment provider, if available
    external_reference = Column(String(255), nullable=True)

    # Prevent duplicate payment records
    idempotency_key = Column(
        String(255),
        unique=True,
        nullable=False
    )

    # initiated, pending_confirmation, recipient_confirmed,
    # rejected, cancelled
    status = Column(
        String(30),
        nullable=False,
        default="initiated"
    )

    # How the payment was verified
    confirmation_method = Column(String(30), nullable=True)

    # Optional provider response metadata
    provider_data = Column(JSON, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    confirmed_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    settlement = relationship(
        "Settlement",
        back_populates="payment_attempts"
    )

    payer = relationship(
        "User",
        foreign_keys=[payer_user_id],
        back_populates="settlement_payments_made"
    )

    confirmer = relationship(
        "User",
        foreign_keys=[confirmed_by_user_id],
        back_populates="settlement_payments_confirmed"
    )

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="check_settlement_payment_amount"
        ),
    )
