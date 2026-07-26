"""JWT token handling utilities"""
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class JWTHandler:
    """Handle JWT token creation and verification"""
    
    ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)  # 30 minutes
    REFRESH_TOKEN_EXPIRES = timedelta(days=7)     # 7 days
    
    @staticmethod
    def create_tokens(user_id, username, role='student'):
        """Create access and refresh tokens for a user"""
        try:
            additional_claims = {
                'username': username,
                'role': role
            }
            
            access_token = create_access_token(
                identity=str(user_id),
                additional_claims=additional_claims,
                expires_delta=JWTHandler.ACCESS_TOKEN_EXPIRES
            )

            refresh_token = create_refresh_token(
                identity=str(user_id),
                expires_delta=JWTHandler.REFRESH_TOKEN_EXPIRES
            )
            
            logger.info(f'Tokens created for user: {username}')
            
            return {
                'success': True,
                'access_token': access_token,
                'refresh_token': refresh_token,
                'token_type': 'Bearer',
                'expires_in': int(JWTHandler.ACCESS_TOKEN_EXPIRES.total_seconds())
            }
        
        except Exception as e:
            logger.error(f'Token creation error: {str(e)}')
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def create_access_token_from_refresh(user_id, username, role='student'):
        """Create new access token from refresh token"""
        try:
            additional_claims = {
                'username': username,
                'role': role
            }
            
            access_token = create_access_token(
                identity=str(user_id),
                additional_claims=additional_claims,
                expires_delta=JWTHandler.ACCESS_TOKEN_EXPIRES
            )

            logger.info(f'Access token refreshed for user: {username}')
            
            return {
                'success': True,
                'access_token': access_token,
                'token_type': 'Bearer',
                'expires_in': int(JWTHandler.ACCESS_TOKEN_EXPIRES.total_seconds())
            }
        
        except Exception as e:
            logger.error(f'Token refresh error: {str(e)}')
            return {'success': False, 'message': str(e)}
