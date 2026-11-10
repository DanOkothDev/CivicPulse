"""Provider adapter for CivicAI's backend-controlled Responses API calls."""
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import current_app

from .errors import ApiError


GROQ_RESPONSES_TOOL_MODELS = frozenset({
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
})
USER_AGENT = 'CivicPulse-CivicAI/1.0'


def _request(provider, url, api_key, model, instructions, messages, tools, store_supported):
    payload = {
        'model': model,
        'instructions': instructions,
        'input': messages,
        'tools': tools,
        'tool_choice': 'auto',
        'parallel_tool_calls': False,
    }
    if store_supported:
        payload['store'] = False
    request = Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT,
        },
        method='POST',
    )
    try:
        with urlopen(request, timeout=25) as response:
            return json.loads(response.read())
    except HTTPError as exc:
        try:
            provider_error = json.loads(exc.read())
        except (json.JSONDecodeError, OSError):
            provider_error = {}
        detail = provider_error.get('error') or {}
        provider_code = detail.get('code') if isinstance(detail, dict) else None
        # Log only the provider's status and machine-readable code. Do not log response text,
        # request payloads, auth headers, or user messages.
        current_app.logger.warning(
            'CivicAI provider=%s HTTP=%s code=%s',
            provider, exc.code, provider_code or 'n/a',
        )
        if exc.code == 401:
            raise ApiError(
                'civicai_provider_auth',
                f'{provider} rejected its configured API key. Check the backend provider key.',
                502,
            )
        if provider.lower() == 'groq' and exc.code == 403:
            raise ApiError(
                'civicai_model_forbidden',
                'Groq denied access to the configured model. Check that GROQ_MODEL is enabled for the API key’s project, or choose an enabled model in the backend environment.',
                502,
            )
        raise ApiError('civicai_unavailable', 'CivicAI could not answer right now. Please try again.', 502)
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        current_app.logger.warning('CivicAI provider request failed: %s', type(exc).__name__)
        raise ApiError('civicai_unavailable', 'CivicAI could not connect right now. Please try again.', 502)


def respond(instructions, messages, tools):
    """Try OpenAI first, then Groq; both responses use the same Responses API shape."""
    openai_key = current_app.config.get('CIVICAI_API_KEY')
    groq_key = current_app.config.get('GROQ_API_KEY')
    if not openai_key and not groq_key:
        raise ApiError(
            'civicai_not_configured',
            'CivicAI needs a provider key. Configure CIVICAI_API_KEY or GROQ_API_KEY on the backend.',
            503,
        )

    if openai_key:
        try:
            return _request(
                'OpenAI', 'https://api.openai.com/v1/responses', openai_key,
                current_app.config['CIVICAI_MODEL'], instructions, messages, tools,
                store_supported=True,
            )
        except ApiError:
            if not groq_key:
                raise
            current_app.logger.warning('CivicAI falling back from OpenAI to Groq')

    groq_model = current_app.config['GROQ_MODEL']
    if groq_model not in GROQ_RESPONSES_TOOL_MODELS:
        raise ApiError(
            'civicai_model_unsupported',
            'GROQ_MODEL is not in CivicAI’s verified Groq Responses API and tool-calling model list. Choose openai/gpt-oss-20b, openai/gpt-oss-120b, or qwen/qwen3.8-27b.',
            503,
        )
    return _request(
        'Groq', 'https://api.groq.com/openai/v1/responses', groq_key,
        groq_model, instructions, messages, tools,
        store_supported=False,
    )


def list_groq_models():
    """Return active Groq model IDs using the backend key, without displaying the key."""
    api_key = current_app.config.get('GROQ_API_KEY')
    if not api_key:
        raise ValueError('GROQ_API_KEY is not configured in the backend environment.')
    request = Request(
        'https://api.groq.com/openai/v1/models',
        headers={
            'Authorization': f'Bearer {api_key}',
            'User-Agent': USER_AGENT,
        },
        method='GET',
    )
    try:
        with urlopen(request, timeout=15) as response:
            payload = json.loads(response.read())
    except HTTPError as exc:
        try:
            body = json.loads(exc.read())
        except (json.JSONDecodeError, OSError):
            body = {}
        error = body.get('error') or {}
        code = error.get('code', 'n/a') if isinstance(error, dict) else 'n/a'
        current_app.logger.warning('Groq model listing returned HTTP=%s code=%s', exc.code, code)
        raise ValueError(f'Groq denied model listing (HTTP {exc.code}, {code}). Check the API key and Groq project permissions.')
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise ValueError(f'Could not retrieve Groq models ({type(exc).__name__}).') from exc
    return sorted({
        model['id'] for model in payload.get('data', [])
        if isinstance(model, dict) and isinstance(model.get('id'), str)
        and model.get('active', True)
    })
