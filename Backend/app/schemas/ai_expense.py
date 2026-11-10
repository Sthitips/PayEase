
from decimal import Decimal
from pydantic import BaseModel, Field
from typing import Literal

class AIExpenseParticipant(BaseModel):
    name: str = Field(min_length=1)
    share_amount: Decimal = Field(
        ge=0,
        max_digits=12,
        decimal_places=2
    )


class AIExpenseDraft(BaseModel):
    amount: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2
    )

    description: str = Field(min_length=1, max_length=255)

    merchant: str | None = None

    participants: list[AIExpenseParticipant] = Field(min_length=1)

    clarification_needed: bool = False

    clarification_question: str | None = None

class AIExpenseRequest(BaseModel):
    description: str = Field(
        min_length=5,
        max_length=2000
    )


class GeminiExpenseParticipant(BaseModel):
    name: str

    # Used for ratio, percentage, or custom allocations.
    # Not required for equal or additional-amount splits.
    allocation_value: float | None = None



class GeminiExpenseAdjustment(BaseModel):
    participant_name: str
    amount: float
    reference: Literal[
        "each_other_participant",
        "additional_contribution"
    ]




class GeminiExpenseDraft(BaseModel):
    amount: float
    description: str
    merchant: str | None

    split_type: Literal[
        "equal",
        "additional_amount",
        "ratio",
        "percentage",
        "custom",
        "itemized"
    ]

    participants: list[GeminiExpenseParticipant]
    adjustment: GeminiExpenseAdjustment | None = None
    items: list[GeminiExpenseItem] | None = None

    clarification_needed: bool
    clarification_question: str | None



class GeminiExpenseItem(BaseModel):
    description: str
    amount: float
    participants: list[str]


