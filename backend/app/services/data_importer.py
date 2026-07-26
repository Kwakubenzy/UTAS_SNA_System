import pandas as pd
import re
import uuid
from app.models import db, Student, Connection
import logging

logger = logging.getLogger(__name__)

# Column headers for the "friendship survey" format (e.g. a Google Forms export
# asking each respondent to name a friend), as opposed to the unified
# from_/to_ CSV format. Each row is one respondent -> friend connection.
#
# Keys here are already run through _normalize_column, since real-world form
# exports tend to have trailing periods/ellipses and stray whitespace baked
# into every header (e.g. 'Name of respondent.', ' Gender .',
# 'Name of your friend in CSC104 class...').
SURVEY_COLUMN_MAP = {
    'from_name': 'name of respondent',
    'from_gender': 'gender',
    'from_department': 'program of study',
    'from_religion': 'respondent religion',
    'from_tribe': 'tribe',
    'from_regional_capital': 'your regional capital',
    'from_hometown': 'your hometown',
    'from_district': 'your district name',
    'to_name': 'name of your friend in csc104 class',
    'to_gender': 'your friend gender',
    'to_department': 'your friend program of study',
    'to_religion': 'your friend religion',
    'to_regional_capital': 'your friend regional capital',
    'to_tribe': 'your friend tribe',
    'to_hometown': 'your friend hometown',
    'to_district': 'district name of your friend',
}


def _normalize_column(col):
    """Normalize a raw column header for robust matching: strip whitespace,
    strip trailing punctuation/ellipses (form exports often truncate long
    questions with '...' or end with a stray '.'), collapse internal
    whitespace, and lowercase."""
    text = str(col).strip()
    text = re.sub(r'[.…]+$', '', text)  # trailing '.', '..', '...', or the ellipsis char
    text = re.sub(r'\s+', ' ', text)
    return text.strip().lower()


class DataImporter:
    """Handles importing unified CSV data into the database"""

    @staticmethod
    def validate_row(row):
        """Validate a single row of data"""
        required_fields = [
            'from_student_id', 'from_name', 'from_party', 'from_college', 'from_department', 'from_year',
            'to_student_id', 'to_name', 'to_party', 'to_college', 'to_department', 'to_year'
        ]
        
        for field in required_fields:
            if pd.isna(row.get(field)) or row.get(field) == '':
                return False, f"Missing required field: {field}"
        
        # Validate party
        if row['from_party'] not in ['TESCON', 'TEIN']:
            return False, f"Invalid party: {row['from_party']}. Must be TESCON or TEIN"
        if row['to_party'] not in ['TESCON', 'TEIN']:
            return False, f"Invalid party: {row['to_party']}. Must be TESCON or TEIN"
        
        # Validate strength if provided
        if 'strength' in row and not pd.isna(row['strength']):
            try:
                strength = int(row['strength'])
                if strength < 1 or strength > 5:
                    return False, f"Strength must be between 1-5, got {strength}"
            except ValueError:
                return False, f"Strength must be numeric, got {row['strength']}"
        
        # Validate year
        try:
            year = int(row['from_year'])
            if year < 1 or year > 4:
                return False, f"Year must be 1-4, got {year}"
        except ValueError:
            return False, f"Year must be numeric, got {row['from_year']}"
        
        return True, "Valid"
    
    @staticmethod
    def import_csv(filepath):
        """
        Import unified CSV file and populate database

        CSV Format:
        from_student_id, from_name, from_tribe, from_party, from_college, from_department, from_year,
        to_student_id, to_name, to_tribe, to_party, to_college, to_department, to_year,
        strength, relationship_type
        """
        try:
            df = pd.read_csv(filepath)
            df.columns = [_normalize_column(c) for c in df.columns]
            logger.info(f"Loaded {len(df)} rows from {filepath}")
            return DataImporter._process_dataframe(df)
        except Exception as e:
            db.session.rollback()
            logger.error(f"Import failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def import_excel(filepath):
        """
        Import unified Excel file (.xlsx/.xls) and populate database

        Same unified format as import_csv, read from the first sheet:
        from_student_id, from_name, from_tribe, from_party, from_college, from_department, from_year,
        to_student_id, to_name, to_tribe, to_party, to_college, to_department, to_year,
        strength, relationship_type
        """
        try:
            df = pd.read_excel(filepath, engine='openpyxl')
            df.columns = [_normalize_column(c) for c in df.columns]
            logger.info(f"Loaded {len(df)} rows from {filepath}")

            if DataImporter.is_survey_format(df.columns):
                logger.info("Detected friendship-survey column format")
                return DataImporter._process_survey_dataframe(df)

            return DataImporter._process_dataframe(df)
        except Exception as e:
            db.session.rollback()
            logger.error(f"Import failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def is_survey_format(columns):
        """Detect the friendship-survey column layout vs the unified from_/to_ layout.
        Expects columns already run through _normalize_column."""
        normalized = set(columns)
        return (
            'name of respondent' in normalized
            and any('name of your friend' in c for c in normalized)
        )

    @staticmethod
    def _clean(value):
        """Convert a pandas cell to a plain string, or None if empty/NaN"""
        if value is None or (isinstance(value, float) and pd.isna(value)) or pd.isna(value):
            return None
        text = str(value).strip()
        return text if text else None

    @staticmethod
    def _get_or_create_student_by_name(name_cache, name, **fields):
        """Get-or-create a Student keyed by case-insensitive name, since the
        survey format has no student IDs. Matches within this import batch
        (name_cache) and against already-existing rows in the database."""
        key = name.strip().lower()

        if key in name_cache:
            return name_cache[key]

        student = Student.query.filter(db.func.lower(Student.name) == key).first()

        if not student:
            student = Student(
                student_id=f"SVY-{uuid.uuid4().hex[:8].upper()}",
                name=name.strip(),
                **fields
            )
            db.session.add(student)
            db.session.flush()
            logger.info(f"Created student from survey: {student.name}")

        name_cache[key] = student
        return student

    @staticmethod
    def _process_survey_dataframe(df):
        """
        Process a friendship-survey DataFrame (respondent -> named friend per row).

        Expected columns (see SURVEY_COLUMN_MAP): Name of respondent, Gender,
        Program of study, Name of your friend in CSC104 class, Your friend gender,
        Your friend program of study, Respondent Religion, Tribe,
        Your regional capital, Your hometown, Your District Name,
        Your friend Religion, Your friend regional capital, Your friend tribe,
        Your friend hometown, District name of your friend.

        There are no student IDs or party/college/year in this format, so students
        are matched/created by name (case-insensitive) and those fields are left
        blank.
        """
        try:
            valid_rows = 0
            invalid_rows = []
            name_cache = {}

            for idx, row in df.iterrows():
                from_name = DataImporter._clean(row.get(SURVEY_COLUMN_MAP['from_name']))
                to_name = DataImporter._clean(row.get(SURVEY_COLUMN_MAP['to_name']))

                if not from_name:
                    invalid_rows.append({'row': idx + 2, 'error': 'Missing respondent name'})
                    continue
                if not to_name:
                    invalid_rows.append({'row': idx + 2, 'error': 'Missing friend name'})
                    continue

                try:
                    from_student = DataImporter._get_or_create_student_by_name(
                        name_cache, from_name,
                        gender=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['from_gender'])),
                        department=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['from_department'])),
                        religion=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['from_religion'])),
                        tribe=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['from_tribe'])),
                        regional_capital=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['from_regional_capital'])),
                        hometown=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['from_hometown'])),
                        district=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['from_district'])),
                    )
                    to_student = DataImporter._get_or_create_student_by_name(
                        name_cache, to_name,
                        gender=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['to_gender'])),
                        department=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['to_department'])),
                        religion=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['to_religion'])),
                        tribe=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['to_tribe'])),
                        regional_capital=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['to_regional_capital'])),
                        hometown=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['to_hometown'])),
                        district=DataImporter._clean(row.get(SURVEY_COLUMN_MAP['to_district'])),
                    )

                    if from_student.id == to_student.id:
                        invalid_rows.append({'row': idx + 2, 'error': 'Respondent and friend are the same person'})
                        continue

                    existing_connection = Connection.query.filter_by(
                        from_student_id=from_student.id,
                        to_student_id=to_student.id
                    ).first()

                    if not existing_connection:
                        connection = Connection(
                            from_student_id=from_student.id,
                            to_student_id=to_student.id,
                            strength=1,
                            relationship_type='Friend'
                        )
                        db.session.add(connection)
                        logger.info(f"Created connection: {from_student.name} -> {to_student.name}")

                    valid_rows += 1

                except Exception as e:
                    invalid_rows.append({'row': idx + 2, 'error': f"Database error: {str(e)}"})
                    logger.error(f"Error processing survey row {idx + 2}: {str(e)}")

            db.session.commit()

            return {
                'success': True,
                'total_rows': len(df),
                'valid_rows': valid_rows,
                'invalid_rows': len(invalid_rows),
                'errors': invalid_rows,
                'students_created': len(Student.query.all()),
                'connections_created': len(Connection.query.all())
            }

        except Exception as e:
            db.session.rollback()
            logger.error(f"Survey import failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def _process_dataframe(df):
        """Validate and persist rows from a unified students+connections DataFrame"""
        try:
            # Validation stats
            valid_rows = 0
            invalid_rows = []
            
            # Process each row
            for idx, row in df.iterrows():
                is_valid, message = DataImporter.validate_row(row)
                
                if not is_valid:
                    invalid_rows.append({
                        'row': idx + 2,  # +2 for header and 1-indexing
                        'error': message
                    })
                    continue
                
                try:
                    # Get or create FROM student
                    from_student = Student.query.filter_by(student_id=str(row['from_student_id'])).first()
                    if not from_student:
                        from_student = Student(
                            student_id=str(row['from_student_id']),
                            name=str(row['from_name']),
                            tribe=str(row.get('from_tribe', '')),
                            party=str(row['from_party']),
                            college=str(row['from_college']),
                            department=str(row['from_department']),
                            year=int(row['from_year'])
                        )
                        db.session.add(from_student)
                        logger.info(f"Created student: {from_student.student_id}")
                    
                    # Get or create TO student
                    to_student = Student.query.filter_by(student_id=str(row['to_student_id'])).first()
                    if not to_student:
                        to_student = Student(
                            student_id=str(row['to_student_id']),
                            name=str(row['to_name']),
                            tribe=str(row.get('to_tribe', '')),
                            party=str(row['to_party']),
                            college=str(row['to_college']),
                            department=str(row['to_department']),
                            year=int(row['to_year'])
                        )
                        db.session.add(to_student)
                        logger.info(f"Created student: {to_student.student_id}")
                    
                    # Flush to assign IDs
                    db.session.flush()
                    
                    # Check if connection already exists
                    existing_connection = Connection.query.filter_by(
                        from_student_id=from_student.id,
                        to_student_id=to_student.id
                    ).first()
                    
                    if not existing_connection:
                        strength = int(row['strength']) if 'strength' in row and not pd.isna(row['strength']) else 1
                        relationship_type = str(row['relationship_type']) if 'relationship_type' in row else None
                        
                        connection = Connection(
                            from_student_id=from_student.id,
                            to_student_id=to_student.id,
                            strength=strength,
                            relationship_type=relationship_type
                        )
                        db.session.add(connection)
                        logger.info(f"Created connection: {from_student.student_id} -> {to_student.student_id}")
                    
                    valid_rows += 1
                    
                except Exception as e:
                    invalid_rows.append({
                        'row': idx + 2,
                        'error': f"Database error: {str(e)}"
                    })
                    logger.error(f"Error processing row {idx + 2}: {str(e)}")
            
            # Commit all changes
            db.session.commit()
            
            return {
                'success': True,
                'total_rows': len(df),
                'valid_rows': valid_rows,
                'invalid_rows': len(invalid_rows),
                'errors': invalid_rows,
                'students_created': len(Student.query.all()),
                'connections_created': len(Connection.query.all())
            }
        
        except Exception as e:
            db.session.rollback()
            logger.error(f"Import failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
