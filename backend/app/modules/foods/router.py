from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from typing import Optional, List, Dict, Any
from app.shared.schemas.response import StandardResponse
from app.modules.foods.schemas import (
    FoodCreate,
    FoodUpdate,
    FoodResponse,
    FoodListResponse,
    CategoryResponse,
    CSVImportResult,
    BasisSchema,
    NutrientsSchema,
    ServingDefinition,
    SourceProvenance
)
from app.core.dependencies import get_current_user, require_roles
from app.config.database import get_database
from bson import ObjectId
from datetime import datetime, timezone
import math
import csv
import io

router = APIRouter(prefix="/foods", tags=["Food Database Management"])

def serialize_food(doc: dict, categories_map: dict = None) -> dict:
    cat_id = str(doc.get("categoryId", ""))
    cat_name = "General"
    if categories_map and cat_id in categories_map:
        cat_name = categories_map[cat_id]

    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", "Unknown Food"),
        "normalizedName": doc.get("normalizedName", ""),
        "brand": doc.get("brand"),
        "barcode": doc.get("barcode"),
        "categoryId": cat_id,
        "categoryName": cat_name,
        "basis": doc.get("basis", {"amount": 100.0, "unit": "g"}),
        "nutrients": doc.get("nutrients", {}),
        "servings": doc.get("servings", []),
        "source": doc.get("source", {"name": "NutriTrack Food Database"}),
        "verificationStatus": doc.get("verificationStatus", "verified"),
        "createdAt": doc.get("createdAt"),
        "updatedAt": doc.get("updatedAt")
    }

@router.get("/categories", response_model=StandardResponse)
async def list_categories():
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable")

    cursor = db.food_categories.find().sort("name", 1)
    cats = await cursor.to_list(length=100)
    formatted = [
        {
            "id": str(c["_id"]),
            "name": c.get("name", ""),
            "slug": c.get("slug", ""),
            "description": c.get("description"),
            "icon": c.get("icon")
        } for c in cats
    ]
    return StandardResponse(
        success=True,
        data=formatted,
        message="Food categories retrieved"
    )

@router.get("", response_model=StandardResponse)
async def list_and_search_foods(
    q: Optional[str] = Query(None, description="Search term for name or barcode"),
    category: Optional[str] = Query(None, description="Category slug or ObjectId"),
    status: Optional[str] = Query(None, description="verified, unverified, pending_review"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100)
):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable")

    # Sanitize parameter values
    clean_q = q if isinstance(q, str) and q.strip() else None
    clean_category = category if isinstance(category, str) and category.strip() else None
    clean_status = status if isinstance(status, str) and status.strip() else None

    # Build query filter
    query_filter: dict = {}

    if clean_status:
        query_filter["verificationStatus"] = clean_status

    if clean_category:
        # Check if category is slug or ObjectId
        if ObjectId.is_valid(clean_category):
            query_filter["categoryId"] = ObjectId(clean_category)
        else:
            cat_doc = await db.food_categories.find_one({"slug": clean_category})
            if cat_doc:
                query_filter["categoryId"] = cat_doc["_id"]

    if clean_q:
        q_term = clean_q.strip()
        query_filter["$or"] = [
            {"normalizedName": {"$regex": q_term.lower(), "$options": "i"}},
            {"name": {"$regex": q_term, "$options": "i"}},
            {"barcode": q_term}
        ]

    total_count = await db.foods.count_documents(query_filter)
    skip = (page - 1) * limit

    cursor = db.foods.find(query_filter).sort("createdAt", -1).skip(skip).limit(limit)
    food_docs = await cursor.to_list(length=limit)

    # Cache categories for names
    cat_cursor = db.food_categories.find()
    all_cats = await cat_cursor.to_list(length=200)
    categories_map = {str(c["_id"]): c["name"] for c in all_cats}

    serialized_foods = [serialize_food(f, categories_map) for f in food_docs]
    total_pages = math.ceil(total_count / limit) if total_count > 0 else 1

    return StandardResponse(
        success=True,
        data={
            "foods": serialized_foods,
            "total": total_count,
            "page": page,
            "limit": limit,
            "totalPages": total_pages
        },
        message=f"Retrieved {len(serialized_foods)} food items"
    )

@router.get("/{food_id}", response_model=StandardResponse)
async def get_food_by_id(food_id: str):
    db = get_database()
    if not ObjectId.is_valid(food_id):
        raise HTTPException(status_code=400, detail="Invalid Food ID format")

    food = await db.foods.find_one({"_id": ObjectId(food_id)})
    if not food:
        raise HTTPException(status_code=404, detail="Food item not found")

    cat_name = "General"
    if "categoryId" in food and food["categoryId"]:
        cat = await db.food_categories.find_one({"_id": food["categoryId"]})
        if cat:
            cat_name = cat["name"]

    return StandardResponse(
        success=True,
        data=serialize_food(food, {str(food.get("categoryId")): cat_name}),
        message="Food item details retrieved"
    )

@router.post("", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_food(payload: FoodCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()

    # Validate Category
    if not ObjectId.is_valid(payload.categoryId):
        # Check by slug
        cat = await db.food_categories.find_one({"slug": payload.categoryId})
        if not cat:
            raise HTTPException(status_code=400, detail="Specified category does not exist")
        category_id = cat["_id"]
    else:
        cat = await db.food_categories.find_one({"_id": ObjectId(payload.categoryId)})
        if not cat:
            raise HTTPException(status_code=400, detail="Specified category ID does not exist")
        category_id = ObjectId(payload.categoryId)

    norm_name = payload.name.strip().lower()
    now = datetime.now(timezone.utc)

    # Check duplicate
    existing = await db.foods.find_one({
        "normalizedName": norm_name,
        "brand": payload.brand
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A food entry with name '{payload.name}' already exists"
        )

    doc = {
        "name": payload.name.strip(),
        "normalizedName": norm_name,
        "brand": payload.brand.strip() if payload.brand else None,
        "barcode": payload.barcode.strip() if payload.barcode else None,
        "categoryId": category_id,
        "basis": payload.basis.model_dump(),
        "nutrients": payload.nutrients.model_dump(),
        "servings": [s.model_dump() for s in payload.servings],
        "source": {
            "name": payload.source.name,
            "referenceId": payload.source.referenceId or f"USER-{current_user['id'][:6]}",
            "retrievalDate": now,
            "submittedBy": ObjectId(current_user["id"])
        },
        "verificationStatus": payload.verificationStatus,
        "createdAt": now,
        "updatedAt": now
    }

    result = await db.foods.insert_one(doc)
    doc["_id"] = result.inserted_id

    return StandardResponse(
        success=True,
        data=serialize_food(doc, {str(category_id): cat["name"]}),
        message="Food record created successfully"
    )

@router.patch("/{food_id}", response_model=StandardResponse)
async def update_food(
    food_id: str,
    payload: FoodUpdate,
    current_user: dict = Depends(require_roles("administrator", "nutrition_analyst", "food_reviewer", "standard_user"))
):
    db = get_database()
    if not ObjectId.is_valid(food_id):
        raise HTTPException(status_code=400, detail="Invalid Food ID format")

    update_dict = payload.model_dump(exclude_unset=True)
    if "name" in update_dict and update_dict["name"]:
        update_dict["normalizedName"] = update_dict["name"].strip().lower()

    if "categoryId" in update_dict and update_dict["categoryId"]:
        if ObjectId.is_valid(update_dict["categoryId"]):
            update_dict["categoryId"] = ObjectId(update_dict["categoryId"])

    update_dict["updatedAt"] = datetime.now(timezone.utc)

    updated = await db.foods.find_one_and_update(
        {"_id": ObjectId(food_id)},
        {"$set": update_dict},
        return_document=True
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Food item not found")

    return StandardResponse(
        success=True,
        data=serialize_food(updated),
        message="Food record updated successfully"
    )

@router.post("/import", response_model=StandardResponse)
async def import_foods_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles("administrator", "nutrition_analyst", "food_reviewer", "standard_user"))
):
    db = get_database()
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files can be imported")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    # Get or create default General category
    default_cat = await db.food_categories.find_one({"slug": "general"})
    if not default_cat:
        cat_res = await db.food_categories.insert_one({
            "name": "General Foods",
            "slug": "general",
            "description": "Standard food catalog"
        })
        default_cat_id = cat_res.inserted_id
    else:
        default_cat_id = default_cat["_id"]

    total_rows = 0
    imported = 0
    skipped_duplicates = 0
    errors = []
    now = datetime.now(timezone.utc)

    for idx, row in enumerate(reader, start=2):
        total_rows += 1
        name = row.get("name") or row.get("Name") or row.get("food_name")
        if not name:
            errors.append({"row": idx, "error": "Missing food name"})
            continue

        name_clean = name.strip()
        norm_name = name_clean.lower()

        # Check duplicate
        exists = await db.foods.find_one({"normalizedName": norm_name})
        if exists:
            skipped_duplicates += 1
            continue

        try:
            def parse_float(val):
                if val is None or val == "" or val == "null" or val == "N/A":
                    return None
                return float(str(val).replace("g", "").replace("kcal", "").replace("mg", "").strip())

            doc = {
                "name": name_clean,
                "normalizedName": norm_name,
                "brand": row.get("brand") or row.get("Brand"),
                "barcode": row.get("barcode") or row.get("Barcode"),
                "categoryId": default_cat_id,
                "basis": {"amount": 100.0, "unit": "g"},
                "nutrients": {
                    "energyKcal": parse_float(row.get("energyKcal") or row.get("calories") or row.get("energy")),
                    "proteinG": parse_float(row.get("proteinG") or row.get("protein")),
                    "carbohydrateG": parse_float(row.get("carbohydrateG") or row.get("carbs")),
                    "fatG": parse_float(row.get("fatG") or row.get("fat")),
                    "fiberG": parse_float(row.get("fiberG") or row.get("fiber") or row.get("fibre")),
                    "sugarsG": parse_float(row.get("sugarsG") or row.get("sugar") or row.get("sugars")),
                    "sodiumMg": parse_float(row.get("sodiumMg") or row.get("sodium")),
                },
                "servings": [],
                "source": {
                    "name": "CSV Bulk Import",
                    "referenceId": f"CSV-{file.filename}",
                    "retrievalDate": now
                },
                "verificationStatus": "verified",
                "createdAt": now,
                "updatedAt": now
            }
            await db.foods.insert_one(doc)
            imported += 1
        except Exception as e:
            errors.append({"row": idx, "name": name_clean, "error": str(e)})

    return StandardResponse(
        success=True,
        data={
            "totalRows": total_rows,
            "importedCount": imported,
            "skippedDuplicates": skipped_duplicates,
            "errors": errors
        },
        message=f"CSV import completed: {imported} foods imported, {skipped_duplicates} duplicates skipped"
    )
