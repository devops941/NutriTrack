from fastapi import APIRouter, Depends, HTTPException, status
from app.shared.schemas.response import StandardResponse
from app.modules.profiles.schemas import ProfileUpdate, ProfileResponse
from app.core.dependencies import get_current_user
from app.config.database import get_database
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/profiles", tags=["Personal Nutrition Profile"])

@router.get("/me", response_model=StandardResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    db = get_database()
    profile = await db.user_profiles.find_one({"userId": ObjectId(current_user["id"])})
    if not profile:
        # Create default if not present
        now = datetime.now(timezone.utc)
        profile = {
            "userId": ObjectId(current_user["id"]),
            "displayName": current_user.get("fullName", ""),
            "activityLevel": "sedentary",
            "dietaryPreferences": [],
            "allergies": [],
            "excludedIngredients": [],
            "preferredUnits": "metric",
            "createdAt": now,
            "updatedAt": now
        }
        res = await db.user_profiles.insert_one(profile)
        profile["_id"] = res.inserted_id

    formatted = {
        "id": str(profile["_id"]),
        "userId": str(profile["userId"]),
        "displayName": profile.get("displayName"),
        "dateOfBirth": profile.get("dateOfBirth"),
        "gender": profile.get("gender"),
        "heightCm": profile.get("heightCm"),
        "weightKg": profile.get("weightKg"),
        "activityLevel": profile.get("activityLevel", "sedentary"),
        "dietaryPreferences": profile.get("dietaryPreferences", []),
        "allergies": profile.get("allergies", []),
        "excludedIngredients": profile.get("excludedIngredients", []),
        "preferredUnits": profile.get("preferredUnits", "metric"),
        "dailyCalorieGoal": profile.get("dailyCalorieGoal"),
        "updatedAt": profile.get("updatedAt")
    }

    return StandardResponse(
        success=True,
        data=formatted,
        message="Personal profile retrieved"
    )

@router.put("/me", response_model=StandardResponse)
async def update_my_profile(payload: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    update_data = payload.model_dump(exclude_unset=True)
    update_data["updatedAt"] = datetime.now(timezone.utc)

    # Convert date to string or datetime if needed
    if "dateOfBirth" in update_data and update_data["dateOfBirth"]:
        update_data["dateOfBirth"] = str(update_data["dateOfBirth"])

    result = await db.user_profiles.find_one_and_update(
        {"userId": ObjectId(current_user["id"])},
        {"$set": update_data},
        upsert=True,
        return_document=True
    )

    # Mark user as onboarded in users collection
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"isOnboarded": True, "updatedAt": datetime.now(timezone.utc)}}
    )

    formatted = {
        "id": str(result["_id"]),
        "userId": str(result["userId"]),
        "displayName": result.get("displayName"),
        "dateOfBirth": result.get("dateOfBirth"),
        "gender": result.get("gender"),
        "heightCm": result.get("heightCm"),
        "weightKg": result.get("weightKg"),
        "activityLevel": result.get("activityLevel", "sedentary"),
        "dietaryPreferences": result.get("dietaryPreferences", []),
        "allergies": result.get("allergies", []),
        "excludedIngredients": result.get("excludedIngredients", []),
        "preferredUnits": result.get("preferredUnits", "metric"),
        "dailyCalorieGoal": result.get("dailyCalorieGoal"),
        "isOnboarded": True,
        "updatedAt": result.get("updatedAt")
    }

    return StandardResponse(
        success=True,
        data=formatted,
        message="Personal nutrition profile updated successfully"
    )
