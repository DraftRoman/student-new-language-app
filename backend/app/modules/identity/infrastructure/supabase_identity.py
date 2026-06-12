from app.modules.identity.domain.entities import AuthenticatedUser
from app.shared.infrastructure.supabase_client import supabase


class SupabaseIdentityProvider:
    """Resolves bearer tokens via the Supabase Auth admin API."""

    def resolve(self, token: str) -> AuthenticatedUser | None:
        try:
            result = supabase.auth.get_user(token)
        except Exception:
            return None
        if not result or not result.user:
            return None
        return AuthenticatedUser(id=result.user.id, email=result.user.email)
