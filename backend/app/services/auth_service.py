"""Authentication service for user management"""
from app.models import db, User, Role
from datetime import datetime, timedelta
import logging
import re
import secrets

logger = logging.getLogger(__name__)


class AuthService:
    """Handle authentication operations"""
    
    @staticmethod
    def register_user(username, email, password, full_name, tribe=None, party=None, college=None, department=None, year=None):
        """Register a new user"""
        try:
            # Check if user exists
            if User.query.filter_by(username=username).first():
                return {'success': False, 'message': 'Username already exists'}
            
            if User.query.filter_by(email=email).first():
                return {'success': False, 'message': 'Email already exists'}
            
            # Get default role (Student)
            student_role = Role.query.filter_by(name='student').first()
            if not student_role:
                student_role = Role(name='student', description='Regular student user')
                db.session.add(student_role)
                db.session.flush()
            
            # Create new user
            user = User(
                username=username,
                email=email,
                full_name=full_name,
                tribe=tribe,
                party=party,
                college=college,
                department=department,
                year=year,
                role_id=student_role.id
            )
            user.set_password(password)
            
            db.session.add(user)
            db.session.commit()
            
            logger.info(f'User registered: {username}')
            return {
                'success': True,
                'message': 'User registered successfully',
                'user': user.to_dict()
            }
        
        except Exception as e:
            db.session.rollback()
            logger.error(f'Registration error: {str(e)}')
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def authenticate_user(username, password):
        """Authenticate user with username and password"""
        try:
            user = User.query.filter_by(username=username).first()
            
            if not user:
                return {'success': False, 'message': 'Invalid username or password'}
            
            if not user.is_active:
                return {'success': False, 'message': 'Account is inactive'}
            
            if not user.check_password(password):
                return {'success': False, 'message': 'Invalid username or password'}
            
            # Update last login
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            logger.info(f'User logged in: {username}')
            return {
                'success': True,
                'message': 'Login successful',
                'user': user.to_dict()
            }
        
        except Exception as e:
            logger.error(f'Authentication error: {str(e)}')
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def authenticate_with_google(email, full_name):
        """Log in a user by verified Google email, auto-registering a new
        account on first sign-in. The account gets a random, never-shared
        password so it still satisfies the password_hash NOT NULL column,
        but it can only realistically be reached again via Google login."""
        try:
            user = User.query.filter_by(email=email).first()

            if user:
                if not user.is_active:
                    return {'success': False, 'message': 'Account is inactive'}
                user.last_login = datetime.utcnow()
                db.session.commit()
                logger.info(f'User logged in via Google: {user.username}')
                return {'success': True, 'message': 'Login successful', 'user': user.to_dict()}

            student_role = Role.query.filter_by(name='student').first()
            if not student_role:
                student_role = Role(name='student', description='Regular student user')
                db.session.add(student_role)
                db.session.flush()

            base_username = re.sub(r'[^a-zA-Z0-9_.]', '', email.split('@')[0]) or 'user'
            username = base_username
            suffix = 1
            while User.query.filter_by(username=username).first():
                suffix += 1
                username = f'{base_username}{suffix}'

            user = User(
                username=username,
                email=email,
                full_name=full_name or username,
                role_id=student_role.id,
                last_login=datetime.utcnow(),
            )
            user.set_password(secrets.token_urlsafe(32))

            db.session.add(user)
            db.session.commit()

            logger.info(f'User registered via Google: {username}')
            return {'success': True, 'message': 'Account created', 'user': user.to_dict()}

        except Exception as e:
            db.session.rollback()
            logger.error(f'Google authentication error: {str(e)}')
            return {'success': False, 'message': str(e)}

    @staticmethod
    def get_user_by_id(user_id):
        """Get user by ID"""
        try:
            user = User.query.get(user_id)
            if not user:
                return {'success': False, 'message': 'User not found'}
            return {'success': True, 'user': user.to_dict()}
        except Exception as e:
            logger.error(f'Error fetching user: {str(e)}')
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def update_user_profile(user_id, **kwargs):
        """Update user profile"""
        try:
            user = User.query.get(user_id)
            if not user:
                return {'success': False, 'message': 'User not found'}
            
            # Fields that can be updated
            allowed_fields = ['full_name', 'tribe', 'party', 'college', 'department', 'year', 'email']
            
            for field, value in kwargs.items():
                if field in allowed_fields and value is not None:
                    setattr(user, field, value)
            
            user.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f'User profile updated: {user.username}')
            return {
                'success': True,
                'message': 'Profile updated successfully',
                'user': user.to_dict()
            }
        
        except Exception as e:
            db.session.rollback()
            logger.error(f'Profile update error: {str(e)}')
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def change_password(user_id, old_password, new_password):
        """Change user password"""
        try:
            user = User.query.get(user_id)
            if not user:
                return {'success': False, 'message': 'User not found'}
            
            if not user.check_password(old_password):
                return {'success': False, 'message': 'Current password is incorrect'}
            
            user.set_password(new_password)
            db.session.commit()
            
            logger.info(f'Password changed for user: {user.username}')
            return {'success': True, 'message': 'Password changed successfully'}
        
        except Exception as e:
            db.session.rollback()
            logger.error(f'Password change error: {str(e)}')
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def delete_user(user_id):
        """Delete user account"""
        try:
            user = User.query.get(user_id)
            if not user:
                return {'success': False, 'message': 'User not found'}
            
            username = user.username
            db.session.delete(user)
            db.session.commit()
            
            logger.info(f'User deleted: {username}')
            return {'success': True, 'message': 'Account deleted successfully'}
        
        except Exception as e:
            db.session.rollback()
            logger.error(f'User deletion error: {str(e)}')
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def get_all_users(skip=0, limit=50):
        """Get all users with pagination"""
        try:
            users = User.query.offset(skip).limit(limit).all()
            total = User.query.count()
            
            return {
                'success': True,
                'users': [u.to_dict() for u in users],
                'total': total,
                'skip': skip,
                'limit': limit
            }
        except Exception as e:
            logger.error(f'Error fetching users: {str(e)}')
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def assign_role(user_id, role_name):
        """Assign role to user (admin only)"""
        try:
            user = User.query.get(user_id)
            if not user:
                return {'success': False, 'message': 'User not found'}
            
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                return {'success': False, 'message': 'Role not found'}
            
            user.role_id = role.id
            db.session.commit()
            
            logger.info(f'Role assigned to {user.username}: {role_name}')
            return {
                'success': True,
                'message': f'Role {role_name} assigned successfully',
                'user': user.to_dict()
            }
        
        except Exception as e:
            db.session.rollback()
            logger.error(f'Role assignment error: {str(e)}')
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def ensure_default_roles():
        """Ensure default roles exist"""
        roles_to_create = [
            {'name': 'admin', 'description': 'Administrator with full access'},
            {'name': 'campaign_manager', 'description': 'Campaign manager role'},
            {'name': 'student', 'description': 'Regular student user'}
        ]
        
        try:
            for role_data in roles_to_create:
                role = Role.query.filter_by(name=role_data['name']).first()
                if not role:
                    role = Role(**role_data)
                    db.session.add(role)
            
            db.session.commit()
            logger.info('Default roles ensured')
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error creating default roles: {str(e)}')
