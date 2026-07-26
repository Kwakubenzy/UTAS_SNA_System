#!/usr/bin/env python
"""One-time data migration: local SQLite -> Cloud SQL Postgres.

Run this from the backend/ directory, locally, with the Cloud SQL Auth Proxy
already running (the proxy is what makes a Postgres instance reachable over
plain TCP from a developer machine -- Cloud Run's own /cloudsql Unix-socket
connection only works from inside Cloud Run itself):

    # in one terminal, from anywhere:
    cloud-sql-proxy <INSTANCE_CONNECTION_NAME> --port 5432

    # in another terminal, from backend/:
    python scripts/migrate_sqlite_to_postgres.py \
        --postgres-url postgresql+psycopg2://<user>:<password>@127.0.0.1:5432/<dbname>

Safe to re-run: it truncates the target tables (in FK-safe order) before
re-inserting, so partial or repeated runs don't create duplicates.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, MetaData, Table, select

from app.models import db, Role, User, Student, Connection, NetworkMetric, Campaign, ActivityLog

DEFAULT_SQLITE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'instance', 'sna_system.db'
)

# Parent tables before the tables that reference them via foreign key.
MODELS_IN_FK_ORDER = [Role, User, Student, Connection, NetworkMetric, Campaign, ActivityLog]


def migrate(sqlite_path, postgres_url):
    if not os.path.exists(sqlite_path):
        raise SystemExit(f"SQLite source not found: {sqlite_path}")

    source_engine = create_engine(f"sqlite:///{sqlite_path}")
    target_engine = create_engine(postgres_url)

    # Create every table on the target from the same model definitions the
    # app itself uses, so column types/constraints match exactly.
    db.metadata.create_all(bind=target_engine)

    source_meta = MetaData()
    with target_engine.begin() as target_conn:
        # Clear existing rows in reverse FK order before reloading, so this
        # script can be safely re-run without unique-constraint errors.
        for model in reversed(MODELS_IN_FK_ORDER):
            target_conn.execute(model.__table__.delete())

        for model in MODELS_IN_FK_ORDER:
            table_name = model.__tablename__
            source_table = Table(table_name, source_meta, autoload_with=source_engine)

            with source_engine.connect() as source_conn:
                rows = [dict(row._mapping) for row in source_conn.execute(select(source_table))]

            if not rows:
                print(f"  {table_name}: 0 rows (skipped)")
                continue

            target_conn.execute(model.__table__.insert(), rows)
            print(f"  {table_name}: migrated {len(rows)} rows")

    print("Migration complete.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        '--sqlite-path', default=DEFAULT_SQLITE_PATH,
        help=f"Path to the source SQLite file (default: {DEFAULT_SQLITE_PATH})",
    )
    parser.add_argument(
        '--postgres-url', required=True,
        help="Target Postgres SQLAlchemy URL, e.g. "
             "postgresql+psycopg2://user:pass@127.0.0.1:5432/dbname",
    )
    args = parser.parse_args()
    migrate(args.sqlite_path, args.postgres_url)
