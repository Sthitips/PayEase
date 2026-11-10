from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.connection import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    profile_picture = Column(String(500), nullable=True)
    paypal_email = Column(String(255), nullable=True, index=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    created_groups = relationship(
        "Group",
        back_populates="creator"
    )

    memberships = relationship(
        "GroupMember",
        back_populates="user"
    )

    paid_expenses = relationship(
        "Expense",
        back_populates="payer"
    )

    expense_splits = relationship(
        "ExpenseSplit",
        back_populates="user"
    )

    sent_settlements = relationship(
        "Settlement",
        foreign_keys="Settlement.from_user_id",
        back_populates="sender"
    )

    received_settlements = relationship(
        "Settlement",
        foreign_keys="Settlement.to_user_id",
        back_populates="receiver"
    )

    payment_transactions = relationship(
        "PaymentTransaction",
        back_populates="payer"
    )

    settlement_payments_made = relationship(
        "SettlementPayment",
        foreign_keys="SettlementPayment.payer_user_id",
        back_populates="payer"
    )

    settlement_payments_confirmed = relationship(
        "SettlementPayment",
        foreign_keys="SettlementPayment.confirmed_by_user_id",
        back_populates="confirmer"
    )
