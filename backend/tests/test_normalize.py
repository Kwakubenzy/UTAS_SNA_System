from app.utils.normalize import normalize_department


def test_bsc_prefix_variants_collapse_to_one_canonical_form():
    variants = [
        'COMPUTER SCIENCE', 'computer science', 'Bsc Computer Science',
        'BSC COMPUTER SCIENCE', 'bsc. computer science', 'B.SC COMPUTER SCIENCE',
        'Bsc.computer science', 'Computer science',
    ]
    normalized = {normalize_department(v) for v in variants}
    assert normalized == {'Bsc Computer Science'}


def test_bed_is_a_distinct_degree_not_folded_into_bsc():
    """Regression test: an earlier version of this function mislabeled every
    B.Ed student as 'Bsc Bed Mathematics', treating Bachelor of Education as
    if it were Bachelor of Science."""
    variants = [
        'B.ED MATHEMATICS', 'Bed mathematics', 'BE.d Mathematics',
        'Bachelor of education in Mathematics',
    ]
    for v in variants:
        result = normalize_department(v)
        assert result == 'Bed Mathematics'
        assert 'Bsc' not in result


def test_repairs_the_bsc_bed_artifact():
    """The exact corrupted value the buggy version above wrote to the
    database -- must self-heal back to the correct Bed-only form."""
    assert normalize_department('Bsc Bed Mathematics') == 'Bed Mathematics'


def test_it_abbreviation_merges_with_information_technology():
    assert normalize_department('BSc IT') == 'Bsc Information Technology'
    assert normalize_department('Information Technology') == 'Bsc Information Technology'


def test_bsc_and_bed_mathematics_stay_distinct_from_each_other():
    assert normalize_department('Bsc Mathematics') == 'Bsc Mathematics'
    assert normalize_department('Bed Mathematics') == 'Bed Mathematics'
    assert normalize_department('Bsc Mathematics') != normalize_department('Bed Mathematics')


def test_stray_colon_after_prefix_stripped():
    assert normalize_department('Bsc : Computer Science') == 'Bsc Computer Science'
    assert normalize_department('Bsc : Information Technology') == 'Bsc Information Technology'


def test_redundant_bachelor_phrase_stripped():
    assert normalize_department('Bsc Bachelor In Computer Science') == 'Bsc Computer Science'
    assert normalize_department('Bsc Bachelor Of Science In Information Technology') == 'Bsc Information Technology'


def test_blank_and_none_return_none():
    assert normalize_department(None) is None
    assert normalize_department('') is None
    assert normalize_department('   ') is None
    assert normalize_department('bsc') is None
