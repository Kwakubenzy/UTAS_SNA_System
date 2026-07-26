"""Authentication decorators for protected routes"""
from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
import logging

logger = logging.getLogger(__name__)


def token_required(fn):
    """Decorator to require valid JWT token"""
    @wraps(fn)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            return fn(*args, **kwargs)
        except Exception as e:
            logger.warning(f'Token verification failed: {str(e)}')
            return jsonify({'success': False, 'message': 'Invalid or expired token'}), 401
    
    return decorated


def admin_required(fn):
    """Decorator to require admin role"""
    @wraps(fn)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            claims = get_jwt()
            
            if claims.get('role') != 'admin':
                logger.warning(f'Admin access denied for role: {claims.get("role")}')
                return jsonify({'success': False, 'message': 'Admin access required'}), 403
            
            return fn(*args, **kwargs)
        except Exception as e:
            logger.warning(f'Admin check failed: {str(e)}')
            return jsonify({'success': False, 'message': 'Invalid or expired token'}), 401
    
    return decorated


def campaign_manager_required(fn):
    """Decorator to require campaign manager or admin role"""
    @wraps(fn)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get('role')
            
            if role not in ['admin', 'campaign_manager']:
                logger.warning(f'Campaign manager access denied for role: {role}')
                return jsonify({'success': False, 'message': 'Campaign manager access required'}), 403
            
            return fn(*args, **kwargs)
        except Exception as e:
            logger.warning(f'Campaign manager check failed: {str(e)}')
            return jsonify({'success': False, 'message': 'Invalid or expired token'}), 401
    
    return decorated


def get_current_user():
    """Get current authenticated user ID"""
    try:
        verify_jwt_in_request()
        identity = get_jwt_identity()
        return int(identity) if identity is not None else None
    except:
        return None


def get_current_claims():
    """Get current JWT claims"""
    try:
        verify_jwt_in_request()
        return get_jwt()
    except:
        return None
