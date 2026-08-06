import pandas as pd
from app.services.data_importer import DataImporter, _normalize_column
from app.models import Student, Connection


SURVEY_COLUMNS = [
    'Name of Respondent', 'Gender', 'Program of Study', 'Political Party', 'College', 'Year of Study',
    'Respondent Religion', 'Tribe', 'Your Regional Capital', 'Your Hometown', 'Your District Name',
    'Name of your friend in CSC104 class...', 'Your friend gender', 'Your friend program of study',
    'Your friend political party', 'Your friend college', 'Your friend year of study',
    'Your friend Religion', 'Your friend regional capital', 'Your friend tribe',
    'Your friend hometown', 'District name of your friend',
]


def _survey_row(**overrides):
    row = {
        'Name of Respondent': 'Kwame Mensah', 'Gender': 'Male', 'Program of Study': 'Computer Science',
        'Political Party': 'TESCON', 'College': 'Engineering', 'Year of Study': '2',
        'Respondent Religion': 'Christian', 'Tribe': 'Akan', 'Your Regional Capital': 'Accra',
        'Your Hometown': 'Kasoa', 'Your District Name': 'Awutu Senya',
        'Name of your friend in CSC104 class...': 'Ama Owusu', 'Your friend gender': 'Female',
        'Your friend program of study': 'Nursing', 'Your friend political party': 'TEIN',
        'Your friend college': 'Health Sciences', 'Your friend year of study': '3',
        'Your friend Religion': 'Christian', 'Your friend regional capital': 'Kumasi',
        'Your friend tribe': 'Ashanti', 'Your friend hometown': 'Obuasi',
        'District name of your friend': 'Obuasi Municipal',
    }
    row.update(overrides)
    return row


def _make_df(*rows):
    df = pd.DataFrame(list(rows), columns=SURVEY_COLUMNS)
    df.columns = [_normalize_column(c) for c in df.columns]
    return df


def test_survey_format_detected():
    df = _make_df(_survey_row())
    assert DataImporter.is_survey_format(df.columns) is True


def test_friend_name_column_matches_any_course_suffix():
    df = _make_df(_survey_row())
    assert DataImporter._find_friend_name_column(df.columns) == 'name of your friend in csc104 class'


def test_survey_import_creates_students_with_party_college_year(app):
    with app.app_context():
        df = _make_df(_survey_row())
        result = DataImporter._process_survey_dataframe(df)
        assert result['success'] is True
        assert result['valid_rows'] == 1

        respondent = Student.query.filter_by(name='Kwame Mensah').first()
        friend = Student.query.filter_by(name='Ama Owusu').first()

        assert respondent.party == 'TESCON'
        assert respondent.college == 'Engineering'
        assert respondent.year == 2
        assert friend.party == 'TEIN'
        assert friend.college == 'Health Sciences'
        assert friend.year == 3

        # Auto-generated ID, not something a respondent typed in.
        assert respondent.student_id.startswith('SVY-')

        assert Connection.query.filter_by(from_student_id=respondent.id, to_student_id=friend.id).first() is not None


def test_survey_import_tolerates_bad_party_and_year(app):
    with app.app_context():
        df = _make_df(_survey_row(**{'Political Party': 'not sure', 'Year of Study': 'sophomore'}))
        result = DataImporter._process_survey_dataframe(df)
        assert result['success'] is True
        assert result['valid_rows'] == 1

        respondent = Student.query.filter_by(name='Kwame Mensah').first()
        assert respondent.party is None
        assert respondent.year is None
