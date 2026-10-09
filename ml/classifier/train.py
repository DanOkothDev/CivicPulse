from pathlib import Path
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
num_classes = len(class_names)

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
        filepath=MODEL_DIR / "civicpulse_classifier.keras",
        monitor="val_accuracy",
        save_best_only=True,
    ),
]

MODEL_DIR.mkdir(parents=True, exist_ok=True)

print("\nStarting training...\n")
history = model.fit(
    train_dataset,
    validation_data=validation_dataset,
    epochs=EPOCHS,
    class_weight=class_weights,
    callbacks=callbacks,
)

# Save class names for inference mapping
with open(MODEL_DIR / "class_names.txt", "w", encoding="utf-8") as file:
    for class_name in class_names:
        file.write(f"{class_name}\n")

print("\nTraining complete.")
print(f"Model saved to: {MODEL_DIR / 'civicpulse_classifier.keras'}")