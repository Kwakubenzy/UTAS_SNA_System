from conftest import auth_header


def _create_student_with_metric(client, admin_token, app, **metric_overrides):
    from app.models import db, NetworkMetric

    student = client.post('/api/students/', json={
        'student_id': 'S001', 'name': 'Ama Mensah', 'party': 'TESCON',
        'college': 'Engineering', 'department': 'Bsc Computer Science', 'year': 2,
    }, headers=auth_header(admin_token)).get_json()['student']

    with app.app_context():
        metric = NetworkMetric(student_id=student['id'], degree_centrality=0.5, community_id=0, **metric_overrides)
        db.session.add(metric)
        db.session.commit()

    return student


def _add_orphaned_metric(app, student_id, **overrides):
    """A NetworkMetric row whose student was deleted without going through
    the model's cascade -- the exact situation that used to 500 every
    endpoint below (see one_time_data_cleanup.py's remove_orphaned_rows)."""
    from app.models import db, NetworkMetric

    with app.app_context():
        metric = NetworkMetric(student_id=student_id, degree_centrality=0.9, community_id=0, **overrides)
        db.session.add(metric)
        db.session.commit()


def test_top_influencers_skips_orphaned_metric(client, admin_token, app):
    _create_student_with_metric(client, admin_token, app)
    _add_orphaned_metric(app, student_id=9999)

    resp = client.get('/api/analysis/top-influencers', headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.get_json()['count'] == 1


def test_communities_skips_orphaned_metric(client, admin_token, app):
    _create_student_with_metric(client, admin_token, app)
    _add_orphaned_metric(app, student_id=9999)

    resp = client.get('/api/analysis/communities', headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.get_json()['communities'][0]['students'][0]['id'] is not None


def test_centrality_skips_orphaned_metric(client, admin_token, app):
    _create_student_with_metric(client, admin_token, app)
    _add_orphaned_metric(app, student_id=9999)

    resp = client.get('/api/analysis/centrality/degree', headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.get_json()['count'] == 1


def test_bridge_nodes_skips_orphaned_metric(client, admin_token, app):
    _create_student_with_metric(client, admin_token, app, bridge_node=True)
    _add_orphaned_metric(app, student_id=9999, bridge_node=True)

    resp = client.get('/api/analysis/bridge-nodes', headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.get_json()['count'] == 1
