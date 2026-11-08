from pathlib import Path
import csv
import numpy as np
import tensorflow as tf

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR.parent / "datasets" / "civicpulse_classifier"
MODEL_DIR = BASE_DIR / "saved_model"

MODEL_PATH = MODEL_DIR / "civicpulse_classifier.keras"
CLASS_NAMES_PATH = MODEL_DIR / "class_names.txt"

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32

with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as file:
    class_names = [line.strip() for line in file if line.strip()]

dataset = tf.keras.utils.image_dataset_from_directory(
    DATASET_DIR / "validation",
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False,
)

model = tf.keras.models.load_model(MODEL_PATH)

y_true = np.concatenate([
    labels.numpy() for _, labels in dataset
])

probabilities = model.predict(dataset, verbose=1)
y_pred = np.argmax(probabilities, axis=1)

image_paths = dataset.file_paths

output_path = BASE_DIR / "evaluation_errors.csv"

errors = []

for index, (actual, predicted) in enumerate(zip(y_true, y_pred)):
    if actual != predicted:
        errors.append({
            "image": image_paths[index],
            "actual": class_names[actual],
            "predicted": class_names[predicted],
            "prediction_confidence": round(
                float(probabilities[index][predicted]), 4
            ),
            "actual_class_probability": round(
                float(probabilities[index][actual]), 4
            ),
        })

with open(output_path, "w", newline="", encoding="utf-8") as file:
    writer = csv.DictWriter(file, fieldnames=errors[0].keys())
    writer.writeheader()
    writer.writerows(errors)

print(f"\nMisclassified images: {len(errors)}")
print(f"Results saved to: {output_path}")

print("\nMISCLASSIFICATION SUMMARY")

for error in errors:
    print(
        f"{error['actual']} -> {error['predicted']} | "
        f"{Path(error['image']).name} | "
        f"confidence: {error['prediction_confidence']}"
    )