"""Compatibility imports for user-related models.

The canonical SQLAlchemy model definitions live in app.models. Keeping this
module as a re-export avoids duplicate table registration if app.models.user is
imported elsewhere.
"""

from app.models import Role, User

__all__ = ["Role", "User"]
