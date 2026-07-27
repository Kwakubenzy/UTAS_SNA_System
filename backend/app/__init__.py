from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from app.models import db
from app.services.auth_service import AuthService
import logging
import os

# load_dotenv() with no argument only searches upward from the process's
# current working directory, never downward -- fine locally (dev always runs
# from backend/), but a WSGI host's cwd isn't guaranteed to be backend/ at
# all, so this pins it to the .env file's actual location instead.
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_BACKEND_DIR, '.env'))

def _build_production_database_uri():
    """Resolve the production SQLALCHEMY_DATABASE_URI.

    DATABASE_URL wins outright if set (e.g. any Postgres reachable over TCP).
    Otherwise, if DB_USER/DB_NAME/INSTANCE_CONNECTION_NAME are set, builds a
    Cloud SQL connection over the Unix socket Cloud Run mounts at
    /cloudsql/<INSTANCE_CONNECTION_NAME> when the instance is attached to the
    service -- this only works from inside Cloud Run/GCE/Cloud Functions, not
    from an arbitrary machine, which is why local migration uses the Cloud SQL
    Auth Proxy over TCP instead (see backend/scripts/migrate_sqlite_to_postgres.py).
    """
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        return database_url

    instance_connection_name = os.getenv('INSTANCE_CONNECTION_NAME')
    db_user = os.getenv('DB_USER')
    db_name = os.getenv('DB_NAME')
    if instance_connection_name and db_user and db_name:
        db_pass = os.getenv('DB_PASS', '')
        return (
            f"postgresql+psycopg2://{db_user}:{db_pass}@/{db_name}"
            f"?host=/cloudsql/{instance_connection_name}"
        )

    return 'sqlite:///sna_system.db'


def create_app(config_name='development'):
    """Application factory"""
    app = Flask(__name__)

    # Configuration
    if config_name == 'production':
        app.config['SQLALCHEMY_DATABASE_URI'] = _build_production_database_uri()
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///sna_system.db'
    
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JSON_SORT_KEYS'] = False  # legacy, no longer read by Flask 3.x's app.json provider
    app.json.sort_keys = False  # dict keys may mix None with strings (e.g. by_college); sorting crashes on that
    
    # JWT Configuration
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 1800  # 30 minutes

    # Google OAuth (Sign in with Google) -- see docs/GOOGLE_LOGIN_SETUP.md
    app.config['GOOGLE_CLIENT_ID'] = os.getenv('GOOGLE_CLIENT_ID', '')
    
    # Initialize extensions
    db.init_app(app)
    # max_age caches each route's CORS preflight (OPTIONS) response in the
    # browser, so repeat requests to the same endpoint skip that extra
    # round trip -- otherwise every single authenticated request (the
    # Authorization header makes it a "non-simple" CORS request) pays for
    # a full second round trip on top of the real one, every time.
    CORS(app, max_age=3600)
    jwt = JWTManager(app)
    
    # Register blueprints
    from app.api.students import students_bp
    from app.api.connections import connections_bp
    from app.api.analysis import analysis_bp
    from app.api.campaigns import campaigns_bp
    from app.api.auth import auth_bp
    from app.api.activity import activity_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(students_bp, url_prefix='/api/students')
    app.register_blueprint(connections_bp, url_prefix='/api/connections')
    app.register_blueprint(analysis_bp, url_prefix='/api/analysis')
    app.register_blueprint(campaigns_bp, url_prefix='/api/campaigns')
    app.register_blueprint(activity_bp, url_prefix='/api/activity')
    
    # Create tables and initialize data
    with app.app_context():
        db.create_all()
        AuthService.ensure_default_roles()
    
    # Setup logging
    logging.basicConfig(level=logging.INFO)
    
    # Health check route
    @app.route('/health', methods=['GET'])
    def health():
        return {'status': 'OK'}, 200
    
    return app
