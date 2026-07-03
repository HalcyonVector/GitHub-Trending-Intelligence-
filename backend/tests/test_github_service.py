"""Tests for GitHub response parsing (the datetime bug regression lives here)."""

from datetime import datetime

from app.services.github_service import GitHubService, _parse_dt


def test_parse_dt_handles_z_suffix():
    d = _parse_dt("2025-07-22T22:22:28Z")
    assert isinstance(d, datetime)
    assert (d.year, d.month, d.day) == (2025, 7, 22)


def test_parse_dt_none_and_empty():
    assert _parse_dt(None) is None
    assert _parse_dt("") is None


def test_parse_dt_invalid_returns_none():
    assert _parse_dt("not-a-date") is None


def test_parse_repo_data_converts_timestamps_to_datetime():
    raw = {
        "id": 42,
        "name": "x",
        "full_name": "owner/x",
        "owner": {"login": "owner"},
        "description": "d",
        "language": "Python",
        "license": {"spdx_id": "MIT"},
        "topics": ["ai"],
        "created_at": "2025-01-02T03:04:05Z",
        "updated_at": "2025-02-02T03:04:05Z",
        "pushed_at": "2025-03-02T03:04:05Z",
        "stargazers_count": 5,
        "forks_count": 2,
        "watchers_count": 3,
        "open_issues_count": 1,
    }
    d = GitHubService().parse_repo_data(raw)
    assert d["github_id"] == 42
    assert d["latest_stars"] == 5
    assert isinstance(d["github_created_at"], datetime)
    assert isinstance(d["github_updated_at"], datetime)
    assert isinstance(d["github_pushed_at"], datetime)


def test_parse_repo_data_tolerates_missing_dates():
    raw = {"id": 1, "name": "y", "full_name": "o/y", "owner": {"login": "o"}}
    d = GitHubService().parse_repo_data(raw)
    assert d["github_created_at"] is None
    assert d["latest_stars"] == 0
