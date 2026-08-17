"""
Pytest configuration and global fixtures.
Resets rate limiter storage before each test to ensure test isolation.
"""

import pytest
from app.core.rate_limit import limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset slowapi rate limits before and after every test."""
    limiter.reset()
    yield
    limiter.reset()
