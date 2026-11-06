
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


class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(Integer, primary_key=True, index=True)

    # Associated group
    group_id = Column(
        Integer,
        ForeignKey("groups.id", ondelete="RESTRICT"),
        nullable=False
    )

    # Person sending the payment
    from_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    # Person receiving the payment
    to_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    amount = Column(Numeric(12, 2), nullable=False)

    # Settlement status
    status = Column(
        String(20),
        default="pending",
        nullable=False
    )

    # Payment details
    payment_method = Column(String(30), nullable=True)
    payment_provider = Column(String(30), nullable=True)
    provider_reference = Column(String(255), nullable=True)

    note = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    group = relationship("Group", back_populates="settlements")

    sender = relationship(
        "User",
        foreign_keys=[from_user_id],
        back_populates="sent_settlements"
    )

    receiver = relationship(
        "User",
        foreign_keys=[to_user_id],
        back_populates="received_settlements"
    )

    payment_attempts = relationship(
        "SettlementPayment",
        back_populates="settlement"
    )

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="check_settlement_amount"
        ),
        CheckConstraint(
            "from_user_id != to_user_id",
            name="check_different_settlement_users"
        ),
    )
