from pathlib import Path
import argparse
import numpy as np
import tensorflow as tf

from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR.parent / "datasets" / "civicpulse_classifier"
MODEL_DIR = BASE_DIR / "saved_model"

parser = argparse.ArgumentParser(description="Evaluate a classifier or a versioned candidate.")
parser.add_argument(
    "--model-dir",
    type=Path,
    default=MODEL_DIR,
    help="Model directory to evaluate (default: current production model).",
)
parser.add_argument(
    "--baseline-dir",
    type=Path,
    default=MODEL_DIR,
    help="Production model directory used for candidate comparison.",
)
args = parser.parse_args()

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32

with open(args.model_dir / "class_names.txt", "r", encoding="utf-8") as file:
    class_names = [line.strip() for line in file if line.strip()]

validation_dataset = tf.keras.utils.image_dataset_from_directory(
    DATASET_DIR / "validation",
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False,
)

if validation_dataset.class_names != class_names:
    raise ValueError("Dataset class order does not match class_names.txt")

model = tf.keras.models.load_model(args.model_dir / "civicpulse_classifier.keras")
if model.output_shape[-1] != len(class_names):
    raise ValueError("Model output count does not match class names")

y_true = np.concatenate([labels.numpy() for _, labels in validation_dataset])
predictions = model.predict(validation_dataset, verbose=1)
y_pred = np.argmax(predictions, axis=1)
accuracy = accuracy_score(y_true, y_pred)

print("\nVALIDATION RESULTS")
print("==================")
print(f"Accuracy: {accuracy:.4f}")
print("\nCLASSIFICATION REPORT")
print("=====================")
print(classification_report(
    y_true, y_pred, target_names=class_names, zero_division=0,
))
matrix = confusion_matrix(y_true, y_pred, labels=range(len(class_names)))
print("\nCONFUSION MATRIX")
print("================")
print("Class order:", class_names)
print(matrix)

if args.model_dir.resolve() != args.baseline_dir.resolve():
    with open(args.baseline_dir / "class_names.txt", "r", encoding="utf-8") as file:
        baseline_classes = [line.strip() for line in file if line.strip()]
    baseline = tf.keras.models.load_model(
        args.baseline_dir / "civicpulse_classifier.keras"
    )
    if baseline.output_shape[-1] != len(baseline_classes):
        raise ValueError("Baseline model output count does not match its class names")

    image_batches = [images.numpy() for images, _ in validation_dataset]
    validation_images = np.concatenate(image_batches)
    shared_classes = [name for name in class_names if name in baseline_classes]
    if not shared_classes:
        raise ValueError("Candidate and baseline have no validation classes in common")
    shared_indices = [class_names.index(name) for name in shared_classes]
    shared_mask = np.isin(y_true, shared_indices)
    if not shared_mask.any():
        raise ValueError("Validation data has no examples for classes shared with the baseline")

    shared_images = validation_images[shared_mask]
    expected_names = np.array([class_names[index] for index in y_true[shared_mask]])
    candidate_output = model.predict(shared_images, verbose=0)
    baseline_output = baseline.predict(shared_images, verbose=0)
    candidate_names = np.array([
        class_names[index] for index in np.argmax(candidate_output, axis=1)
    ])
    baseline_names = np.array([
        baseline_classes[index] for index in np.argmax(baseline_output, axis=1)
    ])
    candidate_accuracy = np.mean(candidate_names == expected_names)
    baseline_accuracy = np.mean(baseline_names == expected_names)

    print("\nBASELINE COMPARISON (shared classes)")
    print("====================================")
    print(f"Candidate accuracy: {candidate_accuracy:.4f}")
    print(f"Production accuracy: {baseline_accuracy:.4f}")
    if candidate_accuracy < baseline_accuracy:
        raise SystemExit("Candidate failed the no-regression criterion; do not deploy it.")
    print("Candidate meets the no-regression criterion on shared classes.")
