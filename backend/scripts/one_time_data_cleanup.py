#!/usr/bin/env python
"""One-time cleanup for data-quality issues found while normalizing
departments against the real dataset (see normalize_existing_departments.py,
run that one first). None of this is generalizable into normalize.py:

1. Removes "student" records created from a non-answer during the original
   survey import (e.g. a respondent typed "I don't have a friend in csc104"
   instead of a real name, and the importer created a fake student from
   that literal text).
2. Fixes a handful of one-off department typos too specific to write a
   general normalization rule for (a doubled letter, a stray "Na", etc.).
   Safe to re-run: skipped if the student isn't found by that exact name.
3. Removes orphaned Connection/NetworkMetric rows left over from before the
   Student model had a delete cascade -- these crash any endpoint that
   assumes every metric/connection has a real student behind it.

Run from backend/:
    python scripts/one_time_data_cleanup.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models import db, Student, Connection, NetworkMetric

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


def remove_orphaned_rows():
    """Connection/NetworkMetric rows created before the Student model had a
    delete cascade (see app/models/__init__.py) can be left pointing at a
    student that no longer exists -- e.g. from a manual/raw deletion done
    before that fix went in. Those crash any endpoint that assumes every
    metric/connection has a real student on the other end (this is exactly
    what broke the dashboard: an orphaned NetworkMetric made
    /api/analysis/communities 500, and the dashboard's Promise.all treats
    one failed call as total failure)."""
    student_ids = {s.id for s in Student.query.all()}

    orphan_metrics = [m for m in NetworkMetric.query.all() if m.student_id not in student_ids]
    for m in orphan_metrics:
        print(f"  Removing orphaned NetworkMetric: id={m.id} student_id={m.student_id}")
        db.session.delete(m)

    orphan_conns = [
        c for c in Connection.query.all()
        if c.from_student_id not in student_ids or c.to_student_id not in student_ids
    ]
    for c in orphan_conns:
        print(f"  Removing orphaned Connection: id={c.id} {c.from_student_id}->{c.to_student_id}")
        db.session.delete(c)

    db.session.commit()
    print(f"Removed {len(orphan_metrics)} orphaned metric(s), {len(orphan_conns)} orphaned connection(s).")


def run():
    app = create_app('development')
    with app.app_context():
        remove_non_answer_students()
        fix_known_typos()
        remove_orphaned_rows()


if __name__ == '__main__':
    run()
