"""
DiligenceOS API — Rate Limiting configuration & handlers using slowapi.
"""

import math
from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)


def get_user_or_ip_key(request: Request) -> str:
    """
    Key function for rate limiting authenticated endpoints.
    Uses authenticated user ID if present in cookies/state,
    otherwise falls back to remote client IP address.
    """
    user = getattr(request.state, "user", None)
    if user and hasattr(user, "id"):
        return str(user.id)

    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return f"token:{cookie_token[:32]}"

    return get_remote_address(request)


def custom_rate_limit_exceeded_handler(
    request: Request, exc: RateLimitExceeded
) -> JSONResponse:
    """
    Custom exception handler for RateLimitExceeded.
    Returns HTTP 429 Too Many Requests with explicit retry_after hint & header.
    """
    retry_after = getattr(exc, "retry_after", 60) or 60
    if isinstance(retry_after, float):
        retry_after = math.ceil(retry_after)

    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded ({exc.detail}). Please try again later.",
            "retry_after": retry_after,
        },
        headers={"Retry-After": str(retry_after)},
    )
