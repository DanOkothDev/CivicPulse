import json

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import func

from ..auth_utils import current_user, login_required, user_can_access_report
from ..civicai import respond
from ..constants import TRANSITION_ROLES, can_transition
from ..errors import ApiError
from ..extensions import db
from ..models import Category, County, Report, User

bp = Blueprint('civicai', __name__)

TOOL_SCHEMAS = {
    'get_report_categories': {
        'type': 'function', 'name': 'get_report_categories', 'description': 'List valid report categories.',
        'strict': True, 'parameters': {'type': 'object', 'properties': {}, 'required': [], 'additionalProperties': False},
    },
    'get_my_reports': {
        'type': 'function', 'name': 'get_my_reports', 'description': 'List reports the authenticated user may access.',
        'strict': True, 'parameters': {'type': 'object', 'properties': {}, 'required': [], 'additionalProperties': False},
    },
    'start_guided_tour': {
        'type': 'function', 'name': 'start_guided_tour', 'description': 'Start an application walkthrough for the user role.',
        'strict': True, 'parameters': {'type': 'object', 'properties': {}, 'required': [], 'additionalProperties': False},
    },
    'get_permitted_analytics': {
        'type': 'function', 'name': 'get_permitted_analytics', 'description': 'Retrieve the signed-in user role permitted aggregate analytics.',
        'strict': True, 'parameters': {'type': 'object', 'properties': {}, 'required': [], 'additionalProperties': False},
    },
    'get_user_counts': {
        'type': 'function', 'name': 'get_user_counts',
        'description': 'Get live aggregate user account counts within the authenticated role scope. Use for questions about how many users, residents, staff, or accounts are registered. Returns counts only, never names or contact details.',
        'strict': True, 'parameters': {'type': 'object', 'properties': {}, 'required': [], 'additionalProperties': False},
    },
    'search_residents': {
        'type': 'function', 'name': 'search_residents',
        'description': 'For an administrator only: find resident accounts by name and/or county within the administrator county or national scope. May return the same account fields visible in the admin user directory: resident name, email, county, ID, and total submitted report count. Use county with null name to list residents in a county; use name with null county to search nationally or within the admin county.',
        'strict': True, 'parameters': {'type': 'object', 'properties': {
            'name': {'type': ['string', 'null'], 'maxLength': 120},
            'county': {'type': ['string', 'null'], 'maxLength': 120},
        }, 'required': ['name', 'county'], 'additionalProperties': False},
    },
    'get_report_resident': {
        'type': 'function', 'name': 'get_report_resident',
        'description': 'For an administrator only: retrieve the display name of the resident who submitted a report, if the report is in the administrator authorized scope. Never returns contact details.',
        'strict': True, 'parameters': {'type': 'object', 'properties': {
            'report_id': {'type': 'integer'},
        }, 'required': ['report_id'], 'additionalProperties': False},
    },
    'prepare_user_role_change': {
        'type': 'function', 'name': 'prepare_user_role_change',
        'description': 'Prepare an administrator-authorized user role change for explicit confirmation. Does not change the role. Use a resident ID returned by search_residents or already established in conversation.',
        'strict': True, 'parameters': {'type': 'object', 'properties': {
            'user_id': {'type': 'integer'},
            'role': {'type': 'string', 'enum': ['resident', 'verifier', 'authority', 'admin']},
        }, 'required': ['user_id', 'role'], 'additionalProperties': False},
    },
    'start_report_submission': {
        'type': 'function', 'name': 'start_report_submission', 'description': 'Begin the resident report form inside the CivicAI conversation.',
        'strict': True, 'parameters': {'type': 'object', 'properties': {
            'category_name': {'type': ['string', 'null']},
            'description': {'type': ['string', 'null']},
        }, 'required': ['category_name', 'description'], 'additionalProperties': False},
    },
    'prepare_status_change': {
        'type': 'function', 'name': 'prepare_status_change',
        'description': 'Prepare an authorized report status change for explicit user confirmation. Does not change the status.',
        'strict': True, 'parameters': {'type': 'object', 'properties': {
            'report_id': {'type': 'integer'},
            'status': {'type': 'string', 'enum': ['verified', 'rejected', 'in_progress', 'resolved']},
            'note': {'type': ['string', 'null']},
        }, 'required': ['report_id', 'status', 'note'], 'additionalProperties': False},
    },
}


def _instructions(user):
    return (
        'You are CivicAI, the helpful assistant inside CivicPulse. The authenticated user role is '
        f'{user.role}. Never claim an action occurred unless a tool result confirms it. Never ask for passwords, '
        'email, phone, or unnecessary personal data. Passwords, password hashes, API keys, tokens, and other '
        'credentials are never available for disclosure. Administrators may retrieve resident directory fields '
        'through the provided lookup tool, within their authorized county or national scope. '
        'You may only use the provided tools. Use the relevant '
        'data tool to answer factual CivicPulse questions; do not claim data is unavailable when an authorized '
        'tool can retrieve it. For administrator questions about a resident name, county, email, or submitted '
        'report count, use search_residents. To find the resident in a named county, pass null for name and '
        'the county name. For requested role changes, prepare the change and wait for explicit confirmation. '
        'Only report data returned by tools and respect the tool result scope. '
        'For report submission, call start_report_submission for a resident and map the issue to an '
        'existing category name only when clear; use null when uncertain. Pass a concise description '
        'only when the resident supplied one. The interface collects photo/location and asks before sending. '
        'Keep answers concise and safe.'
    )


def _execute(name, user, args=None):
    args = args or {}
    if name == 'get_report_categories':
        return [{'id': c.id, 'name': c.name} for c in Category.query.order_by(Category.name).all()]
    if name == 'get_my_reports':
        q = Report.query
        if user.role == 'resident':
            q = q.filter(Report.created_by == user.id)
        elif user.role in {'verifier', 'authority'} or (user.role == 'admin' and user.county_id is not None):
            q = q.filter(Report.county_id == user.county_id)
            if user.role == 'authority':
                q = q.filter(Report.department_id == user.department_id)
        rows = q.order_by(Report.created_at.desc()).limit(20).all()
        return [{'id': r.id, 'category': r.category.name, 'status': r.status,
                 'created_at': r.created_at.isoformat(), 'description': r.description}
                for r in rows if user_can_access_report(user, r)]
    if name == 'start_guided_tour':
        return {'action': 'start_guided_tour', 'tour': 'report'}
    if name == 'start_report_submission':
        if user.role != 'resident':
            raise ApiError('forbidden', 'Only residents can submit community reports.', 403)
        category_name = args.get('category_name')
        description = args.get('description')
        if category_name is not None and not isinstance(category_name, str):
            raise ApiError('validation_error', 'Choose a valid report category.', 422)
        if description is not None and (not isinstance(description, str) or len(description) > 500):
            raise ApiError('validation_error', 'Report description must be under 500 characters.', 422)
        category = (Category.query.filter(func.lower(Category.name) == category_name.strip().lower()).first()
                    if category_name and category_name.strip() else None)
        return {'action': 'start_report_submission',
                'category_id': category.id if category else None,
                'category_name': category.name if category else None,
                'description': description.strip() if description else ''}
    if name == 'get_permitted_analytics':
        from .analytics import public_analytics, summary
        if user.role == 'resident':
            return public_analytics().get_json()
        if user.role in {'authority', 'admin'}:
            return summary().get_json()
        raise ApiError('forbidden', 'Analytics are not available to this role.', 403)
    if name == 'get_user_counts':
        # Match the existing /users visibility rules. Staff users can see only aggregate
        # counts for authority accounts in their county; admins can see all roles in
        # their county, or nationally when they have no county assignment.
        if user.role not in {'verifier', 'authority', 'admin'}:
            raise ApiError('forbidden', 'User counts are not available to this role.', 403)
        q = User.query
        if user.role == 'admin':
            if user.county_id is not None:
                q = q.filter(User.county_id == user.county_id)
            scope = 'county' if user.county_id is not None else 'national'
        else:
            if user.county_id is None:
                return {'scope': 'county', 'total': 0, 'by_role': {'authority': 0}}
            q = q.filter(User.county_id == user.county_id, User.role == 'authority')
            scope = 'county authority accounts'
        rows = q.with_entities(User.role, func.count(User.id)).group_by(User.role).all()
        by_role = {role: int(count) for role, count in rows}
        return {'scope': scope, 'total': sum(by_role.values()), 'by_role': by_role}
    if name == 'search_residents':
        if user.role != 'admin':
            raise ApiError('forbidden', 'Resident name lookup is available to administrators only.', 403)
        search_term, county_name = args.get('name'), args.get('county')
        if (set(args) != {'name', 'county'}
                or (search_term is not None and (not isinstance(search_term, str) or len(search_term.strip()) > 120))
                or (county_name is not None and (not isinstance(county_name, str) or len(county_name.strip()) > 120))
                or not ((search_term and search_term.strip()) or (county_name and county_name.strip()))):
            raise ApiError('validation_error', 'Enter a resident name, county, or both.', 422)
        q = User.query.outerjoin(County, County.id == User.county_id).filter(User.role == 'resident')
        if user.county_id is not None:
            q = q.filter(User.county_id == user.county_id)
        if county_name and county_name.strip():
            county_term = county_name.strip().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
            q = q.filter(County.name.ilike(f'%{county_term}%', escape='\\'))
        if search_term and search_term.strip():
            escaped_name = search_term.strip().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
            q = q.filter(User.name.ilike(f'%{escaped_name}%', escape='\\'))
        match_count = q.with_entities(func.count(User.id)).scalar() or 0
        rows = (q.outerjoin(Report, Report.created_by == User.id)
                .with_entities(User.id, User.name, User.email, County.name, func.count(Report.id))
                .group_by(User.id, User.name, User.email, County.name)
                .order_by(User.name, User.id).limit(10).all())
        return {'scope': 'county' if user.county_id is not None else 'national',
                'match_count': int(match_count),
                'matches': [{'id': row[0], 'name': row[1], 'email': row[2],
                             'county': row[3], 'reports_submitted': int(row[4])} for row in rows]}
    if name == 'get_report_resident':
        if user.role != 'admin':
            raise ApiError('forbidden', 'Report submitter lookup is available to administrators only.', 403)
        report_id = args.get('report_id')
        if set(args) != {'report_id'} or isinstance(report_id, bool) or not isinstance(report_id, int):
            raise ApiError('validation_error', 'Choose a valid report ID.', 422)
        q = Report.query.filter(Report.id == report_id)
        if user.county_id is not None:
            q = q.filter(Report.county_id == user.county_id)
        row = q.join(User, User.id == Report.created_by).with_entities(
            Report.id, User.id, User.name
        ).first()
        if row is None:
            raise ApiError('not_found', 'Report not found in your authorized scope.', 404)
        return {'report_id': row[0], 'resident_id': row[1], 'resident_name': row[2]}
    if name == 'prepare_user_role_change':
        if user.role != 'admin':
            raise ApiError('forbidden', 'Only administrators can change user roles.', 403)
        user_id, role = args.get('user_id'), args.get('role')
        if set(args) != {'user_id', 'role'} or isinstance(user_id, bool) or not isinstance(user_id, int) or role not in {'resident', 'verifier', 'authority', 'admin'}:
            raise ApiError('validation_error', 'Choose a valid user and role.', 422)
        q = User.query.filter(User.id == user_id)
        if user.county_id is not None:
            q = q.filter(User.county_id == user.county_id)
        target = q.with_entities(User.id, User.name, User.role).first()
        if target is None:
            raise ApiError('not_found', 'User not found in your authorized scope.', 404)
        return {'action': 'confirm_user_role_change', 'user_id': target[0],
                'user_name': target[1], 'current_role': target[2], 'role': role}
    if name == 'prepare_status_change':
        if user.role not in {'verifier', 'authority', 'admin'}:
            raise ApiError('forbidden', 'Your role cannot change report status.', 403)
        report_id, status, note = args.get('report_id'), args.get('status'), args.get('note')
        if isinstance(report_id, bool) or not isinstance(report_id, int) or status not in {
            'verified', 'rejected', 'in_progress', 'resolved'
        }:
            raise ApiError('validation_error', 'Choose a valid report and status.', 422)
        if note is not None and (not isinstance(note, str) or len(note.strip()) > 500):
            raise ApiError('validation_error', 'Status notes must be under 500 characters.', 422)
        report = db.session.get(Report, report_id)
        if report is None or not user_can_access_report(user, report):
            raise ApiError('not_found', 'Report not found in your authorized scope.', 404)
        if not can_transition(report.status, status) or user.role not in TRANSITION_ROLES.get((report.status, status), set()):
            raise ApiError('forbidden', f'Your role cannot move this report from {report.status} to {status}.', 403)
        if user.role == 'authority' and report.assigned_to != user.id:
            raise ApiError('forbidden', 'Only the assigned authority can update this report.', 403)
        if status == 'rejected' and not (note or '').strip():
            raise ApiError('validation_error', 'A rejection reason is required before confirming.', 422)
        current_app.logger.info(
            'CivicAI prepared status change user_id=%s report_id=%s status=%s',
            user.id, report.id, status,
        )
        return {'action': 'confirm_status_change', 'report_id': report.id, 'status': status,
                'note': (note or '').strip() or None, 'category': report.category.name}
    raise ApiError('civicai_tool_invalid', 'CivicAI requested an unavailable action.', 400)


@bp.post('/civicai/chat')
@login_required
def chat():
    body = request.get_json(silent=True) or {}
    messages = body.get('messages')
    if not isinstance(messages, list) or not messages or len(messages) > 12:
        raise ApiError('validation_error', 'Provide up to 12 recent chat messages.', 422)
    safe_messages = []
    for message in messages:
        if not isinstance(message, dict) or message.get('role') not in {'user', 'assistant'}:
            raise ApiError('validation_error', 'Invalid conversation message.', 422)
        content = message.get('content')
        if not isinstance(content, str) or len(content) > 2000:
            raise ApiError('validation_error', 'Messages must be under 2,000 characters.', 422)
        safe_messages.append({'role': message['role'], 'content': content})

    user = current_user()
    tools = [TOOL_SCHEMAS['get_report_categories'], TOOL_SCHEMAS['get_my_reports'],
             TOOL_SCHEMAS['start_guided_tour']]
    if user.role == 'resident':
        tools.append(TOOL_SCHEMAS['start_report_submission'])
    if user.role in {'resident', 'authority', 'admin'}:
        tools.append(TOOL_SCHEMAS['get_permitted_analytics'])
    if user.role in {'verifier', 'authority', 'admin'}:
        tools.append(TOOL_SCHEMAS['get_user_counts'])
    if user.role == 'admin':
        tools.extend([TOOL_SCHEMAS['search_residents'], TOOL_SCHEMAS['get_report_resident'],
                      TOOL_SCHEMAS['prepare_user_role_change']])
    if user.role in {'verifier', 'authority', 'admin'}:
        tools.append(TOOL_SCHEMAS['prepare_status_change'])
    result = respond(_instructions(user), safe_messages, tools)
    # The model can select only the fixed registry above; arguments are schema-checked and
    # authorization is derived from the database-loaded JWT user, never request data.
    actions = []
    for _ in range(4):
        calls = [item for item in result.get('output', []) if item.get('type') == 'function_call']
        if not calls:
            break
        outputs = []
        for call in calls:
            if call.get('name') not in TOOL_SCHEMAS:
                raise ApiError('civicai_tool_invalid', 'CivicAI requested an unavailable action.', 400)
            try:
                args = json.loads(call.get('arguments') or '{}')
            except json.JSONDecodeError:
                raise ApiError('civicai_tool_invalid', 'CivicAI returned invalid tool arguments.', 400)
            if call['name'] not in {'prepare_status_change', 'start_report_submission',
                                    'search_residents', 'get_report_resident',
                                    'prepare_user_role_change'} and args != {}:
                raise ApiError('civicai_tool_invalid', 'This CivicAI action takes no arguments.', 400)
            if call['name'] == 'start_guided_tour':
                actions.append({'type': 'start_guided_tour', 'tour': 'report'})
            if call['name'] == 'start_report_submission':
                # Category names are resolved against the database inside the tool executor.
                pass
            action_result = _execute(call['name'], user, args)
            if call['name'] == 'start_report_submission':
                actions.append(action_result)
            if call['name'] == 'prepare_status_change':
                actions.append({'type': 'confirm_status_change', **action_result})
            if call['name'] == 'prepare_user_role_change':
                actions.append(action_result)
            outputs.append({'type': 'function_call_output', 'call_id': call['call_id'],
                            'output': json.dumps(action_result)})
        safe_messages = safe_messages + result.get('output', []) + outputs
        result = respond(_instructions(user), safe_messages, tools)
    answer = next((item.get('text') for item in reversed(result.get('output', []))
                   if item.get('type') == 'message' for item in item.get('content', [])
                   if item.get('type') == 'output_text'), None)
    return jsonify(message=answer or 'I could not form a response. Please try asking in another way.', actions=actions)
