import pandas as pd
import re
import uuid
from app.models import db, Student, Connection
from app.utils.normalize import normalize_department
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
# Each field lists the question phrasings it accepts, in priority order --
# different survey rounds word the same question differently ("College" vs
# "School", "Year of Study" vs "Level"), and a silent mismatch here means
# the answers silently vanish from the import.
SURVEY_COLUMN_CANDIDATES = {
    'from_name': ['name of respondent', 'respondent name', 'your name'],
    'from_gender': ['gender', 'your gender'],
    'from_department': ['program of study', 'programme of study', 'your program of study', 'department'],
    'from_religion': ['respondent religion', 'religion', 'your religion'],
    'from_tribe': ['tribe', 'your tribe'],
    'from_regional_capital': ['your regional capital', 'regional capital'],
    'from_hometown': ['your hometown', 'hometown'],
    'from_district': ['your district name', 'your district', 'district'],
    'from_party': ['political party', 'your political party', 'party'],
    'from_college': ['college', 'school', 'your college', 'your school'],
    'from_year': ['year of study', 'your year of study', 'year', 'level'],
    'to_gender': ['your friend gender', 'your friends gender', 'friend gender'],
    'to_department': ['your friend program of study', 'your friends program of study',
                      'your friend programme of study', 'friend program of study'],
    'to_religion': ['your friend religion', 'your friends religion', 'friend religion'],
    'to_regional_capital': ['your friend regional capital', 'your friends regional capital'],
    'to_tribe': ['your friend tribe', 'your friends tribe', 'friend tribe'],
    'to_hometown': ['your friend hometown', 'your friends hometown', 'friend hometown'],
    'to_district': ['district name of your friend', 'your friend district', 'your friends district'],
    'to_party': ['your friend political party', 'your friends political party', 'your friend party'],
    'to_college': ['your friend college', 'your friend school', 'your friends college',
                   'your friends school', 'college of your friend', 'school of your friend'],
    'to_year': ['your friend year of study', 'your friends year of study', 'your friend year',
                'your friend level'],
}


def _resolve_survey_columns(columns):
    """Map each survey field to whichever candidate header the file actually
    uses (None if absent -- every field except the two names is optional)."""
    present = set(columns)
    return {
        field: next((c for c in candidates if c in present), None)
        for field, candidates in SURVEY_COLUMN_CANDIDATES.items()
    }


# Phrases that mean "I'm not answering", typed into a name box. Kept in
# sync with scripts/one_time_data_cleanup.py, which removes records that
# earlier imports created before this check existed.
#
# Multi-word phrases are safe to match anywhere in the string. Short single
# words are matched only as whole words -- a substring test would reject
# real names ("Danilo" contains "nil", "Nilsson" starts with it).
NON_ANSWER_PHRASES = (
    "don't have", 'dont have', 'no friend', 'not applicable', 'no one',
    'no answer', 'prefer not', 'i have no', 'not sure',
)
NON_ANSWER_WORDS = ('none', 'nil', 'n/a', 'na', 'nobody', 'nothing', 'nan')


def _is_non_answer(name):
    """True if a name field holds a refusal/placeholder rather than a person.
    Also treats anything longer than five words as prose, since real names
    in this dataset run two to four words."""
    text = str(name).strip().lower()
    if not text:
        return True

    words = text.split()
    if len(words) > 5:
        return True
    if any(phrase in text for phrase in NON_ANSWER_PHRASES):
        return True
    # Whole-string match only: "None" is a refusal, "Nilsson" is a surname.
    return text in NON_ANSWER_WORDS


def _clean_party(value):
    """Normalize a free-typed party answer to TESCON/TEIN, or None if it
    doesn't recognizably match either -- survey answers are typed by
    hundreds of different respondents, so this stays forgiving rather than
    rejecting the whole row over a stray typo in an optional field."""
    if value is None:
        return None
    text = str(value).strip().upper()
    if text in ('TESCON', 'TEIN'):
        return text
    return None


def _clean_year(value):
    """Normalize a year-of-study answer to an int 1-4, or None. Handles the
    numeric cells a Google Sheets/Excel export produces (pandas reads them
    as floats, so the answer "2" arrives here as 2.0)."""
    if value is None:
        return None
    try:
        year = int(float(str(value).strip()))
    except (ValueError, OverflowError):
        return None
    return year if 1 <= year <= 4 else None


def _normalize_column(col):
    """Normalize a raw column header for robust matching: strip whitespace,
    strip trailing punctuation/ellipses (form exports often truncate long
    questions with '...' or end with a stray '.'), collapse internal
    whitespace, and lowercase."""
    text = str(col).strip()
    text = re.sub(r'[.…]+$', '', text)  # trailing '.', '..', '...', or the ellipsis char
    # "your friend's gender" == "your friends gender". Both the plain ASCII
    # apostrophe and the curly one Google Forms substitutes automatically.
    text = text.replace("'", '').replace('’', '')
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
        return (
            DataImporter._find_respondent_name_column(columns) is not None
            and DataImporter._find_friend_name_column(columns) is not None
        )

    @staticmethod
    def _find_respondent_name_column(columns):
        """The respondent's-name question, however this round worded it."""
        present = set(columns)
        for candidate in SURVEY_COLUMN_CANDIDATES['from_name']:
            if candidate in present:
                return candidate
        return None

    @staticmethod
    def _find_friend_name_column(columns):
        """The friend's-name question varies by course/cohort (e.g. 'Name of
        your friend in CSC104 class...'), so match by prefix instead of a
        hardcoded exact phrase -- anything starting with 'name of your
        friend' works, whatever comes after it."""
        for c in columns:
            if c.startswith('name of your friend') or c.startswith('name of your friends'):
                return c
        return None

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

        Column headers are matched flexibly (see SURVEY_COLUMN_CANDIDATES),
        so a survey round that says "School" instead of "College", or
        "Programme" instead of "Program", still imports correctly. Every
        field except the two names is optional -- a missing question just
        leaves that attribute blank rather than failing the row.

        There are no student IDs in this format, so students are
        matched/created by name (case-insensitive) and get an
        auto-generated SVY-XXXXXXXX id instead.
        """
        try:
            valid_rows = 0
            invalid_rows = []
            name_cache = {}

            cols = _resolve_survey_columns(df.columns)
            to_name_col = DataImporter._find_friend_name_column(df.columns)

            def cell(row, field):
                """Read a survey field from this row, or None if the survey
                round didn't ask that question at all."""
                col = cols.get(field)
                return row.get(col) if col else None

            for idx, row in df.iterrows():
                from_name = DataImporter._clean(cell(row, 'from_name'))
                to_name = DataImporter._clean(row.get(to_name_col)) if to_name_col else None

                if not from_name:
                    invalid_rows.append({'row': idx + 2, 'error': 'Missing respondent name'})
                    continue
                if not to_name:
                    invalid_rows.append({'row': idx + 2, 'error': 'Missing friend name'})
                    continue

                # A respondent who declines to name anyone often types a
                # sentence into the name box ("I don't have a friend in
                # csc104"). Without this, that text becomes a phantom
                # student wired into the graph.
                if _is_non_answer(from_name):
                    invalid_rows.append({'row': idx + 2, 'error': f'Respondent name is a non-answer: {from_name!r}'})
                    continue
                if _is_non_answer(to_name):
                    invalid_rows.append({'row': idx + 2, 'error': f'Friend name is a non-answer: {to_name!r}'})
                    continue

                try:
                    from_student = DataImporter._get_or_create_student_by_name(
                        name_cache, from_name,
                        gender=DataImporter._clean(cell(row, 'from_gender')),
                        department=normalize_department(cell(row, 'from_department')),
                        religion=DataImporter._clean(cell(row, 'from_religion')),
                        tribe=DataImporter._clean(cell(row, 'from_tribe')),
                        regional_capital=DataImporter._clean(cell(row, 'from_regional_capital')),
                        hometown=DataImporter._clean(cell(row, 'from_hometown')),
                        district=DataImporter._clean(cell(row, 'from_district')),
                        party=_clean_party(cell(row, 'from_party')),
                        college=DataImporter._clean(cell(row, 'from_college')),
                        year=_clean_year(cell(row, 'from_year')),
                    )
                    to_student = DataImporter._get_or_create_student_by_name(
                        name_cache, to_name,
                        gender=DataImporter._clean(cell(row, 'to_gender')),
                        department=normalize_department(cell(row, 'to_department')),
                        religion=DataImporter._clean(cell(row, 'to_religion')),
                        tribe=DataImporter._clean(cell(row, 'to_tribe')),
                        regional_capital=DataImporter._clean(cell(row, 'to_regional_capital')),
                        hometown=DataImporter._clean(cell(row, 'to_hometown')),
                        district=DataImporter._clean(cell(row, 'to_district')),
                        party=_clean_party(cell(row, 'to_party')),
                        college=DataImporter._clean(cell(row, 'to_college')),
                        year=_clean_year(cell(row, 'to_year')),
                    )

                    if from_student.id == to_student.id:
                        invalid_rows.append({'row': idx + 2, 'error': 'Respondent and friend are the same person'})
                        continue

                    # Friendship is undirected everywhere else in the system
                    # (SNAEngine builds an nx.Graph), so if B already named A,
                    # A naming B is the same edge -- not a second one. Without
                    # this, mutual nominations double-count as two connections.
                    existing_connection = Connection.query.filter(
                        db.or_(
                            db.and_(Connection.from_student_id == from_student.id,
                                    Connection.to_student_id == to_student.id),
                            db.and_(Connection.from_student_id == to_student.id,
                                    Connection.to_student_id == from_student.id),
                        )
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
                            department=normalize_department(row['from_department']),
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
                            department=normalize_department(row['to_department']),
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
