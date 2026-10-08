"""
CivicPulse Photo Classifier

Transfer-learning model based on MobileNetV2.
"""

import tensorflow as tf


IMAGE_SIZE = (224, 224)
NUM_CLASSES = 6


def build_model(num_classes=NUM_CLASSES):
    """
    Build a transfer-learning image classifier.

    MobileNetV2 provides pretrained visual features.
    A new classification head is trained for CivicPulse.
    """

    base_model = tf.keras.applications.MobileNetV2(
        input_shape=IMAGE_SIZE + (3,),
        include_top=False,
        weights="imagenet",
    )

    # Freeze the pretrained feature extractor initially.
    base_model.trainable = False

    inputs = tf.keras.Input(
        shape=IMAGE_SIZE + (3,)
    )

    x = tf.keras.applications.mobilenet_v2.preprocess_input(
        inputs
    )

    x = base_model(
        x,
        training=False,
    )

    x = tf.keras.layers.GlobalAveragePooling2D()(x)

    x = tf.keras.layers.Dropout(0.2)(x)

    outputs = tf.keras.layers.Dense(
        num_classes,
        activation="softmax",
    )(x)

    model = tf.keras.Model(
        inputs,
        outputs,
    )

    model.compile(
        optimizer=tf.keras.optimizers.Adam(
            learning_rate=0.0001
        ),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    return model