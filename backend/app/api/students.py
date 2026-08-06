from flask import Blueprint, request, jsonify
from app.models import db, Student, Connection
from app.utils.decorators import token_required, campaign_manager_required
from app.utils.normalize import normalize_department
from app.services.activity_service import ActivityService
import logging

logger = logging.getLogger(__name__)

students_bp = Blueprint('students', __name__)

@students_bp.route('/', methods=['GET'], strict_slashes=False)
@token_required
def get_students():
    """Get all students with optional filtering"""
    try:
        # Query parameters for filtering
        department = request.args.get('department')
        college = request.args.get('college')
        party = request.args.get('party')  # TESCON or TEIN
        year = request.args.get('year')
        
        query = Student.query
        
        if department:
            query = query.filter_by(department=department)
        if college:
            query = query.filter_by(college=college)
        if party:
            query = query.filter_by(party=party)
        if year:
            query = query.filter_by(year=int(year))
        
        students = query.all()
        
        return jsonify({
            'success': True,
            'count': len(students),
            'students': [s.to_dict() for s in students]
        }), 200
    except Exception as e:
        logger.error(f"Error fetching students: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@students_bp.route('/<int:student_id>', methods=['GET'])
@token_required
def get_student(student_id):
    """Get single student by ID"""
    try:
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'success': False, 'error': 'Student not found'}), 404
        
        return jsonify({
            'success': True,
            'student': student.to_dict()
        }), 200
    except Exception as e:
        logger.error(f"Error fetching student: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@students_bp.route('/', methods=['POST'], strict_slashes=False)
@campaign_manager_required
def create_student():
    """Create a new student"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['student_id', 'name', 'party', 'college', 'department', 'year']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing field: {field}'}), 400
        
        # Check if student already exists
        if Student.query.filter_by(student_id=data['student_id']).first():
            return jsonify({'success': False, 'error': 'Student ID already exists'}), 400
        
        # Validate party
        if data['party'] not in ['TESCON', 'TEIN']:
            return jsonify({'success': False, 'error': 'Party must be TESCON or TEIN'}), 400

        if data.get('email') and Student.query.filter_by(email=data['email']).first():
            return jsonify({'success': False, 'error': 'Email is already in use by another student'}), 400

        student = Student(
            student_id=data['student_id'],
            name=data['name'],
            tribe=data.get('tribe'),
            party=data['party'],
            college=data['college'],
            department=normalize_department(data['department']),
            year=data['year'],
            email=data.get('email'),
            phone=data.get('phone')
        )
        
        db.session.add(student)
        db.session.commit()

        logger.info(f"Created student: {student.student_id}")
        ActivityService.log('student_created', f"Added student {student.name} ({student.student_id})")

        return jsonify({
            'success': True,
            'student': student.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating student: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@students_bp.route('/<int:student_id>', methods=['PUT'])
@campaign_manager_required
def update_student(student_id):
    """Update a student"""
    try:
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'success': False, 'error': 'Student not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            student.name = data['name']
        if 'tribe' in data:
            student.tribe = data['tribe']
        if 'party' in data:
            if data['party'] not in ['TESCON', 'TEIN']:
                return jsonify({'success': False, 'error': 'Party must be TESCON or TEIN'}), 400
            student.party = data['party']
        if 'college' in data:
            student.college = data['college']
        if 'department' in data:
            student.department = normalize_department(data['department'])
        if 'year' in data:
            student.year = data['year']
        if 'email' in data:
            if data['email'] and data['email'] != student.email and Student.query.filter_by(email=data['email']).first():
                return jsonify({'success': False, 'error': 'Email is already in use by another student'}), 400
            student.email = data['email']
        if 'phone' in data:
            student.phone = data['phone']
        
        db.session.commit()
        logger.info(f"Updated student: {student.student_id}")
        
        return jsonify({
            'success': True,
            'student': student.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating student: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@students_bp.route('/<int:student_id>', methods=['DELETE'])
@campaign_manager_required
def delete_student(student_id):
    """Delete a student"""
    try:
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'success': False, 'error': 'Student not found'}), 404

        student_name, student_number = student.name, student.student_id

        # Deleting a Student doesn't cascade to its Connection rows on its
        # own (no cascade='delete' on the relationship), which would
        # otherwise leave orphaned connections pointing at a student that
        # no longer exists -- silently corrupting the graph the next time
        # analysis runs.
        Connection.query.filter(
            db.or_(Connection.from_student_id == student_id, Connection.to_student_id == student_id)
        ).delete(synchronize_session=False)

        db.session.delete(student)
        db.session.commit()

        logger.info(f"Deleted student: {student_number}")
        ActivityService.log('student_deleted', f"Removed student {student_name} ({student_number})")

        return jsonify({'success': True, 'message': 'Student deleted'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting student: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@students_bp.route('/stats/summary', methods=['GET'])
@token_required
def get_stats():
    """Get summary statistics"""
    try:
        total_students = Student.query.count()
        
        # Count by party
        tescon_count = Student.query.filter_by(party='TESCON').count()
        tein_count = Student.query.filter_by(party='TEIN').count()
        
        # Count by college
        colleges = db.session.query(
            Student.college,
            db.func.count(Student.id)
        ).group_by(Student.college).all()
        
        # Count by department
        departments = db.session.query(
            Student.department,
            db.func.count(Student.id)
        ).group_by(Student.department).all()
        
        return jsonify({
            'success': True,
            'total_students': total_students,
            'by_party': {
                'TESCON': tescon_count,
                'TEIN': tein_count
            },
            'by_college': {college: count for college, count in colleges},
            'by_department': {dept: count for dept, count in departments}
        }), 200
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
