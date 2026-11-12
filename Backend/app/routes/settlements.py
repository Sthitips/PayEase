
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database.connection import get_db
from app.core.dependencies import get_current_user

from app.models.user import User
from app.models.settlement import Settlement

from app.schemas.settlement import SettlementResponse

from app.services.balance_service import calculate_group_balances
from app.services.settlement_service import create_settlement_plan


router = APIRouter(
    prefix="/api/groups/{group_id}/settlements",
    tags=["Settlements"]
)


# 1. Get current group balances
@router.get("/balances")
def get_group_balances(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        balances = calculate_group_balances(db, group_id)

        if not any(b["user_id"] == current_user.id for b in balances):
            raise HTTPException(
                status_code=403,
                detail="You are not a member of this group"
            )

        return balances

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# 2. Generate optimized settlement plan
@router.post("/plan")
def generate_settlement_plan(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return create_settlement_plan(
            db=db,
            group_id=group_id,
            current_user_id=current_user.id
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# 3. Get existing settlement records
@router.get("/", response_model=list[SettlementResponse])
def get_group_settlements(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settlements = (
        db.query(Settlement)
        .filter(Settlement.group_id == group_id)
        .all()
    )

    if not settlements:
        balances = calculate_group_balances(db, group_id)

        if not any(b["user_id"] == current_user.id for b in balances):
            raise HTTPException(
                status_code=403,
                detail="You are not a member of this group"
            )

    else:
        member_ids = {
            settlement.from_user_id for settlement in settlements
        } | {
            settlement.to_user_id for settlement in settlements
        }

        if current_user.id not in member_ids:
            raise HTTPException(
                status_code=403,
                detail="You are not part of these settlements"
            )

    return settlements
