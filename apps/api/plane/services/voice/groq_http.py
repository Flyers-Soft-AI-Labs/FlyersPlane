# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import asyncio

import httpx

GROQ_API_BASE_URL = "https://api.groq.com/openai/v1"
RETRYABLE_STATUS_CODES = {408, 409, 429, 500, 502, 503, 504}


class GroqAPIError(Exception):
    pass


def _extract_error_message(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = None

    if isinstance(payload, dict):
        error = payload.get("error")
        if isinstance(error, dict):
            message = error.get("message")
            if message:
                return str(message)
        if error:
            return str(error)

    return f"Groq request failed with status {response.status_code}."


async def request_groq(
    method: str,
    path: str,
    api_key: str,
    *,
    data=None,
    files=None,
    json=None,
    retries: int = 2,
    timeout: float = 45.0,
) -> httpx.Response:
    headers = {"Authorization": f"Bearer {api_key}"}
    last_error: Exception | None = None

    async with httpx.AsyncClient(base_url=GROQ_API_BASE_URL, timeout=timeout) as client:
        for attempt in range(retries + 1):
            try:
                response = await client.request(
                    method=method,
                    url=path,
                    headers=headers,
                    data=data,
                    files=files,
                    json=json,
                )
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = exc
                if attempt >= retries:
                    raise GroqAPIError("Groq request timed out. Please try again.") from exc
            else:
                if response.status_code < 400:
                    return response

                if response.status_code not in RETRYABLE_STATUS_CODES or attempt >= retries:
                    raise GroqAPIError(_extract_error_message(response))

                last_error = GroqAPIError(_extract_error_message(response))

            await asyncio.sleep(0.4 * (2**attempt))

    raise GroqAPIError("Groq request failed. Please try again.") from last_error
