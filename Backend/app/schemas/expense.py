
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict
from typing import Literal
from datetime import datetime


class ExpenseSplitInput(BaseModel):
    user_id: int = Field(gt=0)
    share_amount: Decimal = Field(ge=0, max_digits=12, decimal_places=2)


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    description: str = Field(min_length=1, max_length=255)

    merchant: str | None = None
    input_source: Literal["manual", "qr", "voice"] = "manual"
    transcription_text: str | None = None
    source_reference: str | None = None

    participants: list[int] = Field(min_length=1)
    splits: list[ExpenseSplitInput] = Field(min_length=1)


class ExpenseSplitResponse(BaseModel):
    id: int
    user_id: int
    share_amount: Decimal

    model_config = ConfigDict(from_attributes=True)

class ExpenseResponse(BaseModel):
    id: int
    group_id: int
    paid_by: int
    amount: Decimal
    description: str
    merchant: str | None
    input_source: str
    split_type: str
    expense_date: datetime
    created_at: datetime
    splits: list[ExpenseSplitResponse]

    model_config = ConfigDict(from_attributes=True)

