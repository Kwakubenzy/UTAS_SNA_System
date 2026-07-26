"""Quick test of authentication system"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app
from app.models import db, User, Role
from app.services.auth_service import AuthService

# Create app and context
app = create_app()

with app.app_context():
    # Drop and recreate tables (fresh start)
    db.drop_all()
    db.create_all()
    
    # Ensure default roles
    AuthService.ensure_default_roles()
    
    # Register test user
    print("=" * 50)
    print("TESTING AUTHENTICATION SYSTEM")
    print("=" * 50)
    
    # Test registration
    print("\n1. TESTING REGISTRATION")
    result = AuthService.register_user(
        username="testuser",
        email="test@utas.edu",
        password="Test1234!",
        full_name="Test User",
        college="Engineering",
        department="IT",
        year=2
    )
    print(f"Registration: {result['success']}")
    print(f"Message: {result['message']}")
    if result['success']:
        print(f"User ID: {result['user']['id']}")
    
    # Test login
    print("\n2. TESTING LOGIN")
    result = AuthService.authenticate_user("testuser", "Test1234!")
    print(f"Login: {result['success']}")
    print(f"Message: {result['message']}")
    if result['success']:
        print(f"User: {result['user']['username']}")
        print(f"Role: {result['user']['role']}")
    
    # Test get user
    print("\n3. TESTING GET USER")
    if result['success']:
        user_id = result['user']['id']
        result = AuthService.get_user_by_id(user_id)
        print(f"Get User: {result['success']}")
        if result['success']:
            print(f"User Data: {result['user']}")
    
    # Test update profile
    print("\n4. TESTING UPDATE PROFILE")
    result = AuthService.update_user_profile(
        user_id,
        full_name="Updated User",
        tribe="Luo"
    )
    print(f"Update: {result['success']}")
    if result['success']:
        print(f"Updated User: {result['user']}")
    
    print("\n" + "=" * 50)
    print("✅ ALL TESTS COMPLETED")
    print("=" * 50)
