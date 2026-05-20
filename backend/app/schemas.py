# Pydantic şemaları: API istek ve yanıt formatları
import re
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator

from app.models import UserRole


class RegisterRequest(BaseModel):
    name: str          # "Ad Soyad" — frontend tek alan gönderiyor
    email: EmailStr
    password: str
    role: UserRole = UserRole.student

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Şifre en az 8 karakter olmalı")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Şifre en az bir büyük harf içermeli")
        if not re.search(r"\d", v):
            raise ValueError("Şifre en az bir rakam içermeli")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Ad en az 2 karakter olmalı")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    ad: str
    soyad: str
    role: UserRole
    aktif: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    token: str
    user: UserResponse
