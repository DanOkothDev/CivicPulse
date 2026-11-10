import json
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError

import pytest
from flask import Flask
from types import SimpleNamespace

from app.civicai import list_groq_models, respond
from app.civicai import GROQ_RESPONSES_TOOL_MODELS
from app.errors import ApiError
from app.api.civicai import _execute


def test_provider_requires_server_configuration():
    app = Flask(__name__)
    app.config.update(CIVICAI_API_KEY='', CIVICAI_MODEL='test-model')
    with app.app_context(), pytest.raises(ApiError) as error:
        respond('instructions', [], [])
    assert error.value.status == 503
    assert error.value.code == 'civicai_not_configured'


def test_provider_sends_storage_disabled_responses_request():
    app = Flask(__name__)
    app.config.update(CIVICAI_API_KEY='server-secret', CIVICAI_MODEL='test-model')

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

        def read(self):
            return b'{"output": []}'

    with app.app_context(), patch('app.civicai.urlopen', return_value=Response()) as send:
        result = respond('instructions', [{'role': 'user', 'content': 'hello'}], [])

    payload = json.loads(send.call_args.args[0].data)
    assert result == {'output': []}
    assert send.call_args.args[0].full_url == 'https://api.openai.com/v1/responses'
    assert send.call_args.args[0].get_header('Authorization') == 'Bearer server-secret'
    assert payload['store'] is False
    assert payload['model'] == 'test-model'
    assert payload['instructions'] == 'instructions'
    assert payload['input'] == [{'role': 'user', 'content': 'hello'}]
    assert send.call_args.args[0].get_header('User-agent') == 'CivicPulse-CivicAI/1.0'
    assert send.call_args.kwargs['timeout'] == 25


def test_groq_provider_uses_responses_api_without_unsupported_store_field():
    app = Flask(__name__)
    app.config.update(CIVICAI_API_KEY='', GROQ_API_KEY='groq-secret', GROQ_MODEL='openai/gpt-oss-20b')

    class Response:
        def __enter__(self): return self
        def __exit__(self, *_): return None
        def read(self):
            return b'{"output":[{"type":"function_call","name":"get_report_categories","arguments":"{}","call_id":"call_1"}]}'

    tool = {'type': 'function', 'name': 'get_report_categories', 'parameters': {'type': 'object'}}
    conversation = [{'role': 'user', 'content': 'List categories'}]

    with app.app_context(), patch('app.civicai.urlopen', return_value=Response()) as send:
        result = respond('instructions', conversation, [tool])

    sent = send.call_args.args[0]
    payload = json.loads(sent.data)
    assert sent.full_url == 'https://api.groq.com/openai/v1/responses'
    assert sent.get_header('Authorization') == 'Bearer groq-secret'
    assert sent.get_header('User-agent') == 'CivicPulse-CivicAI/1.0'
    assert payload['model'] == 'openai/gpt-oss-20b'
    assert 'store' not in payload
    assert payload['instructions'] == 'instructions'
    assert payload['input'] == conversation
    assert payload['tools'] == [tool]
    assert payload['tool_choice'] == 'auto'
    assert payload['parallel_tool_calls'] is False
    assert result['output'][0]['type'] == 'function_call'


def test_falls_back_to_groq_when_openai_is_unavailable():
    app = Flask(__name__)
    app.config.update(
        CIVICAI_API_KEY='openai-secret', CIVICAI_MODEL='test-openai',
        GROQ_API_KEY='groq-secret', GROQ_MODEL='openai/gpt-oss-20b',
    )

    class Response:
        def __enter__(self): return self
        def __exit__(self, *_): return None
        def read(self): return b'{"output": [{"type": "message"}]}'

    unavailable = HTTPError('https://api.openai.com/v1/responses', 429, 'quota', {}, BytesIO(b''))
    with app.app_context(), patch('app.civicai.urlopen', side_effect=[unavailable, Response()]) as send:
        result = respond('instructions', [], [])

    assert send.call_count == 2
    assert send.call_args_list[1].args[0].full_url == 'https://api.groq.com/openai/v1/responses'
    assert all(call.args[0].get_header('User-agent') == 'CivicPulse-CivicAI/1.0' for call in send.call_args_list)
    assert result == {'output': [{'type': 'message'}]}


def test_groq_403_returns_actionable_model_access_error(caplog):
    app = Flask(__name__)
    app.config.update(CIVICAI_API_KEY='', GROQ_API_KEY='secret-not-logged', GROQ_MODEL='openai/gpt-oss-20b')
    forbidden = HTTPError(
        'https://api.groq.com/openai/v1/responses', 403, 'Forbidden', {},
        BytesIO(b'{"error":{"code":"model_permission_blocked_project","message":"Model is blocked"}}'),
    )
    with app.app_context(), patch('app.civicai.urlopen', side_effect=forbidden):
        with pytest.raises(ApiError) as error:
            respond('instructions', [], [])

    assert error.value.code == 'civicai_model_forbidden'
    assert 'GROQ_MODEL' in error.value.message
    assert 'model_permission_blocked_project' in caplog.text
    assert 'secret-not-logged' not in caplog.text


def test_lists_active_groq_models_without_exposing_api_key():
    app = Flask(__name__)
    app.config['GROQ_API_KEY'] = 'secret-not-logged'

    class Response:
        def __enter__(self): return self
        def __exit__(self, *_): return None
        def read(self):
            return b'{"data":[{"id":"model-b","active":true},{"id":"model-a","active":true},{"id":"old-model","active":false}]}'

    with app.app_context(), patch('app.civicai.urlopen', return_value=Response()) as send:
        models = list_groq_models()

    assert models == ['model-a', 'model-b']
    assert send.call_args.args[0].full_url == 'https://api.groq.com/openai/v1/models'
    assert send.call_args.args[0].get_header('Authorization') == 'Bearer secret-not-logged'
    assert send.call_args.args[0].get_header('User-agent') == 'CivicPulse-CivicAI/1.0'


def test_model_list_requires_groq_key():
    app = Flask(__name__)
    app.config['GROQ_API_KEY'] = ''
    with app.app_context(), pytest.raises(ValueError, match='GROQ_API_KEY'):
        list_groq_models()


def test_unsupported_groq_model_is_rejected_before_http_request():
    app = Flask(__name__)
    app.config.update(CIVICAI_API_KEY='', GROQ_API_KEY='groq-key', GROQ_MODEL='allam-2-7b')
    with app.app_context(), patch('app.civicai.urlopen') as send:
        with pytest.raises(ApiError) as error:
            respond('instructions', [], [])
    assert error.value.code == 'civicai_model_unsupported'
    send.assert_not_called()
    assert 'openai/gpt-oss-20b' in GROQ_RESPONSES_TOOL_MODELS


def test_provider_authentication_failure_is_clear_and_does_not_log_secrets(caplog):
    app = Flask(__name__)
    app.config.update(CIVICAI_API_KEY='', GROQ_API_KEY='credential-secret', GROQ_MODEL='openai/gpt-oss-20b')
    unauthorized = HTTPError(
        'https://api.groq.com/openai/v1/responses', 401, 'Unauthorized', {},
        BytesIO(b'{"error":{"code":"invalid_api_key","message":"credential-secret private conversation text"}}'),
    )
    with app.app_context(), patch('app.civicai.urlopen', side_effect=unauthorized):
        with pytest.raises(ApiError) as error:
            respond('private conversation text', [], [])
    assert error.value.code == 'civicai_provider_auth'
    assert 'credential-secret' not in caplog.text
    assert 'private conversation text' not in caplog.text


def test_openai_authentication_failure_uses_same_safe_error_handling():
    app = Flask(__name__)
    app.config.update(CIVICAI_API_KEY='openai-secret', CIVICAI_MODEL='gpt-4.1-mini')
    unauthorized = HTTPError(
        'https://api.openai.com/v1/responses', 401, 'Unauthorized', {},
        BytesIO(b'{"error":{"code":"invalid_api_key","message":"do not expose"}}'),
    )
    with app.app_context(), patch('app.civicai.urlopen', side_effect=unauthorized):
        with pytest.raises(ApiError) as error:
            respond('private content', [], [])
    assert error.value.code == 'civicai_provider_auth'
    assert 'OpenAI' in error.value.message


def test_provider_error_logs_code_but_not_error_text_or_conversation(caplog):
    app = Flask(__name__)
    app.config.update(CIVICAI_API_KEY='', GROQ_API_KEY='key-secret', GROQ_MODEL='openai/gpt-oss-20b')
    bad_request = HTTPError(
        'https://api.groq.com/openai/v1/responses', 400, 'Bad Request', {},
        BytesIO(b'{"error":{"code":"invalid_request","message":"private conversation text key-secret"}}'),
    )
    with app.app_context(), patch('app.civicai.urlopen', side_effect=bad_request):
        with pytest.raises(ApiError):
            respond('private conversation text', [], [])
    assert 'invalid_request' in caplog.text
    assert 'key-secret' not in caplog.text
    assert 'private conversation text' not in caplog.text


def test_resident_cannot_use_staff_status_change_tool():
    with pytest.raises(ApiError) as error:
        _execute('prepare_status_change', SimpleNamespace(role='resident'), {
            'report_id': 12, 'status': 'verified', 'note': None,
        })
    assert error.value.status == 403


def test_nonresident_cannot_start_report_submission_tool():
    with pytest.raises(ApiError) as error:
        _execute('start_report_submission', SimpleNamespace(role='verifier'), {
            'category_name': None, 'description': None,
        })
    assert error.value.status == 403


def test_resident_cannot_read_staff_user_counts():
    with pytest.raises(ApiError) as error:
        _execute('get_user_counts', SimpleNamespace(role='resident'))
    assert error.value.status == 403


def test_authorized_user_count_tool_returns_only_aggregates():
    class Query:
        def __init__(self):
            self.filters = []

        def filter(self, *conditions):
            self.filters.extend(conditions)
            return self

        def with_entities(self, *columns):
            return self

        def group_by(self, *columns):
            return self

        def all(self):
            return [('authority', 3)]

    query = Query()
    user = SimpleNamespace(role='verifier', county_id=42)
    fake_user_model = SimpleNamespace(query=query, county_id=object(), role=object(), id=object())
    with patch('app.api.civicai.User', fake_user_model):
        result = _execute('get_user_counts', user)

    assert result == {
        'scope': 'county authority accounts', 'total': 3,
        'by_role': {'authority': 3},
    }
    assert len(query.filters) == 2


def test_national_admin_user_count_tool_returns_role_totals():
    class Query:
        def filter(self, *conditions):
            raise AssertionError('National admin should not be county filtered')

        def with_entities(self, *columns):
            return self

        def join(self, *args):
            return self

        def outerjoin(self, *args):
            return self

        def scalar(self):
            return 1

        def group_by(self, *columns):
            return self

        def group_by(self, *columns):
            return self

        def all(self):
            return [('admin', 1), ('authority', 4), ('resident', 12)]

    fake_user_model = SimpleNamespace(query=Query(), county_id=object(), role=object(), id=object())
    with patch('app.api.civicai.User', fake_user_model):
        result = _execute('get_user_counts', SimpleNamespace(role='admin', county_id=None))

    assert result == {
        'scope': 'national', 'total': 17,
        'by_role': {'admin': 1, 'authority': 4, 'resident': 12},
    }


def test_nonadmin_cannot_search_resident_names():
    with pytest.raises(ApiError) as error:
        _execute('search_residents', SimpleNamespace(role='authority', county_id=42), {'name': 'Jane'})
    assert error.value.status == 403


def test_nonadmin_cannot_get_report_submitter_name():
    with pytest.raises(ApiError) as error:
        _execute('get_report_resident', SimpleNamespace(role='verifier', county_id=42), {'report_id': 9})
    assert error.value.status == 403


def test_nonadmin_cannot_prepare_user_role_change():
    with pytest.raises(ApiError) as error:
        _execute('prepare_user_role_change', SimpleNamespace(role='authority', county_id=42), {
            'user_id': 34, 'role': 'verifier',
        })
    assert error.value.status == 403


def test_admin_name_search_returns_only_names_and_ids_in_scope():
    class Column:
        def __eq__(self, value):
            return ('eq', value)

        def ilike(self, value, escape=None):
            return ('ilike', value, escape)

    class Query:
        def __init__(self):
            self.filters = []

        def filter(self, *conditions):
            self.filters.extend(conditions)
            return self

        def with_entities(self, *columns):
            return self

        def outerjoin(self, *args):
            return self

        def scalar(self):
            return 1

        def group_by(self, *columns):
            return self

        def order_by(self, *columns):
            return self

        def limit(self, count):
            assert count == 10
            return self

        def all(self):
            return [(34, 'Jane Resident', 'jane@example.test', 'Kiambu', 2)]

    query = Query()
    fake_user_model = SimpleNamespace(
        query=query, role=Column(), county_id=Column(), name=Column(), email=Column(), id=Column(),
    )
    fake_county_model = SimpleNamespace(query=Query(), id=Column(), name=Column())
    with patch('app.api.civicai.User', fake_user_model), \
         patch('app.api.civicai.County', fake_county_model), \
         patch('app.api.civicai.Report', SimpleNamespace(created_by=Column(), id=Column())), \
         patch('app.api.civicai.func', SimpleNamespace(count=lambda column: 'count')):
        result = _execute('search_residents', SimpleNamespace(role='admin', county_id=42),
                          {'name': None, 'county': 'Kiambu'})

    assert result == {'scope': 'county', 'match_count': 1, 'matches': [{
        'id': 34, 'name': 'Jane Resident', 'email': 'jane@example.test',
        'county': 'Kiambu', 'reports_submitted': 2,
    }]}
    assert ('eq', 42) in query.filters
    assert ('eq', 'resident') in query.filters
    assert any(condition[0] == 'ilike' and 'Kiambu' in condition[1] for condition in query.filters)
