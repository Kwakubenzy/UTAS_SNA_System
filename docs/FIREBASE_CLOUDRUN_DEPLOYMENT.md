# Deploying: Firebase Hosting (frontend) + Cloud Run (backend) + Cloud SQL (database)

> **Not the current plan.** This path requires the Blaze (pay-as-you-go)
> Firebase plan with a billing account attached -- Cloud Run and Cloud SQL
> both need it even within their free usage quotas. Since the project is
> staying on the free Spark plan for now, see
> `FIREBASE_PYTHONANYWHERE_DEPLOYMENT.md` instead for the path actually in
> use. Keeping this file in case billing ever becomes an option later.

Reference for the config already committed in this repo. Fill in the
placeholders below and run these yourself when you're ready to deploy --
this file is not something the app reads automatically.

## What's already set up in the repo

- `Dockerfile` (repo root) -- builds the Flask backend, serves it with
  gunicorn via `backend/wsgi.py`.
- `backend/app/__init__.py` -- in production config, builds
  `SQLALCHEMY_DATABASE_URI` from either `DATABASE_URL` directly, or from
  `DB_USER`/`DB_PASS`/`DB_NAME`/`INSTANCE_CONNECTION_NAME` (Cloud SQL Unix
  socket). Falls back to SQLite outside of production, unchanged.
- `backend/scripts/migrate_sqlite_to_postgres.py` -- one-time copy of your
  existing local data into Postgres.
- `firebase.json` / `.firebaserc` -- Hosting config, with an `/api/**`
  rewrite to the Cloud Run service.
- `frontend/.env.production` -- points the built frontend at `/api`
  (same-origin, routed by the Hosting rewrite above).

## One-time setup

1. **Replace the placeholder project ID** in `.firebaserc` with your real
   Firebase project ID (same as your GCP project ID, if Firebase was added
   to an existing GCP project).

2. **Enable the required APIs** (once, per GCP project):
   ```
   gcloud services enable run.googleapis.com sqladmin.googleapis.com sql-component.googleapis.com
   ```

3. **Create the Cloud SQL Postgres instance** (skip if you already have one):
   ```
   gcloud sql instances create utas-sna-db --database-version=POSTGRES_15 \
       --tier=db-f1-micro --region=us-central1
   gcloud sql databases create sna_system --instance=utas-sna-db
   gcloud sql users create sna_app --instance=utas-sna-db --password=<choose-a-password>
   ```
   Note the instance connection name it prints (`<project>:<region>:utas-sna-db`)
   -- that's `INSTANCE_CONNECTION_NAME` below.

4. **Migrate existing data** (from `backend/`, with the Cloud SQL Auth Proxy
   running locally so Postgres is reachable over plain TCP -- download it
   from the `cloud-sql-proxy` GCP docs page if you don't have it):
   ```
   cloud-sql-proxy <INSTANCE_CONNECTION_NAME> --port 5432
   # in a second terminal:
   python scripts/migrate_sqlite_to_postgres.py \
       --postgres-url postgresql+psycopg2://sna_app:<password>@127.0.0.1:5432/sna_system
   ```

## Deploying the backend (Cloud Run)

From the repo root (so the Dockerfile's build context includes both
`requirements.txt` and `backend/`):

```
gcloud run deploy utas-sna-backend \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --add-cloudsql-instances <INSTANCE_CONNECTION_NAME> \
    --set-env-vars DB_USER=sna_app,DB_NAME=sna_system,INSTANCE_CONNECTION_NAME=<INSTANCE_CONNECTION_NAME> \
    --set-secrets DB_PASS=db-pass:latest,JWT_SECRET_KEY=jwt-secret:latest,GOOGLE_CLIENT_ID=google-client-id:latest
```

`--set-secrets` assumes you've stored those three values in Secret Manager
first (`gcloud secrets create db-pass --data-file=-`, etc.) -- don't put real
passwords directly on the command line or in `--set-env-vars`.

Confirm `serviceId`/`region` in `firebase.json` match the service name and
region you actually deployed to.

## Deploying the frontend (Firebase Hosting)

```
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

## Notes

- Cloud Run scales to zero between requests by default; the first request
  after idle will be slower (cold start) unless you set a minimum instance
  count, which costs more.
- Cloud SQL, unlike Cloud Run, has an always-on minimum cost even at the
  smallest tier -- it's not pay-per-request the way Cloud Run and Firebase
  Hosting are.
- `db.create_all()` in `app/__init__.py` creates any missing tables on
  startup but never alters existing ones. If you change a model's columns
  after this migration, you'll need a real migration tool (Alembic is
  already in `requirements.txt` but not yet wired up) rather than relying on
  `create_all()`.
