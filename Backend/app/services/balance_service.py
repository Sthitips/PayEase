from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.user import User
from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.models.settlement import Settlement


def calculate_group_balances(db: Session, group_id: int):
    # 1. Verify that the group exists
    group = db.query(Group).filter(
        Group.id == group_id
    ).first()

    if not group:
        raise ValueError("Group not found")

    # 2. Fetch all group members
    members = (
        db.query(User.id, User.name)
        .join(GroupMember, GroupMember.user_id == User.id)
        .filter(GroupMember.group_id == group_id)
        .all()
    )

    # 3. Initialize balances for every member
    balances = {
        member.id: {
            "user_id": member.id,
            "name": member.name,
            "total_paid": Decimal("0.00"),
            "total_share": Decimal("0.00"),
            "net_balance": Decimal("0.00")
        }
        for member in members
    }

    # 4. Calculate how much each member paid
    paid_totals = (
        db.query(
            Expense.paid_by,
            func.sum(Expense.amount)
        )
        .filter(Expense.group_id == group_id)
        .group_by(Expense.paid_by)
        .all()
    )

    for user_id, total in paid_totals:
        if user_id in balances:
            balances[user_id]["total_paid"] = Decimal(total or 0)

    # 5. Calculate each member's total expense share
    share_totals = (
        db.query(
            ExpenseSplit.user_id,
            func.sum(ExpenseSplit.share_amount)
        )
        .join(Expense, Expense.id == ExpenseSplit.expense_id)
        .filter(Expense.group_id == group_id)
        .group_by(ExpenseSplit.user_id)
        .all()
    )

    for user_id, total in share_totals:
        if user_id in balances:
            balances[user_id]["total_share"] = Decimal(total or 0)

    # 6. Calculate net balance
    for balance in balances.values():
        balance["net_balance"] = (
            balance["total_paid"] - balance["total_share"]
        )

    
    # 7. Account for completed settlements
    completed_settlements = db.query(Settlement).filter(
        Settlement.group_id == group_id,
        Settlement.status == "completed"
    ).all()

    for settlement in completed_settlements:

        # The person who paid becomes less indebted
        if settlement.from_user_id in balances:
            balances[settlement.from_user_id]["net_balance"] += (
                settlement.amount
            )

        # The recipient is owed less money
        if settlement.to_user_id in balances:
            balances[settlement.to_user_id]["net_balance"] -= (
                settlement.amount
            )


    return list(balances.values())
