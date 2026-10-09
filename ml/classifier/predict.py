from pathlib import Path
import numpy as np
import tensorflow as tf

IMAGE_SIZE = (224, 224)
MODEL_PATH = Path(__file__).parent / "saved_model" / "civicpulse_classifier.keras"
CLASS_NAMES_PATH = Path(__file__).parent / "saved_model" / "class_names.txt"

# Mapping dataset directory names to backend Category IDs (from constants.py seeding order)
CATEGORY_ID_MAP = {
    "pothole": 1,
    "streetlight": 2,
    "drainage": 3,
    "garbage": 4,
    "water_leak": 5,
    "public_facility": 6,
}

_MODEL = None
_CLASS_NAMES = None

def load_resources():
    global _MODEL, _CLASS_NAMES
    if _MODEL is None:
        _MODEL = tf.keras.models.load_model(MODEL_PATH)
    if _CLASS_NAMES is None:
        with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as file:
            _CLASS_NAMES = [line.strip() for line in file if line.strip()]

def classify(photo_path):
    """
    Classifies a civic issue photo.
    Returns: {"category_id": int, "confidence": float}
    """
    load_resources()

    image = tf.keras.utils.load_img(photo_path, target_size=IMAGE_SIZE)
    image_array = tf.keras.utils.img_to_array(image)
    image_array = tf.expand_dims(image_array, axis=0)

    predictions = _MODEL.predict(image_array, verbose=0)
    probabilities = predictions[0]
    predicted_index = int(np.argmax(probabilities))
    confidence = float(probabilities[predicted_index])

    predicted_name = _CLASS_NAMES[predicted_index]
    category_id = CATEGORY_ID_MAP.get(predicted_name)

    return {
        "category_id": category_id,
        "confidence": round(confidence, 4),
    }

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python predict.py <image_path>")
        raise SystemExit(1)
    result = classify(sys.argv[1])
    print(result)