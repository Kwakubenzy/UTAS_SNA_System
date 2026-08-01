import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from app import create_app
from app.models import db


@pytest.fixture
def app():
    """A fresh Flask app with an in-memory database for each test --
    never touches the real backend/instance/sna_system.db file."""
    application = create_app('testing')
    yield application


@pytest.fixture
def client(app):
    return app.test_client()


def _register_and_login(client, username, password='Testpass1', **extra):
    client.post('/api/auth/register', json={
        'username': username,
        'email': f'{username}@utas.edu',
        'password': password,
        'full_name': username.title(),
        **extra,
    })
    login = client.post('/api/auth/login', json={'username': username, 'password': password})
    return login.get_json()['tokens']['access_token']


@pytest.fixture
def student_token(client):
    """Access token for a freshly-registered, default-role (student) user."""
    return _register_and_login(client, 'student_user')


@pytest.fixture
def admin_token(client, app):
    """Access token for a user promoted to admin immediately after registration."""
    token = _register_and_login(client, 'admin_user')
    with app.app_context():
        from app.services.auth_service import AuthService
        from app.models import User
        user = User.query.filter_by(username='admin_user').first()
        AuthService.assign_role(user.id, 'admin')
    # Role is baked into the JWT at login time, so log in again to get a
    # token whose claims actually reflect the new admin role.
    login = client.post('/api/auth/login', json={'username': 'admin_user', 'password': 'Testpass1'})
    return login.get_json()['tokens']['access_token']


def auth_header(token):
    return {'Authorization': f'Bearer {token}'}
