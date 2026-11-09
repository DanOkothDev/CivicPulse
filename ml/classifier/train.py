from pathlib import Path
from datetime import datetime
import argparse
import csv
import numpy as np
import tensorflow as tf
from model import build_model

# ============================================================ #
# CONFIGURATION
# ============================================================ #
BASE_DIR = Path(__file__).resolve().parent
# Correct dataset folder name
DATASET_DIR = BASE_DIR.parent / "datasets" / "civicpulse_classifier"
MODEL_DIR = BASE_DIR / "saved_model"
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 15
SEED = 42

parser = argparse.ArgumentParser(description="Train a versioned classifier candidate.")
parser.add_argument(
    "--candidate-dir",
    type=Path,
    help="Output directory for this candidate (defaults to a timestamped version directory).",
)
parser.add_argument(
    "--feedback-manifest",
    type=Path,
    help="Optional CSV from export-approved-feedback; examples are added to training only.",
)
args = parser.parse_args()
OUTPUT_DIR = args.candidate_dir or (
    MODEL_DIR / "versions" / datetime.now().strftime("%Y%m%d-%H%M%S")
)

# ============================================================ #
# LOAD DATA
# ============================================================ #
train_directory = DATASET_DIR / "train"
validation_directory = DATASET_DIR / "validation"

train_dataset = tf.keras.utils.image_dataset_from_directory(
    train_directory,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=True,
    seed=SEED,
)

validation_dataset = tf.keras.utils.image_dataset_from_directory(
    validation_directory,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False,
)

class_names = train_dataset.class_names
if validation_dataset.class_names != class_names:
    raise ValueError("Training and validation folders must contain the same class directories")
num_classes = len(class_names)

if args.feedback_manifest:
    feedback_paths = []
    feedback_labels = []
    class_indices = {name: index for index, name in enumerate(class_names)}
    with args.feedback_manifest.open(newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            image_path = Path(row["image_path"])
            label = row["label"].strip().lower().replace(" ", "_").replace("-", "_")
            if label not in class_indices:
                raise ValueError(
                    f"Feedback label {row['label']!r} is not in the training class folders. "
                    "Add reviewed training and validation examples for that class first."
                )
            if not image_path.is_file():
                raise FileNotFoundError(f"Feedback image is missing: {image_path}")
            feedback_paths.append(str(image_path))
            feedback_labels.append(class_indices[label])

    if feedback_paths:
        feedback_dataset = tf.data.Dataset.from_tensor_slices((
            feedback_paths, feedback_labels,
        ))

        def load_feedback_image(path, label):
            image = tf.io.decode_image(
                tf.io.read_file(path), channels=3, expand_animations=False,
            )
            image = tf.image.resize(image, IMAGE_SIZE)
            return image, label

        feedback_dataset = (
            feedback_dataset
            .map(load_feedback_image, num_parallel_calls=tf.data.AUTOTUNE)
            .shuffle(len(feedback_paths), seed=SEED)
            .batch(BATCH_SIZE)
        )
        train_dataset = train_dataset.concatenate(feedback_dataset)
        print(f"Added {len(feedback_paths)} approved feedback examples to training.")

OUTPUT_DIR.mkdir(parents=True, exist_ok=False)

with open(OUTPUT_DIR / "class_names.txt", "w", encoding="utf-8") as file:
    for class_name in class_names:
        file.write(f"{class_name}\n")

print("\nClasses:")
for index, class_name in enumerate(class_names):
    print(f"{index}: {class_name}")

# Calculate class weights for imbalanced classes
class_counts = []
for _, labels in train_dataset.unbatch():
    class_counts.append(labels.numpy())
counts = np.bincount(class_counts)
total_samples = len(class_counts)
class_weights = {i: total_samples / (num_classes * counts[i]) for i in range(num_classes)}

print("\nClass weights:")
for index, class_name in enumerate(class_names):
    print(f"{class_name}: {counts[index]} images, weight={class_weights[index]:.4f}")

AUTOTUNE = tf.data.AUTOTUNE
train_dataset = train_dataset.prefetch(buffer_size=AUTOTUNE)
validation_dataset = validation_dataset.prefetch(buffer_size=AUTOTUNE)

# ============================================================ #
# BUILD & TRAIN MODEL
# ============================================================ #
model = build_model(num_classes=num_classes)

callbacks = [
    tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=3, restore_best_weights=True),
    tf.keras.callbacks.ModelCheckpoint(
        filepath=OUTPUT_DIR / "civicpulse_classifier.keras",
        monitor="val_accuracy",
        save_best_only=True,
    ),
]

print("\nStarting training...\n")
history = model.fit(
    train_dataset,
    validation_data=validation_dataset,
    epochs=EPOCHS,
    class_weight=class_weights,
    callbacks=callbacks,
)

print("\nTraining complete.")
print(f"Candidate model saved to: {OUTPUT_DIR / 'civicpulse_classifier.keras'}")