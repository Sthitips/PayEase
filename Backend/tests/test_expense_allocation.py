
import pytest
from decimal import Decimal

from app.schemas.ai_expense import (
    GeminiExpenseDraft,
    GeminiExpenseParticipant,
    GeminiExpenseAdjustment,
    GeminiExpenseItem,
)

from app.services.expense_allocation_service import (
    calculate_expense_shares,
)


def create_draft(
    amount,
    split_type,
    participants,
    adjustment=None,
    items=None
):
    return GeminiExpenseDraft(
        amount=amount,
        description="Test expense",
        merchant=None,
        split_type=split_type,
        participants=[
            GeminiExpenseParticipant(**p)
            for p in participants
        ],
        adjustment=(
            GeminiExpenseAdjustment(**adjustment)
            if adjustment else None
        ),
        items=[
            GeminiExpenseItem(**item)
            for item in items
        ] if items else None,
        clarification_needed=False,
        clarification_question=None,
    )


def get_shares(draft):
    result = calculate_expense_shares(draft)

    return {
        p.name: p.share_amount
        for p in result.participants
    }


def test_equal_split():
    draft = create_draft(
        120,
        "equal",
        [
            {"name": "Alison"},
            {"name": "Bob"},
            {"name": "Charlie"},
        ]
    )

    shares = get_shares(draft)

    assert shares == {
        "Alison": Decimal("40.00"),
        "Bob": Decimal("40.00"),
        "Charlie": Decimal("40.00"),
    }


def test_additional_amount_split():
    draft = create_draft(
        120,
        "additional_amount",
        [
            {"name": "Alison"},
            {"name": "Bob"},
            {"name": "Charlie"},
        ],
        adjustment={
            "participant_name": "Bob",
            "amount": 20,
            "reference": "each_other_participant",
        }
    )

    shares = get_shares(draft)

    assert shares == {
        "Alison": Decimal("33.33"),
        "Bob": Decimal("53.34"),
        "Charlie": Decimal("33.33"),
    }


def test_ratio_split():
    draft = create_draft(
        100,
        "ratio",
        [
            {"name": "Alison", "allocation_value": 2},
            {"name": "Bob", "allocation_value": 3},
            {"name": "Charlie", "allocation_value": 5},
        ]
    )

    assert get_shares(draft) == {
        "Alison": Decimal("20.00"),
        "Bob": Decimal("30.00"),
        "Charlie": Decimal("50.00"),
    }


def test_percentage_split():
    draft = create_draft(
        100,
        "percentage",
        [
            {"name": "Alison", "allocation_value": 50},
            {"name": "Bob", "allocation_value": 30},
            {"name": "Charlie", "allocation_value": 20},
        ]
    )

    assert get_shares(draft) == {
        "Alison": Decimal("50.00"),
        "Bob": Decimal("30.00"),
        "Charlie": Decimal("20.00"),
    }


def test_custom_split():
    draft = create_draft(
        100,
        "custom",
        [
            {"name": "Alison", "allocation_value": 30},
            {"name": "Bob", "allocation_value": 50},
            {"name": "Charlie", "allocation_value": 20},
        ]
    )

    assert get_shares(draft) == {
        "Alison": Decimal("30.00"),
        "Bob": Decimal("50.00"),
        "Charlie": Decimal("20.00"),
    }


def test_itemized_split_with_additional_contribution():
    draft = create_draft(
        120,
        "itemized",
        [
            {"name": "Alison"},
            {"name": "Charlie"},
            {"name": "Bob"},
        ],
        adjustment={
            "participant_name": "Bob",
            "amount": 20,
            "reference": "additional_contribution",
        },
        items=[
            {
                "description": "Sandwich",
                "amount": 30,
                "participants": ["Alison"],
            },
            {
                "description": "Sandwich",
                "amount": 30,
                "participants": ["Charlie"],
            },
            {
                "description": "Pasta bowl",
                "amount": 40,
                "participants": ["Charlie", "Bob"],
            },
        ]
    )

    assert get_shares(draft) == {
        "Alison": Decimal("30.00"),
        "Charlie": Decimal("50.00"),
        "Bob": Decimal("40.00"),
    }


def test_itemized_total_mismatch():
    draft = create_draft(
        120,
        "itemized",
        [
            {"name": "Alison"},
            {"name": "Bob"},
        ],
        items=[
            {
                "description": "Pizza",
                "amount": 50,
                "participants": ["Alison", "Bob"],
            }
        ]
    )

    with pytest.raises(ValueError):
        calculate_expense_shares(draft)


def test_itemized_unknown_participant():
    draft = create_draft(
        50,
        "itemized",
        [
            {"name": "Alison"},
        ],
        items=[
            {
                "description": "Pizza",
                "amount": 50,
                "participants": ["Unknown Person"],
            }
        ]
    )

    with pytest.raises(ValueError):
        calculate_expense_shares(draft)


def test_equal_split_rounding():
    draft = create_draft(
        100,
        "equal",
        [
            {"name": "Alison"},
            {"name": "Bob"},
            {"name": "Charlie"},
        ]
    )

    shares = get_shares(draft)

    assert sum(shares.values()) == Decimal("100.00")
    assert shares["Alison"] == Decimal("33.34")
    assert shares["Bob"] == Decimal("33.33")
    assert shares["Charlie"] == Decimal("33.33")
