#!/usr/bin/env python
"""One-time backfill: normalize every existing Student.department value to
the canonical "Bsc <Subject>" form (see app/utils/normalize.py).

New/edited/imported students are normalized automatically going forward
(students.py and data_importer.py both call normalize_department() before
saving) -- this script is only needed once, to clean up department values
that were already sitting in the database before that went in.

Run from backend/:
    python scripts/normalize_existing_departments.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models import db, Student
from app.utils.normalize import normalize_department


def run():
    app = create_app('development')
    with app.app_context():
        changed = 0
        for student in Student.query.all():
            new_value = normalize_department(student.department)
            if new_value != student.department:
                print(f"  {student.name}: {student.department!r} -> {new_value!r}")
                student.department = new_value
                changed += 1
        db.session.commit()
        print(f"Normalized {changed} of {Student.query.count()} students.")


if __name__ == '__main__':
    run()
