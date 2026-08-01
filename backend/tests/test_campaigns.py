from conftest import auth_header

STUDENT = {'student_id': 'S001', 'name': 'Ama', 'party': 'TESCON', 'college': 'Eng', 'department': 'CS', 'year': 2}


def _create_manager_student(client, admin_token):
    return client.post('/api/students/', json=STUDENT, headers=auth_header(admin_token)).get_json()['student']


def test_create_and_list_campaign(client, admin_token):
    manager = _create_manager_student(client, admin_token)
    resp = client.post('/api/campaigns/', json={
        'campaign_id': 'CAMP-1', 'campaign_name': 'Freshers Outreach', 'manager_id': manager['id'],
    }, headers=auth_header(admin_token))
    assert resp.status_code == 201
    assert resp.get_json()['campaign']['status'] == 'planning'

    resp = client.get('/api/campaigns/', headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.get_json()['count'] == 1


def test_create_campaign_with_unknown_manager_rejected(client, admin_token):
    resp = client.post('/api/campaigns/', json={
        'campaign_id': 'CAMP-1', 'campaign_name': 'X', 'manager_id': 9999,
    }, headers=auth_header(admin_token))
    assert resp.status_code == 404


def test_update_campaign_status_and_description(client, admin_token):
    manager = _create_manager_student(client, admin_token)
    created = client.post('/api/campaigns/', json={
        'campaign_id': 'CAMP-1', 'campaign_name': 'Freshers Outreach', 'manager_id': manager['id'],
    }, headers=auth_header(admin_token)).get_json()['campaign']

    resp = client.put(f"/api/campaigns/{created['id']}", json={
        'status': 'active', 'description': 'Now running', 'target_party': 'TESCON',
    }, headers=auth_header(admin_token))
    assert resp.status_code == 200
    updated = resp.get_json()['campaign']
    assert updated['status'] == 'active'
    assert updated['description'] == 'Now running'
    assert updated['target_party'] == 'TESCON'


def test_delete_campaign(client, admin_token):
    manager = _create_manager_student(client, admin_token)
    created = client.post('/api/campaigns/', json={
        'campaign_id': 'CAMP-1', 'campaign_name': 'Freshers Outreach', 'manager_id': manager['id'],
    }, headers=auth_header(admin_token)).get_json()['campaign']

    resp = client.delete(f"/api/campaigns/{created['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 200

    resp = client.get(f"/api/campaigns/{created['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 404


def test_campaign_recommendations_endpoint(client, admin_token):
    manager = _create_manager_student(client, admin_token)
    created = client.post('/api/campaigns/', json={
        'campaign_id': 'CAMP-1', 'campaign_name': 'Freshers Outreach', 'manager_id': manager['id'], 'target_party': 'TESCON',
    }, headers=auth_header(admin_token)).get_json()['campaign']

    resp = client.get(f"/api/campaigns/{created['id']}/recommendations", headers=auth_header(admin_token))
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['target_party'] == 'TESCON'
    assert 'top_influencers' in data and 'bridge_nodes' in data


def test_student_cannot_manage_campaigns(client, student_token):
    resp = client.get('/api/campaigns/', headers=auth_header(student_token))
    assert resp.status_code == 403
