
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database.connection import get_db
from app.core.dependencies import get_current_user

from app.models.user import User
from app.models.settlement import Settlement
from app.models.settlement_payment import SettlementPayment

from app.schemas.settlement import (
    SettlementPaymentInitiate,
    SettlementPaymentConfirm,
    SettlementPaymentResponse
)

from app.services.settlement_payment_service import (
    initiate_settlement_payment,
    confirm_settlement_payment
)

router = APIRouter(
    prefix="/api/settlement-payments",
    tags=["Settlement Payments"]
)


@router.post(
    "/{settlement_id}/initiate",
    response_model=SettlementPaymentResponse
)
def initiate_payment(
    settlement_id: int,
    payment_data: SettlementPaymentInitiate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return initiate_settlement_payment(
            db=db,
            settlement_id=settlement_id,
            payer_user_id=current_user.id,
            payment_data=payment_data
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/pending-confirmation",
    response_model=list[SettlementPaymentResponse]
)
def get_pending_confirmations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payments = (
        db.query(SettlementPayment)
        .join(
            Settlement,
            Settlement.id == SettlementPayment.settlement_id
        )
        .filter(
            Settlement.to_user_id == current_user.id,
            SettlementPayment.status == "pending_confirmation"
        )
        .all()
    )

    return payments


@router.patch(
    "/{payment_id}/confirm",
    response_model=SettlementPaymentResponse
)
def confirm_payment(
    payment_id: int,
    confirmation: SettlementPaymentConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return confirm_settlement_payment(
            db=db,
            payment_id=payment_id,
            recipient_user_id=current_user.id,
            action=confirmation.action
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
