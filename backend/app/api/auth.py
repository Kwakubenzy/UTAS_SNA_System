"""Authentication API endpoints"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from app.services.auth_service import AuthService
from app.utils.jwt_handler import JWTHandler
from app.utils.decorators import token_required, admin_required
from app.models import User
import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user account"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required = ['username', 'email', 'password', 'full_name']
        if not all(field in data for field in required):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        # Validate password strength
        if len(data['password']) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
        
        # Register user
        result = AuthService.register_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            full_name=data['full_name'],
            tribe=data.get('tribe'),
            party=data.get('party'),
            college=data.get('college'),
            department=data.get('department'),
            year=data.get('year')
        )
        
        if not result['success']:
            return jsonify(result), 400
        
        # Create tokens for auto-login after registration
        user = result['user']
        token_result = JWTHandler.create_tokens(user['id'], user['username'], user['role'])
        
        if token_result['success']:
            result['tokens'] = {
                'access_token': token_result['access_token'],
                'refresh_token': token_result['refresh_token'],
                'token_type': token_result['token_type'],
                'expires_in': token_result['expires_in']
            }
        
        return jsonify(result), 201
    
    except Exception as e:
        logger.error(f'Registration endpoint error: {str(e)}')
        return jsonify({'success': False, 'message': 'Registration failed'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login with username and password"""
    try:
        data = request.get_json()
        
        if not data.get('username') or not data.get('password'):
            return jsonify({'success': False, 'message': 'Username and password required'}), 400
        
        # Authenticate user
        result = AuthService.authenticate_user(data['username'], data['password'])
        
        if not result['success']:
            logger.warning(f'Failed login attempt for: {data["username"]}')
            return jsonify(result), 401
        
        # Create tokens
        user = result['user']
        token_result = JWTHandler.create_tokens(user['id'], user['username'], user['role'])
        
        if not token_result['success']:
            return jsonify({'success': False, 'message': 'Token generation failed'}), 500
        
        result['tokens'] = {
            'access_token': token_result['access_token'],
            'refresh_token': token_result['refresh_token'],
            'token_type': token_result['token_type'],
            'expires_in': token_result['expires_in']
        }
        
        logger.info(f'User logged in: {user["username"]}')
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f'Login endpoint error: {str(e)}')
        return jsonify({'success': False, 'message': 'Login failed'}), 500


@auth_bp.route('/google', methods=['POST'])
def google_login():
    """Login (or auto-register) using a Google Identity Services ID token"""
    try:
        data = request.get_json() or {}
        credential = data.get('credential')

        if not credential:
            return jsonify({'success': False, 'message': 'Google credential required'}), 400

        client_id = current_app.config.get('GOOGLE_CLIENT_ID')
        if not client_id:
            logger.error('Google login attempted but GOOGLE_CLIENT_ID is not configured')
            return jsonify({'success': False, 'message': 'Google login is not configured on this server'}), 500

        try:
            payload = google_id_token.verify_oauth2_token(
                credential, google_requests.Request(), client_id
            )
        except ValueError as e:
            logger.warning(f'Rejected invalid Google credential: {str(e)}')
            return jsonify({'success': False, 'message': 'Invalid Google credential'}), 401

        if not payload.get('email_verified'):
            return jsonify({'success': False, 'message': 'Google account email is not verified'}), 401

        result = AuthService.authenticate_with_google(
            email=payload['email'],
            full_name=payload.get('name'),
        )

        if not result['success']:
            return jsonify(result), 401

        user = result['user']
        token_result = JWTHandler.create_tokens(user['id'], user['username'], user['role'])

        if not token_result['success']:
            return jsonify({'success': False, 'message': 'Token generation failed'}), 500

        result['tokens'] = {
            'access_token': token_result['access_token'],
            'refresh_token': token_result['refresh_token'],
            'token_type': token_result['token_type'],
            'expires_in': token_result['expires_in']
        }

        logger.info(f'User authenticated via Google: {user["username"]}')
        return jsonify(result), 200

    except Exception as e:
        logger.error(f'Google login endpoint error: {str(e)}')
        return jsonify({'success': False, 'message': 'Google login failed'}), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using refresh token"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Create new access token
        token_result = JWTHandler.create_access_token_from_refresh(
            user_id, user.username, user.role.name if user.role else 'student'
        )
        
        if not token_result['success']:
            return jsonify(token_result), 500
        
        return jsonify({
            'success': True,
            'message': 'Token refreshed successfully',
            'tokens': {
                'access_token': token_result['access_token'],
                'token_type': token_result['token_type'],
                'expires_in': token_result['expires_in']
            }
        }), 200
    
    except Exception as e:
        logger.error(f'Token refresh error: {str(e)}')
        return jsonify({'success': False, 'message': 'Token refresh failed'}), 500


@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    """Logout (invalidate token on client side)"""
    try:
        user_id = int(get_jwt_identity())
        logger.info(f'User logged out: {user_id}')
        return jsonify({'success': True, 'message': 'Logged out successfully'}), 200
    except Exception as e:
        logger.error(f'Logout error: {str(e)}')
        return jsonify({'success': False, 'message': 'Logout failed'}), 500


@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    """Get current user profile"""
    try:
        user_id = int(get_jwt_identity())
        result = AuthService.get_user_by_id(user_id)
        
        if not result['success']:
            return jsonify(result), 404
        
        return jsonify({
            'success': True,
            'user': result['user']
        }), 200
    
    except Exception as e:
        logger.error(f'Get profile error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch profile'}), 500


@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    """Update current user profile"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        result = AuthService.update_user_profile(user_id, **data)
        
        if not result['success']:
            return jsonify(result), 400
        
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f'Update profile error: {str(e)}')
        return jsonify({'success': False, 'message': 'Profile update failed'}), 500


@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    """Change user password"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data.get('old_password') or not data.get('new_password'):
            return jsonify({'success': False, 'message': 'Old and new password required'}), 400
        
        result = AuthService.change_password(
            user_id,
            data['old_password'],
            data['new_password']
        )
        
        return jsonify(result), 200 if result['success'] else 400
    
    except Exception as e:
        logger.error(f'Change password error: {str(e)}')
        return jsonify({'success': False, 'message': 'Password change failed'}), 500


@auth_bp.route('/profile', methods=['DELETE'])
@token_required
def delete_profile():
    """Delete user account"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Require password confirmation for security
        if not data or not data.get('password'):
            return jsonify({'success': False, 'message': 'Password required for deletion'}), 400
        
        user = User.query.get(user_id)
        if not user or not user.check_password(data['password']):
            return jsonify({'success': False, 'message': 'Invalid password'}), 401
        
        result = AuthService.delete_user(user_id)
        return jsonify(result), 200 if result['success'] else 400
    
    except Exception as e:
        logger.error(f'Delete profile error: {str(e)}')
        return jsonify({'success': False, 'message': 'Profile deletion failed'}), 500


# Admin endpoints

@auth_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users():
    """Get all users (admin only)"""
    try:
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 50, type=int)
        
        result = AuthService.get_all_users(skip, limit)
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f'Get users error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch users'}), 500


@auth_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    """Get user by ID (admin only)"""
    try:
        result = AuthService.get_user_by_id(user_id)
        return jsonify(result), 200 if result['success'] else 404
    
    except Exception as e:
        logger.error(f'Get user error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to fetch user'}), 500


@auth_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@admin_required
def assign_role(user_id):
    """Assign role to user (admin only)"""
    try:
        data = request.get_json()
        
        if not data.get('role'):
            return jsonify({'success': False, 'message': 'Role name required'}), 400
        
        result = AuthService.assign_role(user_id, data['role'])
        return jsonify(result), 200 if result['success'] else 400
    
    except Exception as e:
        logger.error(f'Assign role error: {str(e)}')
        return jsonify({'success': False, 'message': 'Role assignment failed'}), 500


@auth_bp.route('/users/<int:user_id>/status', methods=['PUT'])
@admin_required
def set_user_status(user_id):
    """Activate or deactivate a user account (admin only)"""
    try:
        data = request.get_json()

        if 'is_active' not in data or not isinstance(data['is_active'], bool):
            return jsonify({'success': False, 'message': 'is_active (boolean) required'}), 400

        result = AuthService.set_active_status(user_id, data['is_active'])
        return jsonify(result), 200 if result['success'] else 400

    except Exception as e:
        logger.error(f'Set user status error: {str(e)}')
        return jsonify({'success': False, 'message': 'Failed to update user status'}), 500


@auth_bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'success': True, 'status': 'Auth service is running'}), 200
