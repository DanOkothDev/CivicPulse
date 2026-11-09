# CivicPulse Photo Classifier

The current model has four classes, listed in `saved_model/class_names.txt`:
`garbage`, `pothole`, `streetlight`, and `water_leak`. It does not predict
Drainage or Public facility. Explicit name mappings are ready for
`drainage` and `public_facility` when those classes are added to training;
mapping a name alone does not make it a model prediction. The backend resolves
predicted names against the live category table; model indices are never
database category IDs.

`classify(photo_path)` returns `class_name`, a mapped database `category` name
(or `null` for an unmapped class), and a confidence from 0 to 1. The resident
UI only shows supported suggestions at 60% confidence or higher. Lower
confidence, unsupported classes, or unavailable inference leave manual
category selection available.

## Reviewed feedback and candidate training

Resident corrections and accepted predictions are stored against the report,
with a reference to its existing image. All feedback starts as pending. Only
authorized verifiers/admins can approve it; only approved records are marked
training-eligible.

From `backend/`, export reviewed pairs to a CSV without copying report photos:

```powershell
flask --app wsgi export-approved-feedback --output ..\ml\classifier\approved-feedback.csv
```

Train a candidate using the baseline dataset plus the approved examples:

```powershell
python ml\classifier\train.py --feedback-manifest ml\classifier\approved-feedback.csv
```

Feedback labels must already have class folders in both the classifier's
training and validation splits. This ensures newly supported labels such as
Drainage and Public facility have curated training and holdout examples before
they can enter a model candidate. Approved feedback augments training only; it
is never copied into the validation split.

Training writes to a new timestamped directory under `saved_model/versions/`;
it never overwrites the active model. Evaluate a candidate against the current
production model:

```powershell
python ml\classifier\evaluate.py --model-dir ml\classifier\saved_model\versions\<candidate>
```

Evaluation reports full validation metrics and compares accuracy on classes
shared with production. A candidate below production on shared classes exits
as a failure. No training or feedback submission deploys a model automatically.
Promote a candidate only after reviewing the complete validation results and
release criteria.