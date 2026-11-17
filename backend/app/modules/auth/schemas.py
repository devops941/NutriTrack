from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Password must be at least 8 characters")
    fullName: str = Field(min_length=2, max_length=100)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refreshToken: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    fullName: str
    roles: List[str]
    status: str
    isVerified: bool
    createdAt: Optional[datetime] = None

class AuthResponse(BaseModel):
    user: UserResponse
    accessToken: str
    tokenType: str = "Bearer"
    expiresIn: int
