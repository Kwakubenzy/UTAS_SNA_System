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


def test_deleting_student_also_deletes_their_connections(client, admin_token, app):
    a = client.post('/api/students/', json=STUDENT_PAYLOAD, headers=auth_header(admin_token)).get_json()['student']
    b = client.post('/api/students/', json={**STUDENT_PAYLOAD, 'student_id': 'S002', 'name': 'Kojo Owusu'},
                     headers=auth_header(admin_token)).get_json()['student']
    conn = client.post('/api/connections/', json={
        'from_student_id': a['id'], 'to_student_id': b['id'],
    }, headers=auth_header(admin_token)).get_json()['connection']

    resp = client.delete(f"/api/students/{a['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 200

    with app.app_context():
        from app.models import Connection
        assert Connection.query.get(conn['id']) is None


def test_deleting_student_with_network_metrics_does_not_500(client, admin_token, app):
    """Regression test: NetworkMetric.student_id is NOT NULL, and the
    Student<->NetworkMetric relationship had no delete cascade, so deleting
    a student who'd already been through analysis (i.e. has a NetworkMetric
    row) raised an IntegrityError instead of actually deleting them --
    SQLAlchemy's default behavior on delete is to null the child's foreign
    key, which this column rejects."""
    created = client.post('/api/students/', json=STUDENT_PAYLOAD, headers=auth_header(admin_token)).get_json()['student']

    with app.app_context():
        from app.models import db, NetworkMetric
        db.session.add(NetworkMetric(student_id=created['id'], degree_centrality=0.5))
        db.session.commit()

    resp = client.delete(f"/api/students/{created['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 200

    with app.app_context():
        from app.models import NetworkMetric
        assert NetworkMetric.query.filter_by(student_id=created['id']).first() is None


def test_student_stats_summary(client, admin_token):
    client.post('/api/students/', json=STUDENT_PAYLOAD, headers=auth_header(admin_token))
    resp = client.get('/api/students/stats/summary', headers=auth_header(admin_token))
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['total_students'] == 1
    assert data['by_party']['TESCON'] == 1
