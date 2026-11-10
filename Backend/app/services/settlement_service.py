
from datetime import datetime, timezone, timezone

from sqlalchemy.orm import Session

from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.settlement import Settlement

from app.services.balance_service import calculate_group_balances
from app.services.debt_simplification_service import simplify_debts


def create_settlement_plan(
    db: Session,
    group_id: int,
    current_user_id: int
):
    try:
        # 1. Verify the group exists
        group = db.query(Group).filter(
            Group.id == group_id
        ).with_for_update().first()

        if not group:
            raise ValueError("Group not found")

        # 2. Verify that the user belongs to the group
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user_id
        ).first()

        if not membership:
            raise ValueError("You are not a member of this group")

        # 3. Prevent duplicate pending settlement plans
        existing_pending = db.query(Settlement).filter(
            Settlement.group_id == group_id,
            Settlement.status == "pending"
        ).first()

        if existing_pending:
            raise ValueError(
                "A pending settlement plan already exists for this group"
            )

        # 4. Recalculate balances using current database records
        balances = calculate_group_balances(
            db=db,
            group_id=group_id
        )

        # 5. Generate the optimized settlement suggestions
        suggestions = simplify_debts(balances)

        if not suggestions:
            return {
                "message": "Everyone is already settled",
                "settlements": []
            }

        # 6. Create one Settlement record per suggested transfer
        created_settlements = []

        for suggestion in suggestions:
            settlement = Settlement(
                group_id=group_id,
                from_user_id=suggestion["from_user_id"],
                to_user_id=suggestion["to_user_id"],
                amount=suggestion["amount"],
                status="pending",
                payment_method=None,
                payment_provider=None,
                provider_reference=None,
                created_at=datetime.now(timezone.utc),
                completed_at=None
            )

            db.add(settlement)
            created_settlements.append(settlement)

        # 7. Commit all records together
        db.commit()

        for settlement in created_settlements:
            db.refresh(settlement)

        return {
            "message": "Settlement plan created successfully",
            "total_transactions": len(created_settlements),
            "settlements": created_settlements
        }

    except Exception:
        db.rollback()
        raise
