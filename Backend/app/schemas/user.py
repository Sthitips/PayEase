
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# Data received during registration
class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


# Data received during login
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# Data returned to the frontend
class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    profile_picture: str | None = None
    paypal_email: str | None = None

    model_config = ConfigDict(from_attributes=True)


# Token response model for authentication
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserProfileUpdate(BaseModel):
    paypal_email: EmailStr | None = None
