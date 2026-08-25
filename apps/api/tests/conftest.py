"""
Pytest configuration and global fixtures.
Resets rate limiter storage before each test to ensure test isolation.
"""

import os
import sys

# Ensure the apps/api directory is in sys.path for test imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from app.core.rate_limit import limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset slowapi rate limits before and after every test."""
    limiter.reset()
    yield
    limiter.reset()
