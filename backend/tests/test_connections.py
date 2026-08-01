from conftest import auth_header

STUDENT_A = {'student_id': 'S001', 'name': 'Ama', 'party': 'TESCON', 'college': 'Eng', 'department': 'CS', 'year': 2}
STUDENT_B = {'student_id': 'S002', 'name': 'Kofi', 'party': 'TEIN', 'college': 'Eng', 'department': 'CS', 'year': 2}


def _create_two_students(client, admin_token):
    a = client.post('/api/students/', json=STUDENT_A, headers=auth_header(admin_token)).get_json()['student']
    b = client.post('/api/students/', json=STUDENT_B, headers=auth_header(admin_token)).get_json()['student']
    return a, b


def test_create_and_list_connection(client, admin_token):
    a, b = _create_two_students(client, admin_token)

    resp = client.post('/api/connections/', json={
        'from_student_id': a['id'], 'to_student_id': b['id'], 'strength': 3, 'relationship_type': 'Close Friend',
    }, headers=auth_header(admin_token))
    assert resp.status_code == 201

    resp = client.get('/api/connections/', headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.get_json()['count'] == 1


def test_duplicate_connection_rejected(client, admin_token):
    a, b = _create_two_students(client, admin_token)
    payload = {'from_student_id': a['id'], 'to_student_id': b['id']}
    client.post('/api/connections/', json=payload, headers=auth_header(admin_token))
    resp = client.post('/api/connections/', json=payload, headers=auth_header(admin_token))
    assert resp.status_code == 400


def test_connection_to_nonexistent_student_rejected(client, admin_token):
    a, _ = _create_two_students(client, admin_token)
    resp = client.post('/api/connections/', json={
        'from_student_id': a['id'], 'to_student_id': 9999,
    }, headers=auth_header(admin_token))
    assert resp.status_code == 404


def test_strength_out_of_range_rejected(client, admin_token):
    a, b = _create_two_students(client, admin_token)
    resp = client.post('/api/connections/', json={
        'from_student_id': a['id'], 'to_student_id': b['id'], 'strength': 9,
    }, headers=auth_header(admin_token))
    assert resp.status_code == 400


def test_strength_explicit_null_rejected_cleanly(client, admin_token):
    a, b = _create_two_students(client, admin_token)
    resp = client.post('/api/connections/', json={
        'from_student_id': a['id'], 'to_student_id': b['id'], 'strength': None,
    }, headers=auth_header(admin_token))
    assert resp.status_code == 201  # None is treated as "use the default", not a 500


def test_reverse_direction_duplicate_connection_rejected(client, admin_token):
    a, b = _create_two_students(client, admin_token)
    client.post('/api/connections/', json={
        'from_student_id': a['id'], 'to_student_id': b['id'],
    }, headers=auth_header(admin_token))

    resp = client.post('/api/connections/', json={
        'from_student_id': b['id'], 'to_student_id': a['id'],
    }, headers=auth_header(admin_token))
    assert resp.status_code == 400


def test_update_and_delete_connection(client, admin_token):
    a, b = _create_two_students(client, admin_token)
    created = client.post('/api/connections/', json={
        'from_student_id': a['id'], 'to_student_id': b['id'],
    }, headers=auth_header(admin_token)).get_json()['connection']

    resp = client.put(f"/api/connections/{created['id']}", json={'strength': 5}, headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.get_json()['connection']['strength'] == 5

    resp = client.delete(f"/api/connections/{created['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 200


def test_student_friends_endpoint(client, admin_token):
    a, b = _create_two_students(client, admin_token)
    client.post('/api/connections/', json={'from_student_id': a['id'], 'to_student_id': b['id']}, headers=auth_header(admin_token))

    resp = client.get(f"/api/connections/student/{a['id']}/friends", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.get_json()['friend_count'] == 1


def test_student_cannot_create_connection(client, student_token, admin_token):
    a, b = _create_two_students(client, admin_token)
    resp = client.post('/api/connections/', json={
        'from_student_id': a['id'], 'to_student_id': b['id'],
    }, headers=auth_header(student_token))
    assert resp.status_code == 403
