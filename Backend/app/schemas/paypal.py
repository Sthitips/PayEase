from pydantic import BaseModel, Field
from decimal import Decimal

class PayPalOrderRequest(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    group_id: int = Field(gt=0)