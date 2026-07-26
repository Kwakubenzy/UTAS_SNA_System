"""Records notable actions (create/delete/import/analysis) for the dashboard activity feed"""
from flask_jwt_extended import get_jwt_identity
from app.models import db, ActivityLog
import logging

logger = logging.getLogger(__name__)


class ActivityService:
    @staticmethod
    def log(action, description):
        """Record an activity entry. Best-effort: never raises, never blocks the caller."""
        try:
            user_id = None
            try:
                identity = get_jwt_identity()
                user_id = int(identity) if identity is not None else None
            except Exception:
                user_id = None

            entry = ActivityLog(action=action, description=description, user_id=user_id)
            db.session.add(entry)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to log activity '{action}': {str(e)}")
