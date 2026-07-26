from flask import Blueprint, request, jsonify
from app.models import ActivityLog
from app.utils.decorators import token_required
import logging

logger = logging.getLogger(__name__)

activity_bp = Blueprint('activity', __name__)

@activity_bp.route('/recent', methods=['GET'])
@token_required
def get_recent_activity():
    """Get the most recent activity log entries"""
    try:
        limit = request.args.get('limit', 10, type=int)
        entries = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(limit).all()

        return jsonify({
            'success': True,
            'count': len(entries),
            'activities': [e.to_dict() for e in entries]
        }), 200
    except Exception as e:
        logger.error(f"Error fetching recent activity: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
