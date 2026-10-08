"""
CivicPulse Photo Classifier Training

Trains a MobileNetV2 transfer-learning model
on a directory-based civic issue dataset.
"""

from pathlib import Path

import tensorflow as tf

from model import build_model


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATASET_DIR = (
    BASE_DIR.parent
    / "datasets"
    / "civic_issues"
)

MODEL_DIR = BASE_DIR / "saved_model"

IMAGE_SIZE = (224, 224)

BATCH_SIZE = 32

EPOCHS = 10

SEED = 42


# ============================================================
# LOAD DATA
# ============================================================

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

print("\nClasses:")
for index, class_name in enumerate(class_names):
    print(f"{index}: {class_name}")


# Improve input pipeline performance.
AUTOTUNE = tf.data.AUTOTUNE

train_dataset = train_dataset.prefetch(
    buffer_size=AUTOTUNE
)

validation_dataset = validation_dataset.prefetch(
    buffer_size=AUTOTUNE
)


# ============================================================
# BUILD MODEL
# ============================================================

model = build_model(
    num_classes=len(class_names)
)


model.summary()


# ============================================================
# TRAIN
# ============================================================

print("\nStarting training...\n")


history = model.fit(
    train_dataset,
    validation_data=validation_dataset,
    epochs=EPOCHS,
)


# ============================================================
# SAVE MODEL
# ============================================================

MODEL_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

model.save(MODEL_DIR / "civicpulse_classifier.keras")


# Save class names for prediction.
with open(
    MODEL_DIR / "class_names.txt",
    "w",
    encoding="utf-8",
) as file:

    for class_name in class_names:
        file.write(
            f"{class_name}\n"
        )


print("\nTraining complete.")

print(
    f"Model saved to: "
    f"{MODEL_DIR / 'civicpulse_classifier.keras'}"
)

print(
    f"Classes saved to: "
    f"{MODEL_DIR / 'class_names.txt'}"
)