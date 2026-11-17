import cv2
import numpy as np
from PIL import Image
import os
import logging

logger = logging.getLogger("nutritrack")

def preprocess_label_image(image_path: str) -> str:
    """
    Computer Vision Preprocessing Pipeline for Food Nutrition Labels:
    1. Loads image with OpenCV
    2. Converts to Grayscale
    3. CLAHE (Contrast Limited Adaptive Histogram Equalization) for uneven label lighting
    4. Bilateral filter for noise reduction while keeping text boundaries sharp
    5. Otsu's thresholding for crisp binarization
    6. Orientation deskewing if text lines are angled
    Returns path to preprocessed image.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Label image not found at {image_path}")

    img = cv2.imread(image_path)
    if img is None:
        # Try PIL fallback
        pil_img = Image.open(image_path).convert("RGB")
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    # 1. Grayscale conversion
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 2. CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    contrast_enhanced = clahe.apply(gray)

    # 3. Bilateral filter (smooth noise, retain sharp character edges)
    denoised = cv2.bilateralFilter(contrast_enhanced, d=9, sigmaColor=75, sigmaSpace=75)

    # 4. Otsu's automatic thresholding
    _, binarized = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # 5. Deskewing
    coords = np.column_stack(np.where(binarized == 0))
    if len(coords) > 50:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        else:
            angle = -angle

        # Only deskew if slight tilt detected (< 15 degrees)
        if abs(angle) > 0.5 and abs(angle) < 15.0:
            (h, w) = binarized.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            binarized = cv2.warpAffine(
                binarized, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
            )

    base, ext = os.path.splitext(image_path)
    processed_path = f"{base}_preprocessed{ext}"
    cv2.imwrite(processed_path, binarized)
    logger.info(f"Label image preprocessed successfully: {processed_path}")
    return processed_path
