import asyncio
import os
import sys
import numpy as np
import cv2
from dotenv import load_dotenv

sys.path.insert(0, 'backend')
load_dotenv('backend/.env')

from app.config.database import connect_to_mongo, close_mongo_connection, get_database
from app.integrations.ocr.preprocess import preprocess_label_image
from app.integrations.ocr.parser import parse_nutrition_text, extract_text_from_image
from app.modules.labels.router import (
    upload_food_label,
    extract_label_data,
    review_and_verify_label
)
from app.modules.labels.schemas import LabelReviewRequest
from fastapi import UploadFile
from bson import ObjectId
import io

async def run_ocr_verification():
    print("==================================================")
    print("PHASE 5 FOOD LABEL OCR PIPELINE VERIFICATION")
    print("==================================================")

    await connect_to_mongo()
    db = get_database()
    assert db is not None, "Atlas database connection failed"

    # 1. Create a synthetic test nutrition label image
    os.makedirs("uploads/labels", exist_ok=True)
    test_img_path = "uploads/labels/test_sample_label.png"
    img = np.ones((400, 600, 3), dtype=np.uint8) * 255 # White background
    cv2.putText(img, "NUTRITION FACTS", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
    cv2.putText(img, "Serving Size 100g", (50, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (50, 50, 50), 2)
    cv2.putText(img, "Energy: 250 kcal", (50, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "Protein: 12.5 g", (50, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "Total Carbohydrate: 35.0 g", (50, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "Total Fat: 6.0 g", (50, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "Dietary Fiber: 4.2 g", (50, 290), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "Sodium: 180 mg", (50, 330), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.imwrite(test_img_path, img)
    print(f"✓ Synthetic nutrition label image created: {test_img_path}")

    # 2. Test OpenCV & Pillow Preprocessing Pipeline
    proc_path = preprocess_label_image(test_img_path)
    assert os.path.exists(proc_path)
    print(f"✓ Computer vision preprocessing (CLAHE, bilateral filter, binarization) produced: {proc_path}")

    # 3. Test Regex & Heuristic Nutrient Parser
    sample_text = (
        "OAT CRUNCH BISCUITS\n"
        "Nutrition Information per 100g\n"
        "Energy: 440 kcal\n"
        "Protein: 8.5 g\n"
        "Total Carbohydrates: 65.0 g\n"
        "Total Sugars: 18.0 g\n"
        "Total Fat: 16.0 g\n"
        "Dietary Fibre: 6.0 g\n"
        "Sodium: 240 mg\n"
    )
    parsed = parse_nutrition_text(sample_text)
    assert parsed["candidateName"] == "OAT CRUNCH BISCUITS"
    assert parsed["nutrients"]["proteinG"] == 8.5
    assert parsed["nutrients"]["energyKcal"] == 440.0
    assert parsed["nutrients"]["carbohydrateG"] == 65.0
    assert parsed["nutrients"]["sodiumMg"] == 240.0
    print(f"✓ Regex parser verified: Energy {parsed['nutrients']['energyKcal']} kcal, Protein {parsed['nutrients']['proteinG']}g, Sodium {parsed['nutrients']['sodiumMg']}mg")

    # 4. Test Mock User for API endpoints
    mock_user = {
        "id": str(ObjectId()),
        "fullName": "OCR Quality Auditor",
        "roles": ["food_reviewer", "standard_user"]
    }

    # 5. Test Upload Endpoint
    with open(test_img_path, "rb") as f:
        file_bytes = f.read()

    upload_file = UploadFile(
        file=io.BytesIO(file_bytes),
        filename="test_sample_label.png",
        headers={"content-type": "image/png"}
    )
    upload_res = await upload_food_label(file=upload_file, current_user=mock_user)
    assert upload_res.success is True
    label_id = upload_res.data["labelId"]
    print(f"✓ Label upload endpoint verified. Label ID: {label_id}")

    # 6. Test Extract Endpoint
    extract_res = await extract_label_data(label_id=label_id, current_user=mock_user)
    assert extract_res.success is True
    assert extract_res.data["labelId"] == label_id
    print(f"✓ Label extract endpoint verified. Engine: {extract_res.data['engine']}, Candidate Name: '{extract_res.data['candidateName']}'")

    # 7. Test Human Review & Verification Endpoint (Audit Trail + Save to Food DB)
    review_req = LabelReviewRequest(
        labelId=label_id,
        foodName="Verified Oat Crunch Biscuits",
        brand="Healthy Crunch",
        categoryId="snacks",
        nutrients={
            "energyKcal": 440.0,
            "proteinG": 8.5,
            "carbohydrateG": 65.0,
            "fatG": 16.0,
            "fiberG": 6.0,
            "sugarsG": 18.0,
            "sodiumMg": 240.0
        },
        action="save_to_foods",
        notes="Reviewed and confirmed against packaging print by auditor"
    )
    review_res = await review_and_verify_label(
        label_id=label_id,
        payload=review_req,
        current_user=mock_user
    )
    assert review_res.success is True
    created_food_id = review_res.data["foodId"]
    assert created_food_id is not None
    print(f"✓ Human review & verification succeeded! Created Food ID: {created_food_id}")

    # Verify food in foods collection
    created_food = await db.foods.find_one({"_id": ObjectId(created_food_id)})
    assert created_food is not None
    assert created_food["name"] == "Verified Oat Crunch Biscuits"
    print(f"✓ Food record confirmed in foods collection with verificationStatus: '{created_food['verificationStatus']}'")

    # Verify audit log in audit_logs collection
    audit = await db.audit_logs.find_one({"labelId": ObjectId(label_id)})
    assert audit is not None
    assert audit["action"] == "save_to_foods"
    print(f"✓ Audit log record verified with timestamp: {audit['reviewedAt']}")

    # Clean test artifacts
    await db.foods.delete_one({"_id": ObjectId(created_food_id)})
    await db.food_labels.delete_one({"_id": ObjectId(label_id)})
    await db.label_extractions.delete_many({"labelId": ObjectId(label_id)})
    await db.audit_logs.delete_many({"labelId": ObjectId(label_id)})
    if os.path.exists(test_img_path): os.remove(test_img_path)
    if os.path.exists(proc_path): os.remove(proc_path)

    await close_mongo_connection()
    print("==================================================")
    print("ALL PHASE 5 FOOD LABEL OCR CHECKS PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_ocr_verification())
