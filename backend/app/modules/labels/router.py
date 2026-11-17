from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.shared.schemas.response import StandardResponse
from app.modules.labels.schemas import (
    LabelUploadResponse,
    LabelExtractResponse,
    LabelReviewRequest,
    LabelReviewResponse
)
from app.integrations.ocr.preprocess import preprocess_label_image
from app.integrations.ocr.parser import extract_text_from_image, parse_nutrition_text
from app.core.dependencies import get_current_user
from app.config.database import get_database
from bson import ObjectId
from datetime import datetime, timezone
import shutil
import os
import uuid

router = APIRouter(prefix="/labels", tags=["Food Label OCR Pipeline"])
UPLOAD_DIR = os.path.join("uploads", "labels")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=StandardResponse)
async def upload_food_label(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in ALLOWED_MIMES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file.content_type}'. Allowed types: JPG, PNG, WEBP, PDF."
        )

    # 10MB Max File Size validation
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 10MB limit")

    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db = get_database()
    now = datetime.now(timezone.utc)
    label_doc = {
        "userId": ObjectId(current_user["id"]),
        "originalFilename": file.filename,
        "fileRef": saved_path,
        "fileSize": file_size,
        "mimeType": file.content_type,
        "status": "uploaded",
        "createdAt": now,
        "updatedAt": now
    }

    res = await db.food_labels.insert_one(label_doc)
    label_id = str(res.inserted_id)

    return StandardResponse(
        success=True,
        data={
            "labelId": label_id,
            "fileRef": saved_path,
            "originalFilename": file.filename,
            "status": "uploaded"
        },
        message="Label image uploaded successfully. Ready for OCR extraction."
    )

@router.post("/{label_id}/extract", response_model=StandardResponse)
async def extract_label_data(
    label_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(label_id):
        raise HTTPException(status_code=400, detail="Invalid label ID format")

    db = get_database()
    label = await db.food_labels.find_one({"_id": ObjectId(label_id)})
    if not label:
        raise HTTPException(status_code=404, detail="Uploaded label record not found")

    file_path = label.get("fileRef")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Label image file missing on server storage")

    now = datetime.now(timezone.utc)

    # 1. Computer Vision Preprocessing
    try:
        processed_path = preprocess_label_image(file_path)
    except Exception as e:
        processed_path = file_path

    # 2. OCR Text Extraction
    original_filename = label.get("originalFilename") or ""
    ocr_res = extract_text_from_image(
        image_path=processed_path,
        original_path=file_path,
        original_filename=original_filename
    )
    raw_text = ocr_res["text"]

    # 3. Nutrient Parser
    parsed = parse_nutrition_text(raw_text)

    # 4. Save Extraction Record
    extraction_doc = {
        "labelId": ObjectId(label_id),
        "userId": ObjectId(current_user["id"]),
        "engine": ocr_res["engine"],
        "isFallback": ocr_res["isFallback"],
        "rawText": raw_text,
        "candidateName": parsed["candidateName"],
        "servingBasis": parsed["servingBasis"],
        "fields": parsed["fields"],
        "nutrients": parsed["nutrients"],
        "reviewStatus": "pending_review",
        "createdAt": now
    }
    await db.label_extractions.insert_one(extraction_doc)

    # Update label status
    await db.food_labels.update_one(
        {"_id": ObjectId(label_id)},
        {"$set": {"status": "extracted", "updatedAt": now}}
    )

    return StandardResponse(
        success=True,
        data={
            "labelId": label_id,
            "engine": ocr_res["engine"],
            "isFallback": ocr_res["isFallback"],
            "candidateName": parsed["candidateName"],
            "servingBasis": parsed["servingBasis"],
            "fields": parsed["fields"],
            "nutrients": parsed["nutrients"],
            "rawText": raw_text
        },
        message="Nutrition label values extracted. Human review required before finalizing."
    )

@router.patch("/{label_id}/review", response_model=StandardResponse)
async def review_and_verify_label(
    label_id: str,
    payload: LabelReviewRequest,
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(label_id):
        raise HTTPException(status_code=400, detail="Invalid label ID format")

    db = get_database()
    label = await db.food_labels.find_one({"_id": ObjectId(label_id)})
    if not label:
        raise HTTPException(status_code=404, detail="Label record not found")

    now = datetime.now(timezone.utc)
    created_food_id = None

    # Resolve category
    category_id = None
    if payload.categoryId:
        if ObjectId.is_valid(payload.categoryId):
            category_id = ObjectId(payload.categoryId)
        else:
            cat = await db.food_categories.find_one({"slug": payload.categoryId})
            if cat:
                category_id = cat["_id"]

    if not category_id:
        default_cat = await db.food_categories.find_one({"slug": "packaged-snacks"})
        category_id = default_cat["_id"] if default_cat else ObjectId()

    # If action is 'save_to_foods', create food entry in foods collection
    if payload.action == "save_to_foods":
        food_doc = {
            "name": payload.foodName.strip(),
            "normalizedName": payload.foodName.strip().lower(),
            "brand": payload.brand.strip() if payload.brand else None,
            "categoryId": category_id,
            "basis": payload.basis,
            "nutrients": payload.nutrients,
            "servings": [],
            "source": {
                "name": "OCR Label Scan (Human Verified)",
                "referenceId": f"OCR-{label_id[:8]}",
                "retrievalDate": now,
                "verifiedBy": ObjectId(current_user["id"])
            },
            "verificationStatus": "verified",
            "createdAt": now,
            "updatedAt": now
        }
        res = await db.foods.insert_one(food_doc)
        created_food_id = str(res.inserted_id)

    # Save audit record
    audit_event = {
        "labelId": ObjectId(label_id),
        "reviewedBy": ObjectId(current_user["id"]),
        "action": payload.action,
        "reviewedValues": payload.nutrients,
        "createdFoodId": ObjectId(created_food_id) if created_food_id else None,
        "notes": payload.notes,
        "reviewedAt": now
    }
    await db.audit_logs.insert_one(audit_event)

    # Update label status
    await db.food_labels.update_one(
        {"_id": ObjectId(label_id)},
        {"$set": {"status": "reviewed", "foodId": created_food_id, "updatedAt": now}}
    )

    return StandardResponse(
        success=True,
        data={
            "labelId": label_id,
            "reviewStatus": "reviewed",
            "foodId": created_food_id,
            "auditEvent": {
                "action": payload.action,
                "reviewedAt": now.isoformat(),
                "createdFoodId": created_food_id
            }
        },
        message="Label reviewed and saved to Food Repository with audit trail."
    )

@router.get("/{label_id}", response_model=StandardResponse)
async def get_label_details(label_id: str):
    if not ObjectId.is_valid(label_id):
        raise HTTPException(status_code=400, detail="Invalid label ID")

    db = get_database()
    label = await db.food_labels.find_one({"_id": ObjectId(label_id)})
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")

    extraction = await db.label_extractions.find_one({"labelId": ObjectId(label_id)})

    return StandardResponse(
        success=True,
        data={
            "id": str(label["_id"]),
            "originalFilename": label.get("originalFilename"),
            "fileRef": label.get("fileRef"),
            "status": label.get("status"),
            "extraction": {
                "engine": extraction.get("engine") if extraction else None,
                "candidateName": extraction.get("candidateName") if extraction else None,
                "nutrients": extraction.get("nutrients") if extraction else None,
                "fields": extraction.get("fields") if extraction else []
            } if extraction else None
        },
        message="Label details retrieved"
    )
