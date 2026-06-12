from fastapi import Depends, Header, HTTPException, status

from app.modules.identity.domain.entities import AuthenticatedUser
from app.modules.identity.domain.repositories import IdentityProvider
from app.modules.identity.infrastructure.supabase_identity import SupabaseIdentityProvider


def get_identity_provider() -> IdentityProvider:
    """Override in tests to swap in a fake provider."""
    return SupabaseIdentityProvider()


def current_user(
    authorization: str | None = Header(default=None),
    provider: IdentityProvider = Depends(get_identity_provider),
) -> AuthenticatedUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided.",
        )
    user = provider.resolve(authorization[7:])
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )
    return user
