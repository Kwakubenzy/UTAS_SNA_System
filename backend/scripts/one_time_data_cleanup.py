#!/usr/bin/env python
"""One-time cleanup for data-quality issues found while normalizing
departments against the real dataset (see normalize_existing_departments.py,
run that one first). Two things, neither generalizable into normalize.py:

1. Removes "student" records created from a non-answer during the original
   survey import (e.g. a respondent typed "I don't have a friend in csc104"
   instead of a real name, and the importer created a fake student from
   that literal text) -- along with whatever connection points at them,
   since an orphaned connection would otherwise corrupt the graph.
2. Fixes a handful of one-off department typos too specific to write a
   general normalization rule for (a doubled letter, a stray "Na", etc.).
   Safe to re-run: skipped if the student isn't found by that exact name.

Run from backend/:
    python scripts/one_time_data_cleanup.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models import db, Student

NON_ANSWER_MARKERS = ["don't", 'dont', 'none', 'n/a', 'no friend', 'nobody', 'not applicable', 'no one']

TYPO_FIXES = {
    'Dickson Addah': 'Bed Mathematics',
    'DORIS NTAWAN': 'Bsc Information Technology',
    'Cynthia': 'Bsc Computing With Accounting',
    'Musah Abdul Hannan': 'Bsc Computer Science',
    'Akurigo Zinatu Nmah': 'Bed Mathematics',
}


def remove_non_answer_students():
    """Connection/NetworkMetric rows cascade-delete automatically via the
    Student model's relationship cascade -- see app/models/__init__.py."""
    removed = 0
    for student in Student.query.all():
        name = student.name.strip().lower()
        if len(name.split()) > 5 or any(marker in name for marker in NON_ANSWER_MARKERS):
            print(f"  Removing bogus student: {student.name!r} (id={student.id})")
            db.session.delete(student)
            removed += 1
    db.session.commit()
    print(f"Removed {removed} bogus student(s).")


def fix_known_typos():
    fixed = 0
    for name, new_dept in TYPO_FIXES.items():
        student = Student.query.filter_by(name=name).first()
        if not student:
            print(f"  Skipped (not found): {name}")
            continue
        if student.department == new_dept:
            print(f"  Already correct: {name}")
            continue
        print(f"  {name}: {student.department!r} -> {new_dept!r}")
        student.department = new_dept
        fixed += 1
    db.session.commit()
    print(f"Fixed {fixed} typo(s).")


def run():
    app = create_app('development')
    with app.app_context():
        remove_non_answer_students()
        fix_known_typos()


if __name__ == '__main__':
    run()
