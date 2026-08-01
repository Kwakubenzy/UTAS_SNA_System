from flask import Blueprint, request, jsonify
from app.models import db, Connection, Student
from app.utils.decorators import token_required, campaign_manager_required
from app.services.activity_service import ActivityService
import logging

logger = logging.getLogger(__name__)

connections_bp = Blueprint('connections', __name__)

@connections_bp.route('/', methods=['GET'], strict_slashes=False)
@token_required
def get_connections():
    """Get all connections with optional filtering"""
    try:
        from_id = request.args.get('from_id')
        to_id = request.args.get('to_id')
        
        query = Connection.query
        
        if from_id:
            query = query.filter_by(from_student_id=int(from_id))
        if to_id:
            query = query.filter_by(to_student_id=int(to_id))
        
        connections = query.all()
        
        result = []
        for conn in connections:
            result.append({
                'connection': conn.to_dict(),
                'from_student': Student.query.get(conn.from_student_id).to_dict(),
                'to_student': Student.query.get(conn.to_student_id).to_dict()
            })
        
        return jsonify({
            'success': True,
            'count': len(result),
            'connections': result
        }), 200
    except Exception as e:
        logger.error(f"Error fetching connections: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@connections_bp.route('/<int:connection_id>', methods=['GET'])
@token_required
def get_connection(connection_id):
    """Get single connection by ID"""
    try:
        conn = Connection.query.get(connection_id)
        if not conn:
            return jsonify({'success': False, 'error': 'Connection not found'}), 404
        
        return jsonify({
            'success': True,
            'connection': conn.to_dict(),
            'from_student': Student.query.get(conn.from_student_id).to_dict(),
            'to_student': Student.query.get(conn.to_student_id).to_dict()
        }), 200
    except Exception as e:
        logger.error(f"Error fetching connection: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@connections_bp.route('/', methods=['POST'], strict_slashes=False)
@campaign_manager_required
def create_connection():
    """Create a new connection"""
    try:
        data = request.get_json()
        
        # Validation
        if 'from_student_id' not in data or 'to_student_id' not in data:
            return jsonify({'success': False, 'error': 'Missing from_student_id or to_student_id'}), 400
        
        from_id = int(data['from_student_id'])
        to_id = int(data['to_student_id'])
        
        # Check if students exist
        from_student = Student.query.get(from_id)
        if not from_student:
            return jsonify({'success': False, 'error': 'From student not found'}), 404
        to_student = Student.query.get(to_id)
        if not to_student:
            return jsonify({'success': False, 'error': 'To student not found'}), 404
        
        # Check if connection already exists -- friendship is treated as
        # undirected everywhere else in the system (SNAEngine builds an
        # nx.Graph(), not a DiGraph), so a connection in either direction
        # between the same two students counts as a duplicate.
        if Connection.query.filter(
            db.or_(
                db.and_(Connection.from_student_id == from_id, Connection.to_student_id == to_id),
                db.and_(Connection.from_student_id == to_id, Connection.to_student_id == from_id),
            )
        ).first():
            return jsonify({'success': False, 'error': 'Connection already exists'}), 400

        strength = data.get('strength')
        if strength is None:
            strength = 1
        if not isinstance(strength, int) or strength < 1 or strength > 5:
            return jsonify({'success': False, 'error': 'Strength must be an integer between 1-5'}), 400
        
        connection = Connection(
            from_student_id=from_id,
            to_student_id=to_id,
            strength=strength,
            relationship_type=data.get('relationship_type')
        )
        
        db.session.add(connection)
        db.session.commit()

        logger.info(f"Created connection: {from_id} -> {to_id}")
        ActivityService.log('connection_created', f"Connected {from_student.name} and {to_student.name}")

        return jsonify({
            'success': True,
            'connection': connection.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating connection: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@connections_bp.route('/<int:connection_id>', methods=['PUT'])
@campaign_manager_required
def update_connection(connection_id):
    """Update a connection"""
    try:
        conn = Connection.query.get(connection_id)
        if not conn:
            return jsonify({'success': False, 'error': 'Connection not found'}), 404
        
        data = request.get_json()
        
        if 'strength' in data:
            strength = data['strength']
            if not isinstance(strength, int) or strength < 1 or strength > 5:
                return jsonify({'success': False, 'error': 'Strength must be an integer between 1-5'}), 400
            conn.strength = strength
        
        if 'relationship_type' in data:
            conn.relationship_type = data['relationship_type']
        
        db.session.commit()
        logger.info(f"Updated connection: {connection_id}")
        
        return jsonify({
            'success': True,
            'connection': conn.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating connection: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@connections_bp.route('/<int:connection_id>', methods=['DELETE'])
@campaign_manager_required
def delete_connection(connection_id):
    """Delete a connection"""
    try:
        conn = Connection.query.get(connection_id)
        if not conn:
            return jsonify({'success': False, 'error': 'Connection not found'}), 404

        from_student = Student.query.get(conn.from_student_id)
        to_student = Student.query.get(conn.to_student_id)

        db.session.delete(conn)
        db.session.commit()

        logger.info(f"Deleted connection: {connection_id}")
        if from_student and to_student:
            ActivityService.log('connection_deleted', f"Removed connection between {from_student.name} and {to_student.name}")


        return jsonify({'success': True, 'message': 'Connection deleted'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting connection: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@connections_bp.route('/student/<int:student_id>/friends', methods=['GET'])
@token_required
def get_student_friends(student_id):
    """Get all friends (connections) of a student"""
    try:
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'success': False, 'error': 'Student not found'}), 404
        
        # Get outgoing connections
        connections = Connection.query.filter_by(from_student_id=student_id).all()
        
        friends = []
        for conn in connections:
            friend = Student.query.get(conn.to_student_id)
            friends.append({
                'connection_id': conn.id,
                'friend': friend.to_dict(),
                'strength': conn.strength,
                'relationship_type': conn.relationship_type
            })
        
        return jsonify({
            'success': True,
            'student_id': student_id,
            'friend_count': len(friends),
            'friends': friends
        }), 200
    except Exception as e:
        logger.error(f"Error fetching friends: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@connections_bp.route('/stats/summary', methods=['GET'])
@token_required
def get_connection_stats():
    """Get connection statistics"""
    try:
        total_connections = Connection.query.count()
        
        # Average strength
        avg_strength = db.session.query(
            db.func.avg(Connection.strength)
        ).scalar() or 0
        
        # Count by relationship type
        rel_types = db.session.query(
            Connection.relationship_type,
            db.func.count(Connection.id)
        ).group_by(Connection.relationship_type).all()
        
        # Count by strength
        strengths = db.session.query(
            Connection.strength,
            db.func.count(Connection.id)
        ).group_by(Connection.strength).all()
        
        return jsonify({
            'success': True,
            'total_connections': total_connections,
            'average_strength': float(avg_strength),
            'by_relationship_type': {str(rel_type): count for rel_type, count in rel_types},
            'by_strength': {str(strength): count for strength, count in strengths}
        }), 200
    except Exception as e:
        logger.error(f"Error getting connection stats: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
