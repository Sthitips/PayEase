
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.settlement import Settlement
from app.models.settlement_payment import SettlementPayment
from app.models.group import Group


def initiate_settlement_payment(
    db: Session,
    settlement_id: int,
    payer_user_id: int,
    payment_data
):
    try:
        # Lock the settlement to prevent simultaneous payment attempts.
        settlement = (
            db.query(Settlement)
            .filter(Settlement.id == settlement_id)
            .with_for_update()
            .first()
        )

        if not settlement:
            raise ValueError("Settlement not found")

        # Only the member who owes money can report payment.
        if settlement.from_user_id != payer_user_id:
            raise ValueError("Only the debtor can initiate this payment")

        if settlement.status != "pending":
            raise ValueError("This settlement is no longer pending")

        # Prevent multiple active payment attempts.
        active_payment = (
            db.query(SettlementPayment)
            .filter(
                SettlementPayment.settlement_id == settlement_id,
                SettlementPayment.status.in_([
                    "initiated",
                    "pending_confirmation"
                ])
            )
            .first()
        )

        if active_payment:
            raise ValueError(
                "A payment attempt is already awaiting confirmation"
            )

        group = (
            db.query(Group)
            .filter(Group.id == settlement.group_id)
            .first()
        )

        if not group:
            raise ValueError("Group not found")

        # Create a manual payment report.
        payment = SettlementPayment(
            settlement_id=settlement.id,
            payer_user_id=payer_user_id,
            confirmed_by_user_id=None,
            amount=settlement.amount,
            currency=group.currency,
            provider="manual",
            payment_method="manual",
            external_reference=payment_data.external_reference,
            idempotency_key=str(uuid4()),
            status="pending_confirmation",
            confirmation_method=None,
            provider_data=None
        )

        db.add(payment)
        db.commit()
        db.refresh(payment)

        return payment

    except Exception:
        db.rollback()
        raise


def confirm_settlement_payment(
    db: Session,
    payment_id: int,
    recipient_user_id: int,
    action: str
):
    try:
        # Fetch and lock the payment attempt.
        payment = (
            db.query(SettlementPayment)
            .filter(SettlementPayment.id == payment_id)
            .with_for_update()
            .first()
        )

        if not payment:
            raise ValueError("Payment record not found")

        settlement = (
            db.query(Settlement)
            .filter(Settlement.id == payment.settlement_id)
            .with_for_update()
            .first()
        )

        if not settlement:
            raise ValueError("Settlement not found")

        # Only the intended recipient can confirm or reject.
        if settlement.to_user_id != recipient_user_id:
            raise ValueError(
                "Only the recipient can confirm or reject this payment"
            )

        if payment.status != "pending_confirmation":
            raise ValueError(
                "This payment is not awaiting confirmation"
            )

        if settlement.status != "pending":
            raise ValueError("Settlement is no longer pending")

        now = datetime.now(timezone.utc)

        if action == "confirm":
            payment.status = "recipient_confirmed"
            payment.confirmed_by_user_id = recipient_user_id
            payment.confirmation_method = "manual"
            payment.confirmed_at = now

            settlement.status = "completed"
            settlement.payment_method = payment.payment_method
            settlement.payment_provider = payment.provider
            settlement.provider_reference = payment.external_reference
            settlement.completed_at = now

        elif action == "reject":
            payment.status = "rejected"
            # Leave settlement pending so the payer can report payment again.

        else:
            raise ValueError("Invalid confirmation action")

        db.commit()
        db.refresh(payment)

        return payment

    except Exception:
        db.rollback()
        raise
