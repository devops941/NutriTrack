import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, 'backend')
load_dotenv('backend/.env')

from app.config.database import connect_to_mongo, close_mongo_connection, get_database
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.modules.auth.schemas import RegisterRequest, LoginRequest
from app.modules.profiles.schemas import ProfileUpdate
from app.modules.auth.router import register, login, get_me
from app.modules.profiles.router import get_my_profile, update_my_profile
from fastapi import Response

async def run_auth_verification():
    print("==================================================")
    print("PHASE 2 AUTHENTICATION & PROFILE VERIFICATION")
    print("==================================================")

    # 1. Connect to MongoDB Atlas (carequeue)
    await connect_to_mongo()
    db = get_database()
    assert db is not None, "Database connection failed"
    print("✓ MongoDB Atlas (carequeue) connection established")

    # Clean up any existing test user
    test_email = "phase2_verifier@nutritrack.dev"
    await db.users.delete_many({"email": test_email})
    await db.user_profiles.delete_many({"displayName": "Phase 2 Verifier"})
    print(f"✓ Cleaned previous test artifacts for {test_email}")

    # 2. Test Registration
    reg_payload = RegisterRequest(
        email=test_email,
        password="SecureNutriTrack2026!",
        fullName="Phase 2 Verifier"
    )
    dummy_response = Response()
    reg_result = await register(reg_payload, dummy_response)
    assert reg_result.success is True
    user_id = reg_result.data["user"]["id"]
    access_token = reg_result.data["accessToken"]
    assert user_id is not None
    assert access_token is not None
    print(f"✓ User registered successfully! ID: {user_id}")

    # 3. Test Duplicate Registration Prevention
    try:
        await register(reg_payload, dummy_response)
        raise AssertionError("Duplicate registration should have raised HTTPException!")
    except Exception as e:
        print("✓ Duplicate email correctly rejected with error")

    # 4. Test Login
    login_payload = LoginRequest(
        email=test_email,
        password="SecureNutriTrack2026!"
    )
    login_result = await login(login_payload, dummy_response)
    assert login_result.success is True
    logged_in_token = login_result.data["accessToken"]
    print("✓ User login succeeded and issued new access token")

    # 5. Test Current User Retrieval (/auth/me)
    current_user_dict = {
        "id": user_id,
        "email": test_email,
        "fullName": "Phase 2 Verifier",
        "roles": ["standard_user"],
        "status": "active",
        "isVerified": False
    }
    me_result = await get_me(current_user=current_user_dict)
    assert me_result.success is True
    assert me_result.data["email"] == test_email
    print(f"✓ /auth/me verified for user: {me_result.data['fullName']}")

    # 6. Test Profile Update (/profiles/me)
    profile_payload = ProfileUpdate(
        displayName="Gokul Nutrition Specialist",
        heightCm=178.0,
        weightKg=72.5,
        activityLevel="moderately_active",
        dietaryPreferences=["vegetarian"],
        allergies=["peanuts"],
        preferredUnits="metric",
        dailyCalorieGoal=2150.0
    )
    update_result = await update_my_profile(profile_payload, current_user=current_user_dict)
    assert update_result.success is True
    assert update_result.data["heightCm"] == 178.0
    assert update_result.data["weightKg"] == 72.5
    assert update_result.data["dietaryPreferences"] == ["vegetarian"]
    print("✓ /profiles/me updated: Height 178cm, Weight 72.5kg, Diet: vegetarian, Goal: 2150 kcal")

    # 7. Test Profile Retrieval
    get_profile_result = await get_my_profile(current_user=current_user_dict)
    assert get_profile_result.success is True
    assert get_profile_result.data["dailyCalorieGoal"] == 2150.0
    print("✓ /profiles/me persistent retrieval matches updated values")

    # Clean up and close connection
    await db.users.delete_many({"email": test_email})
    await db.user_profiles.delete_many({"userId": user_id})
    await close_mongo_connection()
    print("==================================================")
    print("ALL PHASE 2 BACKEND AUTH TESTS PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_auth_verification())
