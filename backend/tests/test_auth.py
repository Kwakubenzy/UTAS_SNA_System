from conftest import auth_header


def test_register_success(client):
    resp = client.post('/api/auth/register', json={
        'username': 'newstudent',
        'email': 'newstudent@utas.edu',
        'password': 'Testpass1',
        'full_name': 'New Student',
    })
    data = resp.get_json()
    assert resp.status_code == 201
    assert data['success'] is True
    assert data['user']['role'] == 'student'
    assert 'tokens' in data


def test_register_duplicate_username_rejected(client):
    client.post('/api/auth/register', json={
        'username': 'dupe', 'email': 'a@utas.edu', 'password': 'Testpass1', 'full_name': 'A',
    })
    resp = client.post('/api/auth/register', json={
        'username': 'dupe', 'email': 'b@utas.edu', 'password': 'Testpass1', 'full_name': 'B',
    })
    assert resp.status_code == 400
    assert resp.get_json()['success'] is False


def test_login_wrong_password_rejected(client):
    client.post('/api/auth/register', json={
        'username': 'loginuser', 'email': 'loginuser@utas.edu', 'password': 'Testpass1', 'full_name': 'Login User',
    })
    resp = client.post('/api/auth/login', json={'username': 'loginuser', 'password': 'wrong'})
    assert resp.status_code == 401
    assert resp.get_json()['success'] is False


def test_profile_requires_auth(client):
    resp = client.get('/api/auth/profile')
    assert resp.status_code == 401


def test_profile_get_and_update(client, student_token):
    resp = client.get('/api/auth/profile', headers=auth_header(student_token))
    assert resp.status_code == 200
    assert resp.get_json()['user']['username'] == 'student_user'

    resp = client.put('/api/auth/profile', json={'full_name': 'Updated Name'}, headers=auth_header(student_token))
    assert resp.status_code == 200
    assert resp.get_json()['user']['full_name'] == 'Updated Name'


def test_change_password_then_login_with_new_password(client, student_token):
    resp = client.post('/api/auth/change-password', json={
        'old_password': 'Testpass1', 'new_password': 'NewPass2',
    }, headers=auth_header(student_token))
    assert resp.status_code == 200

    resp = client.post('/api/auth/login', json={'username': 'student_user', 'password': 'NewPass2'})
    assert resp.status_code == 200


def test_change_password_rejects_short_new_password(client, student_token):
    resp = client.post('/api/auth/change-password', json={
        'old_password': 'Testpass1', 'new_password': 'ab',
    }, headers=auth_header(student_token))
    assert resp.status_code == 400


def test_update_profile_rejects_duplicate_email_with_clean_message(client):
    client.post('/api/auth/register', json={
        'username': 'userone', 'email': 'taken@utas.edu', 'password': 'Testpass1', 'full_name': 'One',
    })
    login = client.post('/api/auth/register', json={
        'username': 'usertwo', 'email': 'usertwo@utas.edu', 'password': 'Testpass1', 'full_name': 'Two',
    })
    token = login.get_json()['tokens']['access_token']

    resp = client.put('/api/auth/profile', json={'email': 'taken@utas.edu'}, headers=auth_header(token))
    assert resp.status_code == 400
    assert resp.get_json()['message'] == 'Email is already in use'


def test_non_admin_cannot_list_users(client, student_token):
    resp = client.get('/api/auth/users', headers=auth_header(student_token))
    assert resp.status_code == 403


def test_admin_can_list_users(client, admin_token):
    resp = client.get('/api/auth/users', headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True


def test_admin_can_deactivate_and_deactivated_user_cannot_login(client, admin_token):
    client.post('/api/auth/register', json={
        'username': 'tobedeactivated', 'email': 'deact@utas.edu', 'password': 'Testpass1', 'full_name': 'Deact User',
    })
    users = client.get('/api/auth/users', headers=auth_header(admin_token)).get_json()['users']
    target = next(u for u in users if u['username'] == 'tobedeactivated')

    resp = client.put(f"/api/auth/users/{target['id']}/status", json={'is_active': False}, headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.get_json()['user']['is_active'] is False

    login = client.post('/api/auth/login', json={'username': 'tobedeactivated', 'password': 'Testpass1'})
    assert login.status_code == 401

    # Reactivating should let them log in again.
    resp = client.put(f"/api/auth/users/{target['id']}/status", json={'is_active': True}, headers=auth_header(admin_token))
    assert resp.status_code == 200
    login = client.post('/api/auth/login', json={'username': 'tobedeactivated', 'password': 'Testpass1'})
    assert login.status_code == 200


def test_admin_can_reset_user_password(client, admin_token):
    client.post('/api/auth/register', json={
        'username': 'needsreset', 'email': 'needsreset@utas.edu', 'password': 'Testpass1', 'full_name': 'Needs Reset',
    })
    users = client.get('/api/auth/users', headers=auth_header(admin_token)).get_json()['users']
    target = next(u for u in users if u['username'] == 'needsreset')

    resp = client.post(f"/api/auth/users/{target['id']}/reset-password", headers=auth_header(admin_token))
    assert resp.status_code == 200
    temp_password = resp.get_json()['temporary_password']
    assert len(temp_password) > 0

    # Old password no longer works, new temporary one does.
    old_login = client.post('/api/auth/login', json={'username': 'needsreset', 'password': 'Testpass1'})
    assert old_login.status_code == 401
    new_login = client.post('/api/auth/login', json={'username': 'needsreset', 'password': temp_password})
    assert new_login.status_code == 200


def test_reset_password_requires_admin(client, student_token):
    resp = client.post('/api/auth/users/1/reset-password', headers=auth_header(student_token))
    assert resp.status_code == 403


def test_set_status_requires_admin(client, student_token):
    resp = client.put('/api/auth/users/1/status', json={'is_active': False}, headers=auth_header(student_token))
    assert resp.status_code == 403


def test_delete_profile_requires_correct_password(client, student_token):
    resp = client.delete('/api/auth/profile', json={'password': 'wrongpassword'}, headers=auth_header(student_token))
    assert resp.status_code == 401

    resp = client.delete('/api/auth/profile', json={'password': 'Testpass1'}, headers=auth_header(student_token))
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True
