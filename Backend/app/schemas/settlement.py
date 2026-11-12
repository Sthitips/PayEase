
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


class SettlementPaymentInitiate(BaseModel):
    payment_method: Literal["manual"] = "manual"
    external_reference: str | None = Field(
        default=None,
        max_length=255
    )


class SettlementPaymentConfirm(BaseModel):
    action: Literal["confirm", "reject"]


class SettlementPaymentResponse(BaseModel):
    id: int
    settlement_id: int
    payer_user_id: int
    confirmed_by_user_id: int | None
    amount: Decimal
    currency: str
    provider: str | None
    payment_method: str
    external_reference: str | None
    status: str
    confirmation_method: str | None
    created_at: datetime
    confirmed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class SettlementResponse(BaseModel):
    id: int
    group_id: int
    from_user_id: int
    to_user_id: int
    amount: Decimal
    status: str
    payment_method: str | None
    payment_provider: str | None
    provider_reference: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
