"""Cross-cutting domain exceptions.

Each module's presentation layer maps these to HTTP responses;
domain/application code stays HTTP-agnostic.
"""


class DomainError(Exception):
    """Base for all domain-layer errors."""


class NotFoundError(DomainError):
    """Requested resource does not exist."""


class UnauthorizedError(DomainError):
    """Caller is not authenticated."""


class ValidationError(DomainError):
    """Input violates a domain rule."""
