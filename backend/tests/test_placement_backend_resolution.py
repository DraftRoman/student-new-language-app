"""Tests for the placement-backend resolver.

The resolver is the single decision point for "JSON vs Supabase". Testing
it in isolation keeps the matrix readable and is cheaper than spinning up
a TestClient with monkey-patched settings.
"""
import pytest

from app.modules.placement.presentation.dependencies import _resolve_backend


class TestResolveBackend:
    @pytest.mark.parametrize("configured", [True, False])
    def test_explicit_json_always_wins(self, configured):
        """Kill-switch: force JSON even when Supabase looks ready."""
        assert _resolve_backend("json", configured) == "json"

    @pytest.mark.parametrize("configured", [True, False])
    def test_explicit_supabase_always_wins(self, configured):
        """Production guard: forced supabase surfaces missing credentials
        loudly on first request rather than silently writing JSON."""
        assert _resolve_backend("supabase", configured) == "supabase"

    def test_auto_picks_supabase_when_configured(self):
        assert _resolve_backend("auto", configured=True) == "supabase"

    def test_auto_falls_back_to_json_when_not_configured(self):
        assert _resolve_backend("auto", configured=False) == "json"
