from pathlib import Path
import csv
import html

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR.parent / "datasets" / "civicpulse_classifier"
ERRORS_FILE = BASE_DIR / "evaluation_errors.csv"
OUTPUT_FILE = BASE_DIR / "pothole_error_gallery.html"

with open(ERRORS_FILE, "r", encoding="utf-8-sig") as file:
    rows = [
        row for row in csv.DictReader(file)
        if row["actual"] == "pothole"
        and row["predicted"] == "water_leak"
    ]

cards = []

for row in rows:
    image_name = Path(row["image"]).name
    image_path = DATASET_DIR / "validation" / "pothole" / image_name

    if not image_path.exists():
        print(f"Missing image: {image_name}")
        continue

    cards.append(f"""
        <div class="card">
            <img src="{image_path.as_uri()}" alt="{html.escape(image_name)}">

            <div class="details">
                <h3>{html.escape(image_name)}</h3>
                <p>Actual: <strong>{row['actual']}</strong></p>
                <p>Predicted: <strong>{row['predicted']}</strong></p>
                <p>Confidence: <strong>{float(row['prediction_confidence']):.2%}</strong></p>
            </div>
        </div>
    """)

page = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CivicPulse - Classification Errors</title>

    <style>
        body {{
            font-family: Arial, sans-serif;
            background: #f3f4f6;
            margin: 0;
            padding: 25px;
        }}

        h1 {{
            text-align: center;
        }}

        .gallery {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 20px;
            max-width: 1400px;
            margin: 30px auto;
        }}

        .card {{
            background: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 2px 8px #00000015;
        }}

        img {{
            width: 100%;
            height: 240px;
            object-fit: contain;
            background: #e5e7eb;
        }}

        .details {{
            overflow-wrap: anywhere;
        }}
    </style>
</head>

<body>
    <h1>CivicPulse - Pothole Misclassifications</h1>

    <p style="text-align:center">
        Images incorrectly classified as water leaks: {len(cards)}
    </p>

    <div class="gallery">
        {''.join(cards)}
    </div>
</body>
</html>
"""

OUTPUT_FILE.write_text(page, encoding="utf-8")

print(f"Gallery created: {OUTPUT_FILE}")
print(f"Images included: {len(cards)}")