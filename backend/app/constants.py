ROLES = ('resident', 'verifier', 'authority', 'admin')
STATUSES = ('reported', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved')

KENYA_COUNTIES = (
    'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta', 'Garissa', 'Wajir', 'Mandera',
    'Marsabit', 'Isiolo', 'Meru', 'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua',
    'Nyeri', 'Kirinyaga', 'Murang\'a', 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans Nzoia',
    'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado',
    'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay',
    'Migori', 'Kisii', 'Nyamira', 'Nairobi'
)

DEFAULT_DEPARTMENTS = (
    'Roads & Public Works',
    'Water Services',
    'Environment & Sanitation',
    'Transport & Street Lighting',
)

DEPARTMENT_CATEGORY_MAP = {
    'Pothole': 'Roads & Public Works',
    'Streetlight': 'Transport & Street Lighting',
    'Drainage': 'Water Services',
    'Garbage': 'Environment & Sanitation',
    'Water leak': 'Water Services',
    'Public facility': 'Roads & Public Works',
}

# Allowed status moves (used by the workflow endpoints in Task 7).
TRANSITIONS = {
    'reported': {'verified', 'rejected'},
    'verified': {'assigned'},
    'assigned': {'in_progress'},
    'in_progress': {'resolved'},
    'rejected': set(),
    'resolved': set(),
}


def can_transition(old, new):
    return new in TRANSITIONS.get(old, set())


DEFAULT_CATEGORIES = [
    ('Pothole', 'pothole'), ('Streetlight', 'streetlight'), ('Drainage', 'drainage'),
    ('Garbage', 'garbage'), ('Water leak', 'water-leak'), ('Public facility', 'facility'),
]

# These are the only classes currently represented in the production model.
# Resolve names against the database at runtime; category IDs are not model indices.
CLASSIFIER_CATEGORY_NAMES = {
    'garbage': 'Garbage',
    'pothole': 'Pothole',
    'streetlight': 'Streetlight',
    'water_leak': 'Water leak',
    'drainage': 'Drainage',
    'public_facility': 'Public facility',
}

# Who may make each status move. Moving to 'assigned' happens through the assign
# endpoint (Task 14), because it needs an assignee.
TRANSITION_ROLES = {
    ('reported', 'verified'): {'verifier', 'admin'},
    ('reported', 'rejected'): {'verifier', 'admin'},
    ('verified', 'assigned'): {'verifier', 'authority', 'admin'},
    ('assigned', 'in_progress'): {'authority', 'admin'},
    ('in_progress', 'resolved'): {'authority', 'admin'},
}