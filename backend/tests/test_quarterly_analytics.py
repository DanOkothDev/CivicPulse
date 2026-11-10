import io
from datetime import datetime, timedelta, timezone

from app.extensions import db
from app.models import County, Report, User
from app.api.quarterly_analytics import previous_quarter

JPEG = b'\xff\xd8\xff\xe0' + b'0' * 100


def login(client, make_user, role='resident'):
    email, password = make_user(role)
    response = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    return {'Authorization': f"Bearer {response.json['token']}"}


def create_report(client, headers):
    data = {'category_id': '1', 'lat': '10.0', 'lon': '10.0',
            'photo': (io.BytesIO(JPEG), 'quarter.jpg')}
    response = client.post('/api/v1/reports', data=data, headers=headers,
                           content_type='multipart/form-data')
    assert response.status_code == 201
    return response.json['id']


def set_county(app, email, county_id):
    with app.app_context():
        user = User.query.filter_by(email=email).one()
        user.county_id = county_id
        db.session.commit()


def test_previous_quarter_boundaries():
    assert previous_quarter(datetime(2026, 1, 15, tzinfo=timezone.utc).date()) == (
        datetime(2025, 10, 1).date(), datetime(2026, 1, 1).date())
    assert previous_quarter(datetime(2026, 11, 10, tzinfo=timezone.utc).date()) == (
        datetime(2026, 7, 1).date(), datetime(2026, 10, 1).date())


def test_national_admin_sends_one_county_scoped_digest_per_admin(client, app, make_user):
    resident = login(client, make_user)
    sender = login(client, make_user, 'admin')
    county_admin = login(client, make_user, 'admin')
    second_county_admin = login(client, make_user, 'admin')
    with app.app_context():
        counties = County.query.order_by(County.id).limit(2).all()
        county_ids = [county.id for county in counties]
        admins = User.query.filter_by(role='admin').order_by(User.id).all()
        emails = [admin.email for admin in admins]
    set_county(app, emails[1], county_ids[0])
    set_county(app, emails[2], county_ids[1])

    first_id = create_report(client, resident)
    second_id = create_report(client, resident)
    quarter_start, _ = previous_quarter()
    quarter_created = datetime.combine(quarter_start + timedelta(days=10), datetime.min.time(), timezone.utc)
    with app.app_context():
        first = db.session.get(Report, first_id)
        second = db.session.get(Report, second_id)
        first.created_at = quarter_created
        second.created_at = quarter_created
        first.status = 'resolved'
        second.county_id = county_ids[1]
        db.session.commit()

    sent = client.post('/api/v1/analytics/quarterly-digests/send', headers=sender)
    assert sent.status_code == 201
    assert sent.json['recipient_count'] == 2
    received_first = client.get('/api/v1/analytics/quarterly-digests', headers=county_admin).json
    received_second = client.get('/api/v1/analytics/quarterly-digests', headers=second_county_admin).json
    assert received_first[0]['snapshot']['scope'] == counties[0].name
    assert received_first[0]['snapshot']['total_reports'] == 1
    assert received_first[0]['snapshot']['county_rank'] == 1
    assert received_first[0]['snapshot']['ranked_counties'] == 2
    assert received_first[0]['snapshot']['national_leaders'][0]['county_id'] == county_ids[0]
    assert received_first[0]['snapshot']['category_changes'][0]['change'] == 1
    assert any('ranked #1 of 2' in insight for insight in received_first[0]['snapshot']['insights'])
    assert received_second[0]['snapshot']['scope'] == counties[1].name
    assert received_second[0]['snapshot']['total_reports'] == 1
    assert received_second[0]['snapshot']['county_rank'] == 2
    set_county(app, emails[1], county_ids[1])
    assert client.get('/api/v1/analytics/quarterly-digests', headers=county_admin).json == []
    assert client.post('/api/v1/analytics/quarterly-digests/send', headers=sender).status_code == 409


def test_only_national_admin_can_send_quarterly_digests(client, app, make_user):
    resident = login(client, make_user)
    assert client.get('/api/v1/analytics/quarterly-digests').status_code == 401
    assert client.get('/api/v1/analytics/quarterly-digests', headers=resident).status_code == 403
    county_admin = login(client, make_user, 'admin')
    with app.app_context():
        county = County.query.order_by(County.id).first()
        email = User.query.filter_by(role='admin').one().email
        county_id = county.id
    set_county(app, email, county_id)
    assert client.post('/api/v1/analytics/quarterly-digests/send', headers=county_admin).status_code == 403
