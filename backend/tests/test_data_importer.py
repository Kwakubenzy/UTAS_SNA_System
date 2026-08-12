import pandas as pd
from conftest import auth_header
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


def test_survey_import_rejects_non_answer_friend_name(app):
    """Regression: a respondent typing "I don't have a friend in csc104"
    into the name box used to become a real student in the graph."""
    with app.app_context():
        df = _make_df(_survey_row(**{
            'Name of your friend in CSC104 class...': "I don't have a friend in csc104",
        }))
        result = DataImporter._process_survey_dataframe(df)
        assert result['success'] is True
        assert result['valid_rows'] == 0
        assert result['invalid_rows'] == 1
        assert Student.query.filter(Student.name.ilike('%have a friend%')).first() is None


def test_survey_import_rejects_placeholder_names(app):
    with app.app_context():
        for placeholder in ['None', 'N/A', 'nobody', 'nil']:
            df = _make_df(_survey_row(**{'Name of your friend in CSC104 class...': placeholder}))
            result = DataImporter._process_survey_dataframe(df)
            assert result['valid_rows'] == 0, f'{placeholder!r} should be rejected'


def test_survey_import_keeps_real_names_that_contain_marker_substrings(app):
    """'Danilo' contains 'nil'; 'Simone' contains 'one'. Both are people."""
    with app.app_context():
        df = _make_df(_survey_row(**{'Name of your friend in CSC104 class...': 'Danilo Nilsson'}))
        result = DataImporter._process_survey_dataframe(df)
        assert result['valid_rows'] == 1
        assert Student.query.filter_by(name='Danilo Nilsson').first() is not None


def test_survey_import_skips_reverse_duplicate_connection(app):
    """A and B each naming the other is one undirected friendship, not two."""
    with app.app_context():
        df = _make_df(
            _survey_row(),
            _survey_row(**{
                'Name of Respondent': 'Ama Owusu',
                'Name of your friend in CSC104 class...': 'Kwame Mensah',
            }),
        )
        result = DataImporter._process_survey_dataframe(df)
        assert result['success'] is True
        assert result['valid_rows'] == 2
        assert Connection.query.count() == 1


def test_survey_columns_match_alternate_wordings(app):
    """A later survey round says School/Programme/Level instead of
    College/Program/Year of Study -- the answers must still land."""
    with app.app_context():
        columns = [
            'Name of Respondent', 'Gender', 'Programme of Study', 'Party', 'School', 'Level',
            'Name of your friend', "Your friend's gender", 'Your friend programme of study',
            'Your friend party', 'Your friend school', 'Your friend level',
        ]
        row = {
            'Name of Respondent': 'Yaw Boateng', 'Gender': 'Male',
            'Programme of Study': 'BSC INFORMATION TECHNOLOGY', 'Party': 'TEIN',
            'School': 'Applied Sciences', 'Level': 3,
            'Name of your friend': 'Abena Sarpong', "Your friend's gender": 'Female',
            'Your friend programme of study': 'Computer Science',
            'Your friend party': 'TESCON', 'Your friend school': 'Applied Sciences',
            'Your friend level': 2,
        }
        df = pd.DataFrame([row], columns=columns)
        df.columns = [_normalize_column(c) for c in df.columns]

        assert DataImporter.is_survey_format(df.columns) is True
        result = DataImporter._process_survey_dataframe(df)
        assert result['valid_rows'] == 1

        respondent = Student.query.filter_by(name='Yaw Boateng').first()
        friend = Student.query.filter_by(name='Abena Sarpong').first()
        assert respondent.college == 'Applied Sciences'
        assert respondent.year == 3           # numeric cell, not a string
        assert respondent.party == 'TEIN'
        assert respondent.department == 'Bsc Information Technology'
        assert friend.gender == 'Female'      # matched via the apostrophe variant
        assert friend.year == 2


def test_survey_import_tolerates_missing_optional_columns(app):
    """A minimal survey with only the two name questions must still work."""
    with app.app_context():
        df = pd.DataFrame(
            [{'Name of Respondent': 'Kojo Antwi', 'Name of your friend': 'Esi Mensah'}],
            columns=['Name of Respondent', 'Name of your friend'],
        )
        df.columns = [_normalize_column(c) for c in df.columns]

        assert DataImporter.is_survey_format(df.columns) is True
        result = DataImporter._process_survey_dataframe(df)
        assert result['success'] is True
        assert result['valid_rows'] == 1
        assert Connection.query.count() == 1


def test_end_to_end_google_forms_xlsx_upload(client, admin_token, app):
    """Full path: a realistic Google Forms .xlsx export (timestamp and email
    columns, curly apostrophes, numeric levels, a refusal, a mutual
    nomination, messy department spellings) uploaded through the real
    endpoint the Import button calls."""
    import io

    cols = ['Timestamp', 'Email Address', 'Name of Respondent', 'Gender', 'Programme of Study',
            'School', 'Level', 'Political Party', 'Name of your friend',
            "Your friend\u2019s gender", 'Your friend programme of study', 'Your friend level']

    def r(resp, friend, **kw):
        base = {
            'Timestamp': '2026/08/12 9:14:03 AM', 'Email Address': 'x@utas.edu',
            'Name of Respondent': resp, 'Gender': 'Male',
            'Programme of Study': 'BSC COMPUTER SCIENCE', 'School': 'Applied Sciences',
            'Level': 2, 'Political Party': 'TESCON', 'Name of your friend': friend,
            "Your friend\u2019s gender": 'Female',
            'Your friend programme of study': 'bsc. computer science', 'Your friend level': 3,
        }
        base.update(kw)
        return base

    rows = [
        r('Kwame Mensah', 'Ama Owusu'),
        r('Ama Owusu', 'Kwame Mensah'),                       # mutual: one edge, not two
        r('Kofi Asante', "I don't have a friend on campus"),  # refusal: rejected
        r('Yaa Boateng', 'Kwame Mensah', **{'Programme of Study': 'Computer Science'}),
    ]
    buf = io.BytesIO()
    pd.DataFrame(rows, columns=cols).to_excel(buf, index=False, engine='openpyxl')
    buf.seek(0)

    resp = client.post(
        '/api/analysis/import-excel',
        data={'file': (buf, 'Form Responses 1.xlsx')},
        headers=auth_header(admin_token),
        content_type='multipart/form-data',
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['success'] is True

    result = body.get('result', body)
    assert result['total_rows'] == 4
    assert result['valid_rows'] == 3
    assert result['invalid_rows'] == 1

    with app.app_context():
        assert Student.query.count() == 3          # the refusal created nobody
        assert Connection.query.count() == 2       # mutual pair counted once

        kwame = Student.query.filter_by(name='Kwame Mensah').first()
        assert kwame.year == 2                     # numeric cell parsed
        assert kwame.college == 'Applied Sciences' # "School" matched
        assert kwame.party == 'TESCON'

        # Three different spellings all collapse to one department.
        assert {s.department for s in Student.query.all()} == {'Bsc Computer Science'}

        ama = Student.query.filter_by(name='Ama Owusu').first()
        assert ama.gender == 'Female'              # curly-apostrophe header matched
