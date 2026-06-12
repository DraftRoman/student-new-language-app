from typing import Protocol

from app.modules.identity.domain.entities import AuthenticatedUser


class IdentityProvider(Protocol):
    """Resolves a bearer token to the authenticated user.

    Implementations return None for missing/invalid tokens; they MUST NOT raise.
    """

    def resolve(self, token: str) -> AuthenticatedUser | None: ...
