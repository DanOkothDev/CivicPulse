import re

from flask import Blueprint, jsonify, request
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from ..auth_utils import current_user, login_required, roles_required, user_can_access_county
from ..errors import ApiError
from ..extensions import db
from ..models import County, Department, Report, User

bp = Blueprint('counties', __name__)


def _department_json(department):
    return {
        'id': department.id,
        'county_id': department.county_id,
        'name': department.name,
        'code': department.code,
    }


def _department_payload(data, department=None):
    if not isinstance(data, dict):
        raise ApiError('validation_error', 'Send a JSON object', 422)
    allowed = {'name', 'code'}
    if department is not None and not data:
        raise ApiError('validation_error', 'Send at least one department field', 422, {
            'allowed': sorted(allowed),
        })
    unknown = sorted(set(data) - allowed)
    if unknown:
        raise ApiError('validation_error', 'Unknown department fields', 422, {
            'allowed': sorted(allowed),
        })

    name = data.get('name', department.name if department else '')
    name = name.strip() if isinstance(name, str) else ''
    code = data.get('code', department.code if department else None)
    code = code.strip().lower() if isinstance(code, str) else code
    errors = {}
    if not name or len(name) > 120:
        errors['name'] = 'Name is required and must be 120 characters or fewer'
    if code == '':
        code = None
    if code is not None and (
        not isinstance(code, str)
        or len(code) > 60
        or re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', code) is None
    ):
        errors['code'] = 'Use up to 60 lowercase letters, numbers, and hyphens'
    if errors:
        raise ApiError('validation_error', 'Please fix the highlighted fields', 422, errors)
    return name, code


def _require_manage_county(county_id):
    admin = current_user()
    if admin.county_id is not None and admin.county_id != county_id:
        raise ApiError('forbidden', 'You can only manage departments in your county', 403)


def _check_department_unique(county_id, name, code, exclude_id=None):
    name_query = Department.query.filter(
        Department.county_id == county_id,
        func.lower(Department.name) == name.lower(),
    )
    code_query = Department.query.filter_by(county_id=county_id, code=code)
    if exclude_id is not None:
        name_query = name_query.filter(Department.id != exclude_id)
        code_query = code_query.filter(Department.id != exclude_id)
    if name_query.first():
        raise ApiError('department_exists', 'A department with this name already exists in this county', 409)
    if code is not None and code_query.first():
        raise ApiError('department_code_exists', 'A department with this code already exists in this county', 409)


@bp.get('/counties/<int:county_id>')
@login_required
def county_detail(county_id):
    if not user_can_access_county(current_user(), county_id):
        raise ApiError('forbidden', 'You cannot access that county', 403)
    county = db.session.get(County, county_id)
    if county is None:
        raise ApiError('not_found', 'County not found', 404)
    departments = Department.query.filter_by(county_id=county_id).order_by(Department.name).all()
    admins = User.query.filter_by(county_id=county_id, role='admin').count()
    return jsonify({
        'id': county.id,
        'name': county.name,
        'code': county.code,
        'department_count': len(departments),
        'admin_count': admins,
    })


@bp.get('/analytics/county-performance')
@roles_required('authority', 'admin')
def county_performance():
    user = current_user()
    county_id = request.args.get('county_id')
    if county_id not in (None, ''):
        try:
            county_id = int(county_id)
        except ValueError:
            raise ApiError('validation_error', 'county_id must be a number', 422)

    if user.role == 'authority' and (user.county_id is None or user.department_id is None):
        q = Report.query.filter(Report.id == -1)
    elif user.county_id is not None:
        if county_id is not None and county_id != user.county_id:
            raise ApiError('forbidden', 'You can only view performance for your county', 403)
        county_id = user.county_id
        q = Report.query.filter(Report.duplicate_of.is_(None))
    else:
        q = Report.query.filter(Report.duplicate_of.is_(None))
    if county_id is not None:
        q = q.filter(Report.county_id == county_id)
    if user.role == 'authority' and user.department_id is not None:
        q = q.filter(Report.department_id == user.department_id)

    total = q.count()
    by_status = {status: q.filter(Report.status == status).count() for status in ('reported', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved')}
    resolved = by_status.get('resolved', 0)
    pending = total - resolved
    return jsonify({
        'total_reports': total,
        'resolved_reports': resolved,
        'pending_reports': pending,
        'by_status': by_status,
    })


@bp.get('/analytics/national')
@roles_required('authority', 'admin')
def national_performance():
    user = current_user()
    rows = []
    counties = County.query.order_by(County.name)
    if user.role == 'authority' and (
        user.county_id is None or user.department_id is None
    ):
        counties = counties.filter(County.id == -1)
    if user.county_id is not None:
        counties = counties.filter(County.id == user.county_id)
    for county in counties.all():
        q = Report.query.filter(Report.duplicate_of.is_(None), Report.county_id == county.id)
        if user.role == 'authority':
            q = q.filter(
                Report.department_id == user.department_id
            ) if user.department_id is not None else q.filter(Report.id == -1)
        total = q.count()
        resolved = q.filter(Report.status == 'resolved').count()
        verified = q.filter(Report.status.in_(['verified', 'assigned', 'in_progress', 'resolved'])).count()
        pending = q.filter(Report.status.in_(['reported', 'verified', 'assigned', 'in_progress'])).count()
        rows.append({
            'county_id': county.id,
            'county_name': county.name,
            'total_reports': total,
            'verified_reports': verified,
            'resolved_reports': resolved,
            'pending_reports': pending,
            'resolution_rate': round((resolved / total) * 100, 2) if total else 0,
        })
    return jsonify({'counties': rows})


@bp.post('/counties/<int:county_id>/departments')
@roles_required('admin')
def create_department(county_id):
    county = db.session.get(County, county_id)
    if county is None:
        raise ApiError('not_found', 'County not found', 404)
    _require_manage_county(county_id)
    name, code = _department_payload(request.get_json(silent=True))
    _check_department_unique(county_id, name, code)
    department = Department(county_id=county_id, name=name, code=code)
    db.session.add(department)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError('department_exists', 'A department with this name or code already exists in this county', 409)
    return jsonify(_department_json(department)), 201


@bp.patch('/departments/<int:department_id>')
@roles_required('admin')
def update_department(department_id):
    department = db.session.get(Department, department_id)
    if department is None:
        raise ApiError('not_found', 'Department not found', 404)
    _require_manage_county(department.county_id)
    name, code = _department_payload(request.get_json(silent=True), department)
    _check_department_unique(department.county_id, name, code, department.id)
    department.name = name
    department.code = code
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError('department_exists', 'A department with this name or code already exists in this county', 409)
    return jsonify(_department_json(department))


@bp.delete('/departments/<int:department_id>')
@roles_required('admin')
def delete_department(department_id):
    department = db.session.get(Department, department_id)
    if department is None:
        raise ApiError('not_found', 'Department not found', 404)
    _require_manage_county(department.county_id)
    if (
        User.query.filter_by(department_id=department.id).count()
        or Report.query.filter_by(department_id=department.id).count()
    ):
        raise ApiError(
            'department_in_use',
            'This department is assigned to users or reports and cannot be deleted',
            409,
        )
    db.session.delete(department)
    db.session.commit()
    return '', 204
