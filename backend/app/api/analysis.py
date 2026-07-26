from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from sqlalchemy import case
from app.models import db, NetworkMetric, Student
from app.services.sna_engine import SNAEngine
from app.services.data_importer import DataImporter
from app.services.activity_service import ActivityService
from app.services.expert_advisor import generate_advice
from app.utils.decorators import token_required, campaign_manager_required
from datetime import datetime
import logging
import os
import tempfile

# NetworkMetric.influence_tier is a plain string column ('High'/'Medium'/'Low');
# sorting it directly is alphabetical (Medium > Low > High), not by actual rank.
TIER_RANK = case(
    (NetworkMetric.influence_tier == 'High', 3),
    (NetworkMetric.influence_tier == 'Medium', 2),
    (NetworkMetric.influence_tier == 'Low', 1),
    else_=0
)

logger = logging.getLogger(__name__)

analysis_bp = Blueprint('analysis', __name__)

EXCEL_EXTENSIONS = ('.xlsx', '.xls')

@analysis_bp.route('/import-csv', methods=['POST'])
@campaign_manager_required
def import_csv():
    """Import CSV data file"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400

        if not file.filename.endswith('.csv'):
            return jsonify({'success': False, 'error': 'File must be CSV format'}), 400

        # Save file temporarily
        safe_name = secure_filename(file.filename)
        fd, temp_path = tempfile.mkstemp(suffix=f'_{safe_name}')
        os.close(fd)
        file.save(temp_path)

        try:
            result = DataImporter.import_csv(temp_path)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

        if result['success']:
            ActivityService.log(
                'data_imported',
                f"Imported {result.get('valid_rows', 0)} of {result.get('total_rows', 0)} rows from {safe_name}"
            )

        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        logger.error(f"Error importing CSV: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@analysis_bp.route('/import-excel', methods=['POST'])
@campaign_manager_required
def import_excel():
    """Import Excel (.xlsx/.xls) data file"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400

        if not file.filename.lower().endswith(EXCEL_EXTENSIONS):
            return jsonify({'success': False, 'error': 'File must be an Excel file (.xlsx or .xls)'}), 400

        safe_name = secure_filename(file.filename)
        suffix = '.xls' if safe_name.lower().endswith('.xls') else '.xlsx'
        fd, temp_path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        file.save(temp_path)

        try:
            result = DataImporter.import_excel(temp_path)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

        if result['success']:
            ActivityService.log(
                'data_imported',
                f"Imported {result.get('valid_rows', 0)} of {result.get('total_rows', 0)} rows from {safe_name}"
            )

        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        logger.error(f"Error importing Excel file: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@analysis_bp.route('/run-analysis', methods=['POST'])
@campaign_manager_required
def run_analysis():
    """Run full SNA analysis on current data"""
    try:
        engine = SNAEngine()
        
        # Run analysis
        success = engine.run_full_analysis()
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Analysis failed'
            }), 500
        
        # Save to database
        save_success = engine.save_metrics_to_db()
        
        if not save_success:
            return jsonify({
                'success': False,
                'error': 'Failed to save metrics'
            }), 500

        ActivityService.log(
            'analysis_run',
            f"Ran analysis on {engine.graph.number_of_nodes()} students, {engine.graph.number_of_edges()} connections"
        )

        return jsonify({
            'success': True,
            'message': 'Analysis completed successfully',
            'metrics': {
                'nodes': engine.graph.number_of_nodes(),
                'edges': engine.graph.number_of_edges(),
                'metrics_calculated': list(engine.metrics.keys())
            }
        }), 200
    except Exception as e:
        logger.error(f"Error running analysis: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@analysis_bp.route('/top-influencers', methods=['GET'])
@token_required
def get_top_influencers():
    """Get top influencers"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        metrics = NetworkMetric.query.order_by(
            TIER_RANK.desc(),
            NetworkMetric.degree_centrality.desc()
        ).limit(limit).all()

        result = []
        for metric in metrics:
            student = Student.query.get(metric.student_id)
            result.append({
                'student': student.to_dict(),
                'metrics': metric.to_dict()
            })

        return jsonify({
            'success': True,
            'count': len(result),
            'influencers': result
        }), 200
    except Exception as e:
        logger.error(f"Error getting top influencers: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@analysis_bp.route('/communities', methods=['GET'])
@token_required
def get_communities():
    """Get community information"""
    try:
        party = request.args.get('party')  # Optional filter by party
        
        # Group students by community
        query = NetworkMetric.query
        
        communities = db.session.query(
            NetworkMetric.community_id,
            db.func.count(NetworkMetric.id).label('size')
        ).group_by(NetworkMetric.community_id).all()
        
        result = []
        for community_id, size in communities:
            community_metrics = NetworkMetric.query.filter_by(community_id=community_id).all()
            
            # Get students in this community
            students = [Student.query.get(m.student_id) for m in community_metrics]
            
            # Get party breakdown
            tescon_count = sum(1 for s in students if s.party == 'TESCON')
            tein_count = sum(1 for s in students if s.party == 'TEIN')
            
            # Get college breakdown
            colleges = {}
            for student in students:
                colleges[student.college] = colleges.get(student.college, 0) + 1
            
            result.append({
                'community_id': community_id,
                'size': size,
                'party_breakdown': {
                    'TESCON': tescon_count,
                    'TEIN': tein_count
                },
                'college_breakdown': colleges,
                'students': [s.to_dict() for s in students]
            })
        
        return jsonify({
            'success': True,
            'community_count': len(result),
            'communities': result
        }), 200
    except Exception as e:
        logger.error(f"Error getting communities: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@analysis_bp.route('/centrality/<metric_type>', methods=['GET'])
@token_required
def get_centrality(metric_type):
    """Get centrality metrics"""
    try:
        limit = request.args.get('limit', 20, type=int)
        
        if metric_type not in ['degree', 'betweenness', 'closeness', 'pagerank']:
            return jsonify({'success': False, 'error': 'Invalid metric type'}), 400
        
        # Map metric type to database field
        metric_fields = {
            'degree': NetworkMetric.degree_centrality,
            'betweenness': NetworkMetric.betweenness_centrality,
            'closeness': NetworkMetric.closeness_centrality,
            'pagerank': NetworkMetric.pagerank_score
        }
        
        metrics = NetworkMetric.query.order_by(
            metric_fields[metric_type].desc()
        ).limit(limit).all()
        
        result = []
        for metric in metrics:
            student = Student.query.get(metric.student_id)
            result.append({
                'student': student.to_dict(),
                'score': getattr(metric, f'{metric_type}_centrality' if metric_type != 'pagerank' else 'pagerank_score')
            })
        
        return jsonify({
            'success': True,
            'metric_type': metric_type,
            'count': len(result),
            'results': result
        }), 200
    except Exception as e:
        logger.error(f"Error getting centrality: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@analysis_bp.route('/bridge-nodes', methods=['GET'])
@token_required
def get_bridge_nodes():
    """Get bridge nodes (students connecting different communities)"""
    try:
        bridges = NetworkMetric.query.filter_by(bridge_node=True).order_by(
            NetworkMetric.betweenness_centrality.desc()
        ).all()
        
        result = []
        for metric in bridges:
            student = Student.query.get(metric.student_id)
            result.append({
                'student': student.to_dict(),
                'betweenness_centrality': metric.betweenness_centrality,
                'community_id': metric.community_id
            })
        
        return jsonify({
            'success': True,
            'count': len(result),
            'bridge_nodes': result
        }), 200
    except Exception as e:
        logger.error(f"Error getting bridge nodes: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@analysis_bp.route('/expert-advice', methods=['GET'])
@token_required
def get_expert_advice():
    """Knowledge-driven DSS: rule-based strategic advice over the current network state"""
    result = generate_advice()
    return jsonify(result), 200 if result.get('success') else 500


@analysis_bp.route('/network-stats', methods=['GET'])
@token_required
def get_network_stats():
    """Get overall network statistics"""
    try:
        from app.models import Connection

        total_students = Student.query.count()
        total_connections = Connection.query.count()
        
        # Density (roughly)
        if total_students > 1:
            max_edges = (total_students * (total_students - 1)) / 2
            density = total_connections / max_edges if max_edges > 0 else 0
        else:
            density = 0
        
        # Average centrality
        avg_degree = db.session.query(
            db.func.avg(NetworkMetric.degree_centrality)
        ).scalar() or 0
        
        avg_betweenness = db.session.query(
            db.func.avg(NetworkMetric.betweenness_centrality)
        ).scalar() or 0
        
        avg_closeness = db.session.query(
            db.func.avg(NetworkMetric.closeness_centrality)
        ).scalar() or 0

        avg_eigenvector = db.session.query(
            db.func.avg(NetworkMetric.eigenvector_centrality)
        ).scalar() or 0

        avg_clustering = db.session.query(
            db.func.avg(NetworkMetric.clustering_coefficient)
        ).scalar() or 0

        # Community count and largest community size (exclude -1 = "not yet analyzed")
        community_sizes = db.session.query(
            NetworkMetric.community_id,
            db.func.count(NetworkMetric.id)
        ).filter(NetworkMetric.community_id != -1).group_by(NetworkMetric.community_id).all()

        communities = len(community_sizes)
        largest_community_size = max((count for _, count in community_sizes), default=0)

        # Influence tier distribution
        influence_dist = db.session.query(
            NetworkMetric.influence_tier,
            db.func.count(NetworkMetric.id)
        ).group_by(NetworkMetric.influence_tier).all()

        return jsonify({
            'success': True,
            'network_stats': {
                'total_students': total_students,
                'total_connections': total_connections,
                'network_density': float(density),
                'average_degree_centrality': float(avg_degree),
                'average_betweenness_centrality': float(avg_betweenness),
                'average_closeness_centrality': float(avg_closeness),
                'average_eigenvector_centrality': float(avg_eigenvector),
                'average_clustering_coefficient': float(avg_clustering),
                'community_count': communities,
                'largest_community_size': largest_community_size,
                'bridge_node_count': NetworkMetric.query.filter_by(bridge_node=True).count(),
                'influence_distribution': {
                    tier: count for tier, count in influence_dist
                }
            }
        }), 200
    except Exception as e:
        logger.error(f"Error getting network stats: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@analysis_bp.route('/graph-data', methods=['GET'])
@token_required
def get_graph_data():
    """Get the full node+edge list for network graph visualization"""
    try:
        from app.models import Connection

        metrics_by_student = {m.student_id: m for m in NetworkMetric.query.all()}

        nodes = []
        for s in Student.query.all():
            m = metrics_by_student.get(s.id)
            nodes.append({
                'id': s.id,
                'name': s.name,
                'student_id': s.student_id,
                'party': s.party,
                'college': s.college,
                'department': s.department,
                'year': s.year,
                'community_id': m.community_id if m else -1,
                'influence_tier': m.influence_tier if m else 'Low',
                'degree_centrality': m.degree_centrality if m else 0.0,
                'pagerank_score': m.pagerank_score if m else 0.0,
                'bridge_node': m.bridge_node if m else False,
            })

        links = [
            {
                'source': c.from_student_id,
                'target': c.to_student_id,
                'strength': c.strength,
                'relationship_type': c.relationship_type,
            }
            for c in Connection.query.all()
        ]

        return jsonify({'success': True, 'nodes': nodes, 'links': links}), 200
    except Exception as e:
        logger.error(f"Error getting graph data: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@analysis_bp.route('/report', methods=['GET'])
@token_required
def generate_report():
    """Generate a downloadable PDF network analysis report"""
    try:
        from app.services.report_generator import ReportGenerator

        buffer = ReportGenerator.generate_network_report()
        filename = f'sna_report_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.pdf'

        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename,
        )
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
