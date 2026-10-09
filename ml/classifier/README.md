# CivicPulse Photo Classifier

## Supported Categories & Database Mapping
- **Pothole:** `category_id`: 1
- **Streetlight:** `category_id`: 2
- **Drainage:** `category_id`: 3
- **Garbage:** `category_id`: 4
- **Water Leak:** `category_id`: 5

## Dataset Sources & Limitations
- **Active Model:** Trained on 5 categories using MobileNetV2 transfer learning.
- **Exclusions:** `public_facility` (`category_id`: 6) was excluded from training due to insufficient training samples (1 train image, 0 validation images).
- **Backend Contract:** `classify(photo_path)` returns `{"category_id": int, "confidence": float}`.