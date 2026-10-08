"""
CivicPulse Photo Classifier Prediction

Provides a simple classify(image_path) function
that the backend can eventually import.
"""

from pathlib import Path

import numpy as np
import tensorflow as tf


IMAGE_SIZE = (224, 224)

MODEL_PATH = (
    Path(__file__).parent
    / "saved_model"
    / "civicpulse_classifier.keras"
)

CLASS_NAMES_PATH = (
    Path(__file__).parent
    / "saved_model"
    / "class_names.txt"
)


def load_model():
    """Load the trained CivicPulse model."""

    return tf.keras.models.load_model(
        MODEL_PATH
    )


def load_class_names():
    """Load the class names used during training."""

    with open(
        CLASS_NAMES_PATH,
        "r",
        encoding="utf-8",
    ) as file:

        return [
            line.strip()
            for line in file
            if line.strip()
        ]


def classify(image_path):
    """
    Classify a civic issue photo.

    Returns:
        {
            "category": "...",
            "confidence": 0.0
        }
    """

    model = load_model()

    class_names = load_class_names()

    image = tf.keras.utils.load_img(
        image_path,
        target_size=IMAGE_SIZE,
    )

    image_array = tf.keras.utils.img_to_array(
        image
    )

    image_array = tf.expand_dims(
        image_array,
        axis=0,
    )

    predictions = model.predict(
        image_array,
        verbose=0,
    )

    probabilities = predictions[0]

    predicted_index = int(
        np.argmax(probabilities)
    )

    confidence = float(
        probabilities[predicted_index]
    )

    return {
        "category": class_names[predicted_index],
        "confidence": round(
            confidence,
            4,
        ),
    }


if __name__ == "__main__":

    import sys

    if len(sys.argv) != 2:

        print(
            "Usage: python predict.py "
            "<image_path>"
        )

        raise SystemExit(1)

    image_path = sys.argv[1]

    result = classify(
        image_path
    )

    print(result)