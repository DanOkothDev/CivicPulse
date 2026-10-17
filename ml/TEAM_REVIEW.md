# ML review handoff

Scope: classifier data preparation/training/inference, duplicate detection, and worker integration as inspected on 2026-10-17.

## Findings

### P1 — Classifier training cannot use the dataset currently in the repository

- Evidence: [classifier/train.py](./classifier/train.py) reads `datasets/civicpulse_classifier`, which is missing. The present prepared dataset is `datasets/civic_issues_classification`, created by [classifier/prepare_dataset.py](./classifier/prepare_dataset.py), and that directory is not used by training.
- Impact: the training command fails before model fitting; no classifier artifact can be generated from the checked-in prepared data.
- Action: choose one canonical dataset builder/output path and point training at it. Add a lightweight preflight that checks paths, classes, and nonempty train/validation splits.

### P1 — The current dataset labels do not match the classifier's category mapping

- Evidence: the prepared dataset contains `fallen_tree`, `garbage`, `pothole`, `streetlight`, and `water_leak`. [classifier/predict.py](./classifier/predict.py) has no mapping for `fallen_tree` and has no `drainage` class even though it maps `drainage` to category 3. `prepare_dataset.py` maps YOLO classes by taking the first sorted class ID and retains `fallen_tree` as a training class.
- Impact: some model predictions return `category_id: None` and are discarded by the backend; drainage is not represented in this dataset. The category list in the README does not describe the present data.
- Action: define a single explicit label-to-category mapping shared by the dataset builder, training output, inference code, and backend; reject unsupported labels before training and add tests for every output class.

### P1 — The alternate dataset builder silently omits unavailable source datasets and can produce empty classes

- Evidence: [classifier/build_classifier_dataset.py](./classifier/build_classifier_dataset.py) names `Water-Leak`, `Open-Drain`, and `Public-Facility` source directories that are absent from the repository. Missing sources become empty lists, while output directories are still created for all target classes. Training then computes class weights by dividing by each class count.
- Impact: the generated dataset may lack drainage/public-facility examples, and a zero-count class causes invalid class weights; no guard reports the missing source/classes clearly.
- Action: validate required source datasets and enforce nonempty train and validation samples for each trained class; do not advertise a class unless training and inference both support it.

### P1 — There is no checked-in trained model, and backend defaults do not activate the classifier

- Evidence: [classifier/predict.py](./classifier/predict.py) requires `classifier/saved_model/civicpulse_classifier.keras` and `class_names.txt`, neither of which is present in the inspected classifier folder. The backend worker only loads this function when `AI_CLASSIFIER` is configured, and the shipped example leaves it empty (see [backend handoff](../backend/TEAM_REVIEW.md)).
- Impact: enabling the hook as-is fails when inference attempts to load model resources; default report processing never attempts classification.
- Action: document a reproducible train/evaluate/export step, generate and validate artifacts before enabling the hook, and make model version/class names part of the deployment check.

### P2 — Classifier evaluation and class coverage are not guarded

- Evidence: training uses accuracy/validation loss but does not record a confusion matrix or per-class metrics; current prepared data is highly imbalanced (2,776 `fallen_tree` train images versus 61 `water_leak` images).
- Impact: aggregate accuracy can obscure poor performance on rare civic-issue classes, while the current label mismatch further undermines the reported model scope.
- Action: report per-class precision/recall and confusion matrix, define minimum per-class sample/metric gates, and only then enable automatic suggestions.

### P3 — Duplicate detector's script-mode sample printer reads the wrong result shape

- Evidence: [duplicates/detector.py](./duplicates/detector.py) stores `distance_meters` under `match["reasons"]`, but its `__main__` sample printer reads `match["distance_meters"]`.
- Impact: running the detector directly raises `KeyError` when it prints a match, despite the detector function and tests succeeding.
- Action: print `match["reasons"]["distance_meters"]` or flatten the result consistently; add a small script-mode/output-shape test.

## Validation

- The duplicate-detector test suite passed: 11 tests.
- Training/inference could not be run because the expected model artifacts and configured training dataset path are absent.
