ROLES = ('resident', 'verifier', 'authority', 'admin')
STATUSES = ('reported', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved')

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
