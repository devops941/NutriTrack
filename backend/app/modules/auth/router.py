from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from app.shared.schemas.response import StandardResponse
from app.modules.auth.schemas import RegisterRequest, LoginRequest, RefreshTokenRequest, AuthResponse, UserResponse
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_token
)
from app.core.dependencies import get_current_user
from app.config.settings import settings
from app.config.database import get_database
from bson import ObjectId
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, response: Response):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection is not available")

    email_clean = payload.email.strip().lower()
    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )

    now = datetime.now(timezone.utc)
    user_doc = {
        "email": email_clean,
        "passwordHash": hash_password(payload.password),
        "fullName": payload.fullName.strip(),
        "roles": ["standard_user"],
        "status": "active",
        "isVerified": False,
        "isOnboarded": False,
        "createdAt": now,
        "updatedAt": now
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Initialize associated personal nutrition profile
    profile_doc = {
        "userId": ObjectId(user_id),
        "displayName": payload.fullName.strip(),
        "activityLevel": "sedentary",
        "dietaryPreferences": [],
        "allergies": [],
        "excludedIngredients": [],
        "preferredUnits": "metric",
        "createdAt": now,
        "updatedAt": now
    }
    await db.user_profiles.insert_one(profile_doc)

    # Tokens
    access_token = create_access_token({"sub": user_id, "roles": user_doc["roles"]})
    refresh_token = create_refresh_token({"sub": user_id})

    # Store hashed refresh token
    token_h = hash_token(refresh_token)
    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await db.refresh_tokens.insert_one({
        "userId": ObjectId(user_id),
        "tokenHash": token_h,
        "createdAt": now,
        "expiresAt": expires_at
    })

    # Set secure refresh cookie
    response.set_cookie(
        key="nutritrack_refresh",
        value=refresh_token,
        httponly=True,
        secure=False, # Set True in production with SSL
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth"
    )

    return StandardResponse(
        success=True,
        data={
            "user": {
                "id": user_id,
                "email": user_doc["email"],
                "fullName": user_doc["fullName"],
                "roles": user_doc["roles"],
                "status": user_doc["status"],
                "isVerified": user_doc["isVerified"],
                "isOnboarded": False
            },
            "accessToken": access_token,
            "tokenType": "Bearer",
            "expiresIn": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        },
        message="Registration successful. Welcome to NutriTrack!"
    )

@router.post("/login", response_model=StandardResponse)
async def login(payload: LoginRequest, response: Response):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection is not available")

    email_clean = payload.email.strip().lower()
    user = await db.users.find_one({"email": email_clean})
    if not user or not verify_password(payload.password, user.get("passwordHash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact administrator."
        )

    user_id = str(user["_id"])
    now = datetime.now(timezone.utc)

    access_token = create_access_token({"sub": user_id, "roles": user.get("roles", ["standard_user"])})
    refresh_token = create_refresh_token({"sub": user_id})

    # Store hashed refresh token
    token_h = hash_token(refresh_token)
    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await db.refresh_tokens.insert_one({
        "userId": user["_id"],
        "tokenHash": token_h,
        "createdAt": now,
        "expiresAt": expires_at
    })

    # Set secure cookie
    response.set_cookie(
        key="nutritrack_refresh",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth"
    )

    return StandardResponse(
        success=True,
        data={
            "user": {
                "id": user_id,
                "email": user["email"],
                "fullName": user.get("fullName") or user.get("email", "").split("@")[0],
                "roles": user.get("roles", ["standard_user"]),
                "status": user.get("status", "active"),
                "isVerified": user.get("isVerified", False),
                "isOnboarded": user.get("isOnboarded", False)
            },
            "accessToken": access_token,
            "tokenType": "Bearer",
            "expiresIn": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        },
        message="Login successful"
    )

@router.post("/refresh", response_model=StandardResponse)
async def refresh_token(request: Request, response: Response, payload: RefreshTokenRequest = None):
    # Try reading from cookie first, then from JSON payload
    raw_token = request.cookies.get("nutritrack_refresh")
    if not raw_token and payload and payload.refreshToken:
        raw_token = payload.refreshToken

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found in cookies or request body"
        )

    decoded = decode_refresh_token(raw_token)
    if not decoded:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user_id = decoded.get("sub")
    db = get_database()
    token_h = hash_token(raw_token)

    stored_token = await db.refresh_tokens.find_one({"tokenHash": token_h})
    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked or invalidated"
        )

    # Invalidate used refresh token (Token Rotation)
    await db.refresh_tokens.delete_one({"_id": stored_token["_id"]})

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("status") != "active":
        raise HTTPException(status_code=401, detail="User account inactive or deleted")

    now = datetime.now(timezone.utc)
    new_access_token = create_access_token({"sub": user_id, "roles": user.get("roles", ["standard_user"])})
    new_refresh_token = create_refresh_token({"sub": user_id})

    # Save new rotated refresh token
    new_token_h = hash_token(new_refresh_token)
    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await db.refresh_tokens.insert_one({
        "userId": ObjectId(user_id),
        "tokenHash": new_token_h,
        "createdAt": now,
        "expiresAt": expires_at
    })

    # Set new cookie
    response.set_cookie(
        key="nutritrack_refresh",
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth"
    )

    return StandardResponse(
        success=True,
        data={
            "accessToken": new_access_token,
            "tokenType": "Bearer",
            "expiresIn": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        },
        message="Access token refreshed successfully"
    )

@router.post("/logout", response_model=StandardResponse)
async def logout(request: Request, response: Response):
    raw_token = request.cookies.get("nutritrack_refresh")
    if raw_token:
        db = get_database()
        if db is not None:
            token_h = hash_token(raw_token)
            await db.refresh_tokens.delete_many({"tokenHash": token_h})

    response.delete_cookie(key="nutritrack_refresh", path="/api/v1/auth")
    return StandardResponse(
        success=True,
        data=None,
        message="Logged out successfully"
    )

@router.get("/me", response_model=StandardResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return StandardResponse(
        success=True,
        data={
            "id": current_user["id"],
            "email": current_user["email"],
            "fullName": current_user.get("fullName") or current_user.get("email", "").split("@")[0],
            "roles": current_user.get("roles", ["standard_user"]),
            "status": current_user.get("status", "active"),
            "isVerified": current_user.get("isVerified", False),
            "isOnboarded": current_user.get("isOnboarded", False),
            "createdAt": current_user.get("createdAt")
        },
        message="Current user profile retrieved"
    )
