"""Tests for AI insight parsing/coercion (local models return messy shapes)."""

import json

from app.services.ai_service import _as_list, _as_text, _parse_insight, build_summary


def test_as_text_coerces_all_shapes():
    assert _as_text(None) is None
    assert _as_text("hi") == "hi"
    assert _as_text(["C++", "CMake"]) == "C++, CMake"
    assert _as_text({"lang": "py"}) == "lang: py"
    assert _as_text(42) == "42"


def test_as_list_coerces_all_shapes():
    assert _as_list(None) == []
    assert _as_list(["a", "b"]) == ["a", "b"]
    assert _as_list("a, b, c") == ["a", "b", "c"]
    assert _as_list(5) == ["5"]


def test_parse_insight_coerces_list_valued_string_field():
    # regression: qwen returned tech_stack as a list, which broke the TEXT insert
    raw = json.dumps(
        {
            "why_growing": "grows fast",
            "tech_stack": ["C++", "CMake", "Docker"],
            "competitors": ["a/b", "c/d"],
            "tags": ["cli", "ai"],
        }
    )
    out = _parse_insight(raw, "qwen2.5:7b", 123)
    assert out is not None
    assert out["tech_stack"] == "C++, CMake, Docker"       # list -> string
    assert out["competitors"] == '["a/b", "c/d"]'          # list -> json string
    assert out["tags"] == ["cli", "ai"]                    # stays a list
    assert out["model_used"] == "qwen2.5:7b"
    assert out["tokens_used"] == 123


def test_parse_insight_strips_markdown_fence():
    raw = "```json\n{\"verdict\": \"worth it\"}\n```"
    out = _parse_insight(raw, "m", 0)
    assert out is not None
    assert out["verdict"] == "worth it"


def test_parse_insight_rejects_invalid_json():
    assert _parse_insight("this is not json", "m", 0) is None


def test_parse_insight_rejects_non_object():
    assert _parse_insight("[1, 2, 3]", "m", 0) is None


def test_build_summary_combines_or_falls_back():
    assert build_summary({"verdict": "v", "why_growing": "w"}) == "w v"
    assert build_summary({"verdict": "v"}) == "v"
    assert build_summary({}) is None
