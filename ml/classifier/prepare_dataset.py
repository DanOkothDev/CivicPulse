from pathlib import Path
import shutil


BASE_DIR = Path(__file__).resolve().parent
SOURCE_DIR = BASE_DIR.parent / "datasets" / "Civic-issues"
OUTPUT_DIR = BASE_DIR.parent / "datasets" / "civic_issues_classification"

SPLITS = {
    "train": "train",
    "valid": "validation",
}

CLASS_NAMES = [
    "fallen_tree",
    "garbage",
    "pothole",
    "streetlight",
    "water_leak",
]


def read_yolo_labels(label_file):
    """
    Read YOLO annotations.

    Each line has the format:

    class_id x_center y_center width height
    """

    class_ids = set()

    with open(label_file, "r", encoding="utf-8") as file:
        for line in file:
            parts = line.strip().split()

            if not parts:
                continue

            class_id = int(parts[0])
            class_ids.add(class_id)

    return class_ids


def prepare_split(source_split, output_split):
    images_dir = SOURCE_DIR / source_split / "images"
    labels_dir = SOURCE_DIR / source_split / "labels"

    output_dir = OUTPUT_DIR / output_split

    if not images_dir.exists():
        raise FileNotFoundError(
            f"Images directory not found: {images_dir}"
        )

    if not labels_dir.exists():
        raise FileNotFoundError(
            f"Labels directory not found: {labels_dir}"
        )

    for class_name in CLASS_NAMES:
        (output_dir / class_name).mkdir(
            parents=True,
            exist_ok=True
        )

    processed = 0
    skipped = 0

    for image_path in images_dir.iterdir():

        if image_path.suffix.lower() not in {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
        }:
            continue

        label_path = labels_dir / f"{image_path.stem}.txt"

        if not label_path.exists():
            skipped += 1
            continue

        class_ids = read_yolo_labels(label_path)

        if not class_ids:
            skipped += 1
            continue

        # If an image contains multiple objects,
        # use the first class for classification.
        class_id = sorted(class_ids)[0]

        if class_id >= len(CLASS_NAMES):
            skipped += 1
            continue

        class_name = CLASS_NAMES[class_id]

        destination = output_dir / class_name / image_path.name

        shutil.copy2(image_path, destination)

        processed += 1

    print(
        f"{source_split}: "
        f"{processed} images processed, "
        f"{skipped} skipped"
    )


def main():
    print("Preparing CivicPulse classification dataset...")
    print(f"Source: {SOURCE_DIR}")
    print(f"Output: {OUTPUT_DIR}")
    print()

    for source_split, output_split in SPLITS.items():
        prepare_split(source_split, output_split)

    print()
    print("Dataset preparation complete.")
    print(f"Classification dataset: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()