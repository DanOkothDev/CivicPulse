from pathlib import Path
import hashlib
import random
import shutil


BASE_DIR = Path(__file__).resolve().parent
DATASETS_DIR = BASE_DIR.parent / "datasets"
OUTPUT_DIR = DATASETS_DIR / "civicpulse_classifier"

SEED = 42
VALIDATION_RATIO = 0.20

# We don't want thousands of examples from one class
# overwhelming the smaller classes.
MAX_TRAIN_PER_CLASS = 1000

TARGET_CLASSES = {
    "pothole": "pothole",
    "garbage": "garbage",
    "streetlight": "streetlight",
    "water_leak": "water_leak",
    "open_drain": "drainage",
    "public facility": "public_facility",
}

CLASS_IDS = {
    "Civic-issues": {
        "fallen_tree": None,
        "garbage": 1,
        "pothole": 2,
        "streetlight": 3,
        "water_leak": 4,
    },
    "Water-Leak": {
        "water_leak": 0,
    },
    "Open-Drain": {
        "open_drain": 1,
        "pothole": 3,
    },
    "Public-Facility": {
        "public facility": 6,
    },
}


def image_hash(path):
    """Return a SHA-256 hash of an image."""
    sha = hashlib.sha256()

    with open(path, "rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            sha.update(chunk)

    return sha.hexdigest()


def read_labels(label_path):
    """Return the set of YOLO class IDs in a label file."""
    class_ids = set()

    if not label_path.exists():
        return class_ids

    with open(label_path, "r", encoding="utf-8") as file:
        for line in file:
            parts = line.strip().split()

            if not parts:
                continue

            try:
                class_ids.add(int(parts[0]))
            except ValueError:
                continue

    return class_ids


def find_class_for_image(dataset_name, label_path):
    """
    Determine which CivicPulse category an image belongs to.

    We only accept images containing exactly one relevant
    CivicPulse class.
    """

    class_ids = read_labels(label_path)

    if not class_ids:
        return None

    mapping = CLASS_IDS[dataset_name]

    matching_classes = []

    for source_class, class_id in mapping.items():
        if class_id is not None and class_id in class_ids:
            target_class = TARGET_CLASSES[source_class]
            matching_classes.append(target_class)

    # Reject images containing multiple relevant classes.
    if len(set(matching_classes)) != 1:
        return None

    return matching_classes[0]


def collect_images(dataset_name, source_split):
    """
    Collect image/class pairs from a YOLO dataset split.
    """

    dataset_dir = DATASETS_DIR / dataset_name
    images_dir = dataset_dir / source_split / "images"
    labels_dir = dataset_dir / source_split / "labels"

    if not images_dir.exists() or not labels_dir.exists():
        return []

    results = []

    for image_path in images_dir.iterdir():

        if image_path.suffix.lower() not in {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
        }:
            continue

        label_path = labels_dir / f"{image_path.stem}.txt"

        target_class = find_class_for_image(
            dataset_name,
            label_path,
        )

        if target_class is None:
            continue

        results.append((image_path, target_class))

    return results


def prepare_output():
    """Create a clean output directory."""

    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)

    for split in ["train", "validation"]:
        for class_name in TARGET_CLASSES.values():
            (OUTPUT_DIR / split / class_name).mkdir(
                parents=True,
                exist_ok=True,
            )


def split_open_drain():
    """
    Open-Drain only has train/ physically available.

    Create a deterministic 80/20 split.
    """

    images = collect_images("Open-Drain", "train")

    random.Random(SEED).shuffle(images)

    split_index = int(len(images) * (1 - VALIDATION_RATIO))

    return (
        images[:split_index],
        images[split_index:],
    )


def copy_images(
    items,
    split,
    seen_hashes,
    class_counts,
):
    """Copy images while avoiding duplicate image content."""

    copied = 0
    duplicates = 0

    for image_path, target_class in items:

        # Don't allow majority classes to dominate.
        if (
            split == "train"
            and class_counts[target_class] >= MAX_TRAIN_PER_CLASS
        ):
            continue

        file_hash = image_hash(image_path)

        if file_hash in seen_hashes:
            duplicates += 1
            continue

        seen_hashes.add(file_hash)

        destination_dir = (
            OUTPUT_DIR
            / split
            / target_class
        )

        # Include dataset name in filename so names cannot collide.
        destination = (
            destination_dir
            / f"{image_path.parent.parent.parent.name}_{image_path.name}"
        )

        shutil.copy2(image_path, destination)

        class_counts[target_class] += 1
        copied += 1

    return copied, duplicates


def main():

    print("=" * 60)
    print("CivicPulse Six-Class Dataset Builder")
    print("=" * 60)
    print()

    prepare_output()

    train_items = []
    validation_items = []

    # ---------------------------------------------------------
    # Civic-issues
    # ---------------------------------------------------------

    print("Reading Civic-issues...")

    train_items.extend(
        collect_images("Civic-issues", "train")
    )

    validation_items.extend(
        collect_images("Civic-issues", "valid")
    )

    # ---------------------------------------------------------
    # Water-Leak
    # ---------------------------------------------------------

    print("Reading Water-Leak...")

    train_items.extend(
        collect_images("Water-Leak", "train")
    )

    validation_items.extend(
        collect_images("Water-Leak", "valid")
    )

    # ---------------------------------------------------------
    # Public-Facility
    # ---------------------------------------------------------

    print("Reading Public-Facility...")

    train_items.extend(
        collect_images("Public-Facility", "train")
    )

    validation_items.extend(
        collect_images("Public-Facility", "valid")
    )

    # ---------------------------------------------------------
    # Open-Drain
    # ---------------------------------------------------------

    print("Reading Open-Drain...")

    drainage_train, drainage_validation = split_open_drain()

    train_items.extend(drainage_train)
    validation_items.extend(drainage_validation)

    print()
    print(f"Candidate training images: {len(train_items)}")
    print(f"Candidate validation images: {len(validation_items)}")
    print()

    # ---------------------------------------------------------
    # Copy / deduplicate / balance
    # ---------------------------------------------------------

    seen_hashes = set()

    train_counts = {
        class_name: 0
        for class_name in TARGET_CLASSES.values()
    }

    validation_counts = {
        class_name: 0
        for class_name in TARGET_CLASSES.values()
    }

    random.Random(SEED).shuffle(train_items)
    random.Random(SEED).shuffle(validation_items)

    train_copied, train_duplicates = copy_images(
        train_items,
        "train",
        seen_hashes,
        train_counts,
    )

    validation_copied, validation_duplicates = copy_images(
        validation_items,
        "validation",
        seen_hashes,
        validation_counts,
    )

    print("=" * 60)
    print("RESULT")
    print("=" * 60)

    print()
    print("Training:")
    for class_name, count in train_counts.items():
        print(f"  {class_name}: {count}")

    print()
    print("Validation:")
    for class_name, count in validation_counts.items():
        print(f"  {class_name}: {count}")

    print()
    print(f"Training images copied: {train_copied}")
    print(f"Validation images copied: {validation_copied}")
    print(f"Duplicate images skipped: {train_duplicates + validation_duplicates}")

    print()
    print(f"Output directory:")
    print(OUTPUT_DIR)


if __name__ == "__main__":
    main()