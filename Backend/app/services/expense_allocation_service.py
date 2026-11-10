
from decimal import Decimal, ROUND_FLOOR

from app.schemas.ai_expense import (
    GeminiExpenseDraft,
    AIExpenseDraft,
    AIExpenseParticipant,
)


def to_cents(value: float | Decimal) -> int:
    # Convert a monetary value into integer cents.
    amount = Decimal(str(value))

    if not amount.is_finite() or amount < 0:
        raise ValueError("Monetary values must be finite and non-negative.")

    cents = amount * 100

    if cents != cents.to_integral_value():
        raise ValueError("Monetary values cannot have more than 2 decimal places.")

    return int(cents)


def from_cents(cents: int) -> Decimal:
    # Convert integer cents/paise back into a Decimal amount.
    return (Decimal(cents) / Decimal(100)).quantize(Decimal("0.01"))


def allocate_by_weights(total_cents: int, weights: list[Decimal]) -> list[int]:
    """
    Allocate an amount proportionally using the largest-remainder method.
    Guarantees that the allocated amounts sum exactly to total_cents.
    """
    if not weights or any(weight < 0 for weight in weights):
        raise ValueError("Invalid allocation weights.")

    weight_sum = sum(weights)

    if weight_sum <= 0:
        raise ValueError("Total allocation weight must be positive.")

    exact_shares = [
        Decimal(total_cents) * weight / weight_sum
        for weight in weights
    ]

    shares = [
        int(share.to_integral_value(rounding=ROUND_FLOOR))
        for share in exact_shares
    ]

    remaining_cents = total_cents - sum(shares)

    # Give remaining cents to participants with the largest fractional
    # remainders. Original participant order breaks ties deterministically.
    remainders = [
        share - Decimal(whole)
        for share, whole in zip(exact_shares, shares)
    ]

    priority = sorted(
        range(len(weights)),
        key=lambda i: (-remainders[i], i)
    )

    for i in priority[:remaining_cents]:
        shares[i] += 1

    return shares


def calculate_expense_shares(
    draft: GeminiExpenseDraft
) -> AIExpenseDraft:
    # Convert Gemini's split interpretation into exact monetary shares. 

    if draft.clarification_needed:
        raise ValueError(
            draft.clarification_question or
            "More information is needed to split this expense."
        )

    if not draft.participants:
        raise ValueError("At least one participant is required.")

    names = [p.name.strip() for p in draft.participants]

    if any(not name for name in names):
        raise ValueError("Participant names cannot be empty.")

    if len({name.casefold() for name in names}) != len(names):
        raise ValueError("Duplicate participants were detected.")

    total_cents = to_cents(draft.amount)

    if total_cents <= 0:
        raise ValueError("Expense amount must be greater than zero.")

    split_type = draft.split_type
    participants = draft.participants
    count = len(participants)

    # 1. Equal split
    if split_type == "equal":
        if draft.adjustment is not None:
            raise ValueError("Equal split cannot contain an adjustment.")

        shares = allocate_by_weights(
            total_cents,
            [Decimal(1)] * count
        )

    # 2. One participant pays an additional amount
    elif split_type == "additional_amount":
        adjustment = draft.adjustment

        if adjustment is None:
            raise ValueError("Additional amount details are missing.")

        target_indices = [
            i for i, p in enumerate(participants)
            if p.name.strip().casefold()
            == adjustment.participant_name.strip().casefold()
        ]

        if len(target_indices) != 1:
            raise ValueError(
                "The adjustment participant could not be identified."
            )

        extra_cents = to_cents(adjustment.amount)

        if extra_cents <= 0 or extra_cents >= total_cents:
            raise ValueError("Invalid additional amount.")

        if adjustment.reference != "each_other_participant":
            raise ValueError("Unsupported adjustment reference.")

        if any(p.allocation_value is not None for p in participants):
            raise ValueError(
                "Additional amount split should not contain allocation values."
            )

                
        base_cents = total_cents - extra_cents
        target_index = target_indices[0]

        # Give the adjustment participant first priority
        # when distributing any remaining cents.
        priority_order = [
            target_index
        ] + [
            i for i in range(count) if i != target_index
        ]

        ordered_shares = allocate_by_weights(
            base_cents,
            [Decimal(1)] * count
        )

        shares = [0] * count

        for index, share in zip(priority_order, ordered_shares):
            shares[index] = share

        shares[target_index] += extra_cents

    # 3. Ratio split
    elif split_type == "ratio":
        if draft.adjustment is not None:
            raise ValueError("Ratio split cannot contain an adjustment.")

        weights = [
            Decimal(str(p.allocation_value))
            if p.allocation_value is not None
            else Decimal(0)
            for p in participants
        ]

        if any(weight <= 0 for weight in weights):
            raise ValueError("Every ratio weight must be greater than zero.")

        shares = allocate_by_weights(total_cents, weights)

    # 4. Percentage split
    elif split_type == "percentage":
        if draft.adjustment is not None:
            raise ValueError("Percentage split cannot contain an adjustment.")

        percentages = [
            Decimal(str(p.allocation_value))
            if p.allocation_value is not None
            else Decimal(-1)
            for p in participants
        ]

        if any(value < 0 for value in percentages):
            raise ValueError("Percentages cannot be negative or missing.")

        if sum(percentages) != Decimal(100):
            raise ValueError("Participant percentages must add up to 100.")

        shares = allocate_by_weights(total_cents, percentages)

    # 5. Custom monetary amounts
    elif split_type == "custom":
        if draft.adjustment is not None:
            raise ValueError("Custom split cannot contain an adjustment.")

        shares = []

        for participant in participants:
            if participant.allocation_value is None:
                raise ValueError(
                    f"Custom amount missing for {participant.name}."
                )

            shares.append(to_cents(participant.allocation_value))

        if sum(shares) != total_cents:
            raise ValueError(
                "Custom participant amounts must add up exactly to the expense."
            )

    
    # 6. Itemized split
    elif split_type == "itemized":

        if not draft.items:
            raise ValueError("Itemized expense must contain items.")

        if any(p.allocation_value is not None for p in participants):
            raise ValueError(
                "Itemized split cannot contain allocation values."
            )

        # Create a balance entry for every participant.
        participant_names = {
            p.name.strip().casefold(): p.name.strip()
            for p in participants
        }

        item_shares = {
            name: 0 for name in participant_names
        }

        total_item_cents = 0

        # Calculate each item's cost among its consumers.
        for item in draft.items:

            item_cents = to_cents(item.amount)

            if item_cents <= 0:
                raise ValueError(
                    f"Item '{item.description}' must have a positive amount."
                )

            if not item.participants:
                raise ValueError(
                    f"Item '{item.description}' has no participants."
                )

            item_participants = [
                name.strip().casefold()
                for name in item.participants
            ]

            if len(set(item_participants)) != len(item_participants):
                raise ValueError(
                    f"Duplicate participants in item '{item.description}'."
                )

            for name in item_participants:
                if name not in participant_names:
                    raise ValueError(
                        f"Unknown participant '{name}' in item "
                        f"'{item.description}'."
                    )

            individual_shares = allocate_item_cost(
                item_cents,
                len(item_participants)
            )

            for name, share in zip(
                item_participants,
                individual_shares
            ):
                item_shares[name] += share

            total_item_cents += item_cents

        # Apply an additional contribution, if specified.
        adjustment_cents = 0

        if draft.adjustment is not None:

            adjustment = draft.adjustment

            if adjustment.reference != "additional_contribution":
                raise ValueError(
                    "Itemized expenses require an "
                    "additional_contribution adjustment."
                )

            target_name = adjustment.participant_name.strip().casefold()

            if target_name not in item_shares:
                raise ValueError(
                    "Adjustment participant is not part of the expense."
                )

            adjustment_cents = to_cents(adjustment.amount)

            if adjustment_cents <= 0:
                raise ValueError(
                    "Additional contribution must be positive."
                )

            item_shares[target_name] += adjustment_cents

        # The item costs plus additional contributions must
        # reconcile exactly with the total expense.
        if total_item_cents + adjustment_cents != total_cents:
            raise ValueError(
                "Item costs and additional contributions do not "
                "match the total expense. Clarification is required."
            )

        # Preserve the original participant ordering.
        shares = [
            item_shares[p.name.strip().casefold()]
            for p in participants
        ]


    else:
        raise ValueError("Unsupported expense split type.")

    # Final safety check before creating the validated draft.
    if sum(shares) != total_cents:
        raise ValueError("Calculated shares do not match the expense amount.")

    return AIExpenseDraft(
        amount=from_cents(total_cents),
        description=draft.description,
        merchant=draft.merchant,
        participants=[
            AIExpenseParticipant(
                name=participant.name.strip(),
                share_amount=from_cents(share)
            )
            for participant, share in zip(participants, shares)
        ],
        clarification_needed=False,
        clarification_question=None
    )


def allocate_item_cost(
    item_amount_cents: int,
    participant_count: int
) -> list[int]:
    # Split one item's cost equally among its consumers

    if participant_count <= 0:
        raise ValueError("An item must have at least one participant.")

    return allocate_by_weights(
        item_amount_cents,
        [Decimal(1)] * participant_count
    )

