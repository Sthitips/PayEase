
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.user import User
from app.schemas.ai_expense import AIExpenseDraft


def validate_ai_expense_draft(
    db: Session,
    group_id: int,
    ai_draft: AIExpenseDraft
):
    # 1. Check that the group exists.
    group = db.query(Group).filter(
        Group.id == group_id
    ).first()

    if not group:
        raise ValueError("Group not found")

    # 2. If AI needs clarification, do not process the draft.
    if ai_draft.clarification_needed:
        return {
            "clarification_needed": True,
            "clarification_question": ai_draft.clarification_question
        }

    # 3. Fetch actual members of this group.
    members = (
        db.query(User)
        .join(GroupMember, GroupMember.user_id == User.id)
        .filter(GroupMember.group_id == group_id)
        .all()
    )

    # Normalize names for case-insensitive matching.
    members_by_name = {}

    for member in members:
        normalized_name = member.name.strip().casefold()

        members_by_name.setdefault(
            normalized_name, []
        ).append(member)

    participant_ids = []
    splits = []
    seen_ids = set()

    # 4. Map AI participant names to real user IDs.
    for participant in ai_draft.participants:
        normalized_name = participant.name.strip().casefold()

        matches = members_by_name.get(normalized_name, [])

        if not matches:
            raise ValueError(
                f"{participant.name} is not a member of this group"
            )

        if len(matches) > 1:
            raise ValueError(
                f"Ambiguous member name: {participant.name}"
            )

        member = matches[0]

        if member.id in seen_ids:
            raise ValueError(
                f"Duplicate participant: {participant.name}"
            )

        seen_ids.add(member.id)

        share = Decimal(str(participant.share_amount))

        if share < Decimal("0"):
            raise ValueError("Participant share cannot be negative")

        if share.as_tuple().exponent < -2:
            raise ValueError(
                "Participant share cannot have more than two decimal places"
            )

        participant_ids.append(member.id)

        splits.append({
            "user_id": member.id,
            "share_amount": share
        })

    # 5. Validate the total amount.
    amount = Decimal(str(ai_draft.amount))

    if amount <= Decimal("0"):
        raise ValueError("Expense amount must be positive")

    if amount.as_tuple().exponent < -2:
        raise ValueError(
            "Expense amount cannot have more than two decimal places"
        )

    # 6. Validate that at least one participant exists.
    if not splits:
        raise ValueError("At least one participant is required")

    # 7. Validate that the shares add up exactly.
    total_shares = sum(
        (split["share_amount"] for split in splits),
        Decimal("0.00")
    )

    if total_shares != amount:
        raise ValueError(
            f"Split total ({total_shares}) does not match "
            f"expense amount ({amount})"
        )

    # Return a validated draft. Do not save it yet.
    return {
        "clarification_needed": False,
        "amount": amount,
        "description": ai_draft.description,
        "merchant": ai_draft.merchant,
        "participants": participant_ids,
        "splits": splits
    }
