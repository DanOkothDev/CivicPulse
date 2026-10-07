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

# Who may make each status move. Moving to 'assigned' happens through the assign
# endpoint (Task 14), because it needs an assignee.
TRANSITION_ROLES = {
    ('reported', 'verified'): {'verifier', 'admin'},
    ('reported', 'rejected'): {'verifier', 'admin'},
    ('verified', 'assigned'): {'verifier', 'authority', 'admin'},
    ('assigned', 'in_progress'): {'authority', 'admin'},
    ('in_progress', 'resolved'): {'authority', 'admin'},
}