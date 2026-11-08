from pathlib import Path
import numpy as np
import tensorflow as tf

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
)

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR.parent / "datasets" / "civicpulse_classifier"
MODEL_DIR = BASE_DIR / "saved_model"

MODEL_PATH = MODEL_DIR / "civicpulse_classifier.keras"
CLASS_NAMES_PATH = MODEL_DIR / "class_names.txt"

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32

# Load class names
with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as file:
    class_names = [line.strip() for line in file if line.strip()]

# Load validation dataset
validation_dataset = tf.keras.utils.image_dataset_from_directory(
    DATASET_DIR / "validation",
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False,
)

if validation_dataset.class_names != class_names:
    raise ValueError("Dataset class order does not match class_names.txt")

# Load trained model
model = tf.keras.models.load_model(MODEL_PATH)

if model.output_shape[-1] != len(class_names):
    raise ValueError("Model output count does not match class names")

# Collect actual labels
y_true = np.concatenate([
    labels.numpy() for _, labels in validation_dataset
])

# Generate predictions
predictions = model.predict(validation_dataset, verbose=1)
y_pred = np.argmax(predictions, axis=1)

# Calculate metrics
accuracy = accuracy_score(y_true, y_pred)

print("\nVALIDATION RESULTS")
print("==================")
print(f"Accuracy: {accuracy:.4f}")

print("\nCLASSIFICATION REPORT")
print("=====================")

print(classification_report(
    y_true,
    y_pred,
    target_names=class_names,
    zero_division=0,
))

print("\nCONFUSION MATRIX")
print("================")

matrix = confusion_matrix(
    y_true,
    y_pred,
    labels=range(len(class_names)),
)

print("Class order:", class_names)
print(matrix)