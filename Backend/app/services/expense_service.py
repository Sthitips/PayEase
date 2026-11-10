
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.schemas.expense import ExpenseCreate
from app.models.payment_transaction import PaymentTransaction

def create_expense(
    db: Session,
    group_id: int,
    paid_by_user_id: int,
    expense_data: ExpenseCreate
):
    try:
        # 1. Verify that the group exists
        group = db.query(Group).filter(
            Group.id == group_id
        ).first()

        if not group:
            raise ValueError("Group not found")

        # 2. Verify that the person recording the expense is a member
        payer_membership = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == paid_by_user_id
        ).first()

        if not payer_membership:
            raise ValueError("You are not a member of this group")

        # 3. Validate participant IDs
        participants = expense_data.participants

        if len(participants) != len(set(participants)):
            raise ValueError("Duplicate participants are not allowed")

        split_user_ids = [
            split.user_id for split in expense_data.splits
        ]

        if len(split_user_ids) != len(set(split_user_ids)):
            raise ValueError("Duplicate users in split details")

        if set(participants) != set(split_user_ids):
            raise ValueError(
                "Split details must match the selected participants"
            )

        # 4. Verify that every participant belongs to this group
        memberships = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id.in_(participants)
        ).all()

        valid_member_ids = {member.user_id for member in memberships}

        invalid_ids = set(participants) - valid_member_ids

        if invalid_ids:
            raise ValueError(
                f"These users are not members of the group: {sorted(invalid_ids)}"
            )

        # 5. Validate that all shares add up to the expense amount
        total_split = sum(
            (split.share_amount for split in expense_data.splits),
            Decimal("0.00")
        )

        if total_split != expense_data.amount:
            raise ValueError(
                "The sum of individual shares must equal the expense amount"
            )

        # 6. Create the expense record
        expense = Expense(
            group_id=group_id,
            paid_by=paid_by_user_id,
            amount=expense_data.amount,
            description=expense_data.description,
            merchant=expense_data.merchant,
            input_source=expense_data.input_source,
            transcription_text=expense_data.transcription_text,
            source_reference=expense_data.source_reference,
            split_type=expense_data.split_type
        )

        db.add(expense)
        db.flush()

        # 7. Create individual expense splits
        for split in expense_data.splits:
            expense_split = ExpenseSplit(
                expense_id=expense.id,
                user_id=split.user_id,
                share_amount=split.share_amount
            )

            db.add(expense_split)

        # 8. Save everything together
        db.commit()
        db.refresh(expense)

        return expense

    except Exception:
        db.rollback()
        raise

def update_expense(
    db: Session,
    group_id: int,
    expense_id: int,
    current_user_id: int,
    expense_data: ExpenseCreate
):
    try:
        # 1. Find the expense within the specified group
        expense = db.query(Expense).filter(
            Expense.id == expense_id,
            Expense.group_id == group_id
        ).first()

        if not expense:
            raise ValueError("Expense not found")

        # 2. Only the original payer or a group admin can edit
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user_id
        ).first()

        if not membership:
            raise ValueError("You are not a member of this group")

        if (
            expense.paid_by != current_user_id
            and membership.role != "admin"
        ):
            raise ValueError(
                "Only the expense payer or a group admin can edit this expense"
            )

        # 3. Prevent editing an expense with a completed merchant payment
        completed_payment = db.query(PaymentTransaction).filter(
            PaymentTransaction.expense_id == expense_id,
            PaymentTransaction.status == "completed"
        ).first()

        if completed_payment:
            raise ValueError(
                "An expense linked to a completed payment cannot be edited"
            )

        # 4. Validate participants
        participants = expense_data.participants

        if len(participants) != len(set(participants)):
            raise ValueError("Duplicate participants are not allowed")

        split_user_ids = [
            split.user_id for split in expense_data.splits
        ]

        if len(split_user_ids) != len(set(split_user_ids)):
            raise ValueError("Duplicate users in split details")

        if set(participants) != set(split_user_ids):
            raise ValueError(
                "Split details must match the selected participants"
            )

        memberships = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id.in_(participants)
        ).all()

        valid_member_ids = {m.user_id for m in memberships}

        if set(participants) - valid_member_ids:
            raise ValueError(
                "All participants must belong to this group"
            )

        # 5. Validate the split total
        total_split = sum(
            (s.share_amount for s in expense_data.splits),
            Decimal("0.00")
        )

        if total_split != expense_data.amount:
            raise ValueError(
                "The sum of individual shares must equal the expense amount"
            )

        # 6. Update expense details
        expense.amount = expense_data.amount
        expense.description = expense_data.description
        expense.merchant = expense_data.merchant
        expense.input_source = expense_data.input_source
        expense.transcription_text = expense_data.transcription_text
        expense.source_reference = expense_data.source_reference

        # 7. Replace the old splits with the new splits
        expense.splits.clear()

        for split in expense_data.splits:
            expense.splits.append(
                ExpenseSplit(
                    user_id=split.user_id,
                    share_amount=split.share_amount
                )
            )

        db.commit()
        db.refresh(expense)

        return expense

    except Exception:
        db.rollback()
        raise


def delete_expense(
    db: Session,
    group_id: int,
    expense_id: int,
    current_user_id: int
):
    try:
        # 1. Find the expense
        expense = db.query(Expense).filter(
            Expense.id == expense_id,
            Expense.group_id == group_id
        ).first()

        if not expense:
            raise ValueError("Expense not found")

        # 2. Check the current user's group membership
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user_id
        ).first()

        if not membership:
            raise ValueError("You are not a member of this group")

        # 3. Only the payer or an admin can delete
        if (
            expense.paid_by != current_user_id
            and membership.role != "admin"
        ):
            raise ValueError(
                "Only the expense payer or a group admin can delete this expense"
            )

        # 4. Check for active or completed payment transactions
        protected_payment = db.query(PaymentTransaction).filter(
            PaymentTransaction.expense_id == expense_id,
            PaymentTransaction.status.in_([
                "created",
                "approved",
                "completed"
            ])
        ).first()

        if protected_payment:
            raise ValueError(
                "This expense has an active or completed payment transaction and cannot be deleted"
            )

        # 5. Delete the expense
        # Associated splits are deleted through relationship cascade
        db.delete(expense)
        db.commit()

        return {
            "message": "Expense deleted successfully"
        }

    except Exception:
        db.rollback()
        raise

