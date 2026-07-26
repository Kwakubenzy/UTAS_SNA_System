"""Knowledge-driven decision support: a small rule-based expert system that
reads the current network's computed statistics and returns plain-language
strategic advice, distinct from the raw numbers already shown elsewhere.

Each rule is an independent condition-action pair (the classic production-rule
form of a knowledge-driven DSS): IF some condition holds over the live
network stats, THEN surface a specific piece of advice. The "knowledge" lives
in this file as an explicit, inspectable rule base, not in a black-box model.
"""
from app.models import db, Student, NetworkMetric, Connection
import logging

logger = logging.getLogger(__name__)


def _collect_stats():
    """Gather the same figures the network-stats endpoint exposes, plus a
    couple of data-quality figures the rule base needs that aren't shown
    elsewhere (profile completeness, party-affiliation coverage)."""
    total_students = Student.query.count()
    total_connections = Connection.query.count()

    if total_students > 1:
        max_edges = (total_students * (total_students - 1)) / 2
        density = total_connections / max_edges if max_edges > 0 else 0
    else:
        density = 0

    avg_clustering = db.session.query(
        db.func.avg(NetworkMetric.clustering_coefficient)
    ).scalar() or 0

    community_sizes = db.session.query(
        NetworkMetric.community_id,
        db.func.count(NetworkMetric.id)
    ).filter(NetworkMetric.community_id != -1).group_by(NetworkMetric.community_id).all()
    community_count = len(community_sizes)
    largest_community_size = max((count for _, count in community_sizes), default=0)

    bridge_node_count = NetworkMetric.query.filter_by(bridge_node=True).count()

    influence_dist = dict(db.session.query(
        NetworkMetric.influence_tier,
        db.func.count(NetworkMetric.id)
    ).group_by(NetworkMetric.influence_tier).all())
    high_count = influence_dist.get('High', 0)

    party_known = Student.query.filter(Student.party.isnot(None), Student.party != '').count()

    incomplete = Student.query.filter(
        db.or_(
            Student.college.is_(None), Student.college == '',
            Student.department.is_(None), Student.department == '',
            Student.year.is_(None),
            Student.email.is_(None), Student.email == '',
        )
    ).count()

    return {
        'total_students': total_students,
        'total_connections': total_connections,
        'density': density,
        'avg_clustering': avg_clustering,
        'community_count': community_count,
        'largest_community_size': largest_community_size,
        'bridge_node_count': bridge_node_count,
        'high_count': high_count,
        'high_pct': (high_count / total_students) if total_students else 0,
        'party_known_pct': (party_known / total_students) if total_students else 0,
        'incomplete_pct': (incomplete / total_students) if total_students else 0,
        'avg_connections_per_student': (total_connections * 2 / total_students) if total_students else 0,
    }


def _rules():
    """The rule base: (id, category, severity, condition, message-builder)."""
    return [
        (
            'sparse-network', 'Network Health', 'warning',
            lambda s: s['total_students'] > 0 and s['density'] < 0.01,
            lambda s: (
                f"The friendship network is very sparse (density {s['density']:.4f}). Structural "
                "results (bridge nodes, communities) are only as reliable as the underlying data — "
                "consider a follow-up survey to capture more complete friendship data."
            ),
        ),
        (
            'no-bridges-fragmented', 'Network Health', 'warning',
            lambda s: s['bridge_node_count'] == 0 and s['community_count'] > 1,
            lambda s: (
                f"No bridge nodes were detected even though {s['community_count']} communities exist. "
                "The network may be too fragmented for one influencer-led message to spread between "
                "groups — plan outreach separately per community rather than relying on cross-community "
                "spread."
            ),
        ),
        (
            'bridges-present', 'Network Health', 'info',
            lambda s: s['bridge_node_count'] > 0,
            lambda s: (
                f"{s['bridge_node_count']} bridge node(s) were identified. These students structurally "
                "connect otherwise-separate communities — losing their engagement would fragment the "
                "network, so prioritise keeping them actively involved throughout the campaign."
            ),
        ),
        (
            'no-clustering', 'Network Health', 'info',
            lambda s: s['total_connections'] > 0 and s['avg_clustering'] == 0,
            lambda s: (
                "Students' friend groups show no overlap (no closed triangles in the network), so "
                "word-of-mouth will spread in a single line rather than reinforcing itself through "
                "mutual friends. Budget for direct outreach touches rather than relying purely on peer "
                "amplification."
            ),
        ),
        (
            'low-high-influence-share', 'Coverage', 'warning',
            lambda s: s['total_students'] > 0 and s['high_pct'] < 0.10,
            lambda s: (
                f"Only {s['high_pct']:.0%} of students are classed as High-influence ({s['high_count']} "
                f"of {s['total_students']}). Relying on a handful of ambassadors risks under-covering "
                "the network — build a broader volunteer base from the Medium tier as well."
            ),
        ),
        (
            'small-largest-community', 'Coverage', 'info',
            lambda s: 0 < s['largest_community_size'] < 10,
            lambda s: (
                f"The largest detected community has only {s['largest_community_size']} members. With "
                "clusters this small, a single big-rally strategy won't scale — plan for many parallel "
                "small-group conversations instead."
            ),
        ),
        (
            'low-party-coverage', 'Data Quality', 'warning',
            lambda s: s['total_students'] > 0 and s['party_known_pct'] < 0.20,
            lambda s: (
                f"Only {s['party_known_pct']:.0%} of students have a declared party affiliation. Most "
                "of the network's political leaning is unknown — treat undeclared students as the real "
                "persuasion target, not just confirmed supporters."
            ),
        ),
        (
            'incomplete-profiles', 'Data Quality', 'warning',
            lambda s: s['total_students'] > 0 and s['incomplete_pct'] > 0.30,
            lambda s: (
                f"Over {s['incomplete_pct']:.0%} of student profiles are missing college, department, "
                "year, or email. Prioritise a data-cleanup pass — incomplete records limit "
                "department- and year-based targeting on the Network Graph page."
            ),
        ),
        (
            'low-avg-connections', 'Data Quality', 'warning',
            lambda s: s['total_students'] > 0 and s['avg_connections_per_student'] < 1,
            lambda s: (
                "Students average under one friendship connection each. This usually means the "
                "data-collection survey wasn't fully completed — a reminder push to boost response "
                "completeness would improve every downstream metric."
            ),
        ),
        (
            'healthy-density', 'Network Health', 'good',
            lambda s: s['density'] >= 0.05,
            lambda s: (
                "The network is reasonably well connected for its size. Structural results "
                "(centrality rankings, communities, bridge nodes) should be dependable enough to base "
                "outreach decisions on directly."
            ),
        ),
    ]


_SEVERITY_ORDER = {'critical': 0, 'warning': 1, 'info': 2, 'good': 3}


def generate_advice():
    """Evaluate the rule base against the current network state and return a
    list of {id, category, severity, message} items, most urgent first."""
    try:
        stats = _collect_stats()

        if stats['total_students'] == 0:
            return {
                'success': True,
                'advice': [{
                    'id': 'no-data',
                    'category': 'Data Quality',
                    'severity': 'warning',
                    'message': 'No students have been imported yet — import survey data and run '
                               'analysis before requesting advice.',
                }],
                'stats_considered': stats,
            }

        advice = []
        for rule_id, category, severity, condition, build_message in _rules():
            try:
                if condition(stats):
                    advice.append({
                        'id': rule_id,
                        'category': category,
                        'severity': severity,
                        'message': build_message(stats),
                    })
            except Exception as rule_error:
                logger.warning(f'Expert advisor rule {rule_id} failed to evaluate: {rule_error}')

        advice.sort(key=lambda a: _SEVERITY_ORDER.get(a['severity'], 9))

        if not advice:
            advice.append({
                'id': 'no-flags',
                'category': 'Network Health',
                'severity': 'good',
                'message': 'No structural issues were flagged in the current network data.',
            })

        return {'success': True, 'advice': advice, 'stats_considered': stats}

    except Exception as e:
        logger.error(f'Expert advisor error: {str(e)}')
        return {'success': False, 'error': str(e)}
