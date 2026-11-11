
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict, EmailStr


class GroupCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = None
    currency: str = Field(default="USD", min_length=3, max_length=3)


class GroupResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    created_by: int
    currency: str
    invite_code: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JoinGroupRequest(BaseModel):
    invite_code: str = Field(min_length=6, max_length=12)


class GroupMemberResponse(BaseModel):
    id: int
    name: str
    email: str
    profile_picture: str | None = None
    role: str
    joined_at: datetime


class GroupMemberAdd(BaseModel):
    email: EmailStr


class GroupUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100
    )

    description: str | None = None

    currency: str | None = Field(
        default=None,
        min_length=3,
        max_length=3
    )
