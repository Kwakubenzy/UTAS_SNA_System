from conftest import auth_header

STUDENT_PAYLOAD = {
    'student_id': 'S001',
    'name': 'Ama Mensah',
    'party': 'TESCON',
    'college': 'Engineering',
    'department': 'Computer Science',
    'year': 2,
}


def test_list_students_requires_auth(client):
    resp = client.get('/api/students/')
    assert resp.status_code == 401


def test_student_cannot_create_student(client, student_token):
    resp = client.post('/api/students/', json=STUDENT_PAYLOAD, headers=auth_header(student_token))
    assert resp.status_code == 403


def test_admin_can_create_and_list_student(client, admin_token):
    resp = client.post('/api/students/', json=STUDENT_PAYLOAD, headers=auth_header(admin_token))
    assert resp.status_code == 201
    assert resp.get_json()['student']['student_id'] == 'S001'

    resp = client.get('/api/students/', headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.get_json()['count'] == 1


def test_create_student_rejects_invalid_party(client, admin_token):
    payload = {**STUDENT_PAYLOAD, 'party': 'NOT_A_PARTY'}
    resp = client.post('/api/students/', json=payload, headers=auth_header(admin_token))
    assert resp.status_code == 400


def test_create_student_rejects_duplicate_student_id(client, admin_token):
    client.post('/api/students/', json=STUDENT_PAYLOAD, headers=auth_header(admin_token))
    resp = client.post('/api/students/', json=STUDENT_PAYLOAD, headers=auth_header(admin_token))
    assert resp.status_code == 400


def test_update_and_delete_student(client, admin_token):
    created = client.post('/api/students/', json=STUDENT_PAYLOAD, headers=auth_header(admin_token)).get_json()['student']

    resp = client.put(f"/api/students/{created['id']}", json={'name': 'Ama Updated'}, headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.get_json()['student']['name'] == 'Ama Updated'

    resp = client.delete(f"/api/students/{created['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 200

    resp = client.get(f"/api/students/{created['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 404


def test_student_stats_summary(client, admin_token):
    client.post('/api/students/', json=STUDENT_PAYLOAD, headers=auth_header(admin_token))
    resp = client.get('/api/students/stats/summary', headers=auth_header(admin_token))
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['total_students'] == 1
    assert data['by_party']['TESCON'] == 1
