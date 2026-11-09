from pathlib import Path
import numpy as np
import tensorflow as tf

IMAGE_SIZE = (224, 224)
MODEL_PATH = Path(__file__).parent / "saved_model" / "civicpulse_classifier.keras"
CLASS_NAMES_PATH = Path(__file__).parent / "saved_model" / "class_names.txt"

# Classifier outputs map to database category names, never database IDs.
CATEGORY_NAME_MAP = {
    "garbage": "Garbage",
    "pothole": "Pothole",
    "streetlight": "Streetlight",
    "water_leak": "Water leak",
    "drainage": "Drainage",
    "public_facility": "Public facility",
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

        if not _CLASS_NAMES or len(set(_CLASS_NAMES)) != len(_CLASS_NAMES):
            raise ValueError(
                f"Unexpected classifier classes: {_CLASS_NAMES}"
            )

        if _MODEL.output_shape[-1] != len(_CLASS_NAMES):
            raise ValueError(
                "Model output count does not match class_names.txt"
            )

def classify(photo_path):
    """
    Classifies a civic issue photo.
    Returns the model's class name and confidence; the backend resolves the
    mapped category name against the current category table.
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
    return {
        "class_name": predicted_name,
        "category": CATEGORY_NAME_MAP.get(predicted_name),
        "confidence": round(confidence, 4),
    }

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python predict.py <image_path>")
        raise SystemExit(1)
    result = classify(sys.argv[1])
    print(result)