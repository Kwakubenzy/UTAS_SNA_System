from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class Role(db.Model):
    """User role model with permissions"""
    __tablename__ = 'roles'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    description = db.Column(db.String(256))
    
    # Relationships
    users = db.relationship('User', backref='role', lazy='dynamic')
    
    def __repr__(self):
        return f'<Role {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }


class User(db.Model):
    """User account model"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    
    # Profile fields
    tribe = db.Column(db.String(64))
    party = db.Column(db.String(64))  # TESCON, TEIN, etc
    college = db.Column(db.String(120))
    department = db.Column(db.String(120))
    year = db.Column(db.Integer)  # Year of study
    
    # Account fields
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False, default=3)  # Default to Student
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime)
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verify password"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self, include_sensitive=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'tribe': self.tribe,
            'party': self.party,
            'college': self.college,
            'department': self.department,
            'year': self.year,
            'role': self.role.name if self.role else 'student',
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
        return data
    
    def is_admin(self):
        """Check if user is admin"""
        return self.role and self.role.name == 'admin'
    
    def is_campaign_manager(self):
        """Check if user is campaign manager"""
        return self.role and self.role.name == 'campaign_manager'


class Student(db.Model):
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    tribe = db.Column(db.String(50), nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    party = db.Column(db.String(20), nullable=True)  # TESCON or TEIN
    college = db.Column(db.String(100), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    year = db.Column(db.Integer, nullable=True)
    religion = db.Column(db.String(64), nullable=True)
    hometown = db.Column(db.String(120), nullable=True)
    district = db.Column(db.String(120), nullable=True)
    regional_capital = db.Column(db.String(120), nullable=True)
    email = db.Column(db.String(100), unique=True, nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships. cascade='all, delete-orphan' so deleting a Student also
    # deletes their connections/metrics, in every deletion path (API route,
    # one-off scripts, admin tooling) -- without it, SQLAlchemy's default
    # behavior on delete is to try nulling the child's foreign key instead,
    # which fails outright for NetworkMetric.student_id (NOT NULL) and
    # silently orphans rows for Connection (no NOT NULL to catch it).
    connections_from = db.relationship(
        'Connection', foreign_keys='Connection.from_student_id', backref='from_student_rel',
        cascade='all, delete-orphan',
    )
    connections_to = db.relationship(
        'Connection', foreign_keys='Connection.to_student_id', backref='to_student_rel',
        cascade='all, delete-orphan',
    )
    metrics = db.relationship('NetworkMetric', backref='student', uselist=False, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Student {self.student_id}: {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'name': self.name,
            'tribe': self.tribe,
            'gender': self.gender,
            'party': self.party,
            'college': self.college,
            'department': self.department,
            'year': self.year,
            'religion': self.religion,
            'hometown': self.hometown,
            'district': self.district,
            'regional_capital': self.regional_capital,
            'email': self.email,
            'phone': self.phone,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Connection(db.Model):
    __tablename__ = 'connections'
    
    id = db.Column(db.Integer, primary_key=True)
    from_student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    to_student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    strength = db.Column(db.Integer, default=1)  # 1-5 scale
    relationship_type = db.Column(db.String(50), nullable=True)  # Close Friend, Best Friend, etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Connection {self.from_student_id} -> {self.to_student_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'from_student_id': self.from_student_id,
            'to_student_id': self.to_student_id,
            'strength': self.strength,
            'relationship_type': self.relationship_type,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class NetworkMetric(db.Model):
    __tablename__ = 'network_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False, unique=True)
    degree_centrality = db.Column(db.Float, default=0.0)
    betweenness_centrality = db.Column(db.Float, default=0.0)
    closeness_centrality = db.Column(db.Float, default=0.0)
    eigenvector_centrality = db.Column(db.Float, default=0.0)
    pagerank_score = db.Column(db.Float, default=0.0)
    clustering_coefficient = db.Column(db.Float, default=0.0)
    community_id = db.Column(db.Integer, default=-1)  # Community detection result
    influence_tier = db.Column(db.String(20), default='Low')  # High, Medium, Low
    bridge_node = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<NetworkMetric Student_ID:{self.student_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'degree_centrality': self.degree_centrality,
            'betweenness_centrality': self.betweenness_centrality,
            'closeness_centrality': self.closeness_centrality,
            'eigenvector_centrality': self.eigenvector_centrality,
            'pagerank_score': self.pagerank_score,
            'clustering_coefficient': self.clustering_coefficient,
            'community_id': self.community_id,
            'influence_tier': self.influence_tier,
            'bridge_node': self.bridge_node,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Campaign(db.Model):
    __tablename__ = 'campaigns'
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.String(50), unique=True, nullable=False)
    campaign_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    manager_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    target_party = db.Column(db.String(20), nullable=True)  # TESCON or TEIN
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default='planning')  # planning, active, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Campaign {self.campaign_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'campaign_name': self.campaign_name,
            'description': self.description,
            'manager_id': self.manager_id,
            'target_party': self.target_party,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(50), nullable=False)  # e.g. 'student_created'
    description = db.Column(db.String(255), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User')

    def __repr__(self):
        return f'<ActivityLog {self.action}: {self.description}>'

    def to_dict(self):
        return {
            'id': self.id,
            'action': self.action,
            'description': self.description,
            'username': self.user.username if self.user else None,
            'created_at': self.created_at.isoformat(),
        }
