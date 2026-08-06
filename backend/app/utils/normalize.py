"""Shared normalization helpers for free-text survey/form fields."""
import re

# Bare subject -> canonical subject, applied after stripping any degree
# prefix. Covers abbreviations respondents use interchangeably with the
# spelled-out programme name (e.g. "IT" and "Information Technology" are
# the same programme, not two different ones).
_SUBJECT_ALIASES = {
    'it': 'information technology',
}


def normalize_department(raw):
    """Collapse every casing/punctuation/prefix variant of a UTAS programme
    name into one canonical "<Degree> <Title Case Subject>" string.

    Respondents type their own department in free text, so the same
    programme shows up as "COMPUTER SCIENCE", "Bsc. computer science",
    "BSc Computer Science", or just "Computer Science" with no prefix at
    all -- all the same programme, so bare/differently-punctuated mentions
    all collapse onto a canonical "Bsc " prefix (Bsc is the near-universal
    degree at UTAS, a university of technology and applied sciences).

    Bachelor of Education (B.Ed) is a genuinely different degree that some
    students are also on (e.g. "B.Ed Mathematics"), so it's recognized and
    kept as its own "Bed " prefix rather than being folded into "Bsc" --
    an earlier version of this function did exactly that and mislabeled
    real B.Ed students as "Bsc Bed Mathematics".
    """
    if not raw or not str(raw).strip():
        return None
    # Strip stray punctuation some respondents put right after the degree
    # prefix ("Bsc : Computer Science", "Bsc, Computer Science").
    text = str(raw).lower().replace('.', '').replace(':', ' ').replace(',', ' ').strip()
    text = re.sub(r'\s+', ' ', text).strip()

    # The optional leading "(bsc )?" here also repairs the one-time artifact
    # left by an earlier, buggier version of this function that mislabeled
    # B.Ed students as "Bsc Bed X" before this fix went in.
    bed_match = re.match(r'^(bsc\s*)?(b\s?ed|bachelor of education)\s*(in\s+)?(.*)$', text)
    if bed_match:
        prefix = 'Bed'
        subject = bed_match.group(4).strip()
    else:
        prefix = 'Bsc'
        subject = re.sub(r'^b\s?sc\s*(in\s+)?', '', text).strip()

    # Some respondents redundantly spell the degree out even after already
    # writing "Bsc"/"Bed" ("Bsc Bachelor In Computer Science", "Bsc
    # Bachelor Of Science In Information Technology") -- strip the
    # redundant phrase rather than keeping it as part of the subject.
    subject = re.sub(r'^bachelor(\s+of\s+(science|education))?\s*(in\s+)?', '', subject).strip()

    subject = _SUBJECT_ALIASES.get(subject, subject)
    if not subject:
        return None

    title_cased = re.sub(r'\b\w', lambda m: m.group().upper(), subject)
    return f'{prefix} {title_cased}'
