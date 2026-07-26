# Deploying for free: Firebase Hosting (frontend) + PythonAnywhere (backend)

This is the actual path in use, chosen because it needs no billing account /
credit card anywhere. SQLite stays exactly as it is -- no Postgres migration,
no Cloud SQL, no Docker. Reference only; run these yourself when ready.

## Why not Cloud Run

Every GCP compute product (Cloud Run, Cloud Functions, App Engine) requires
the Blaze plan with a billing account attached, even for usage that stays
inside the free quota. Firebase Hosting is the one product that's genuinely
free on the Spark plan. So the frontend deploys to Firebase Hosting as
planned; the backend needs a host that doesn't require billing at all --
PythonAnywhere's free tier fits that.

## What's different from the Cloud Run plan

- No Docker, no gunicorn, no Postgres. PythonAnywhere runs the Flask app
  directly through its own WSGI server, and keeps the SQLite file on a
  persistent disk (unlike Cloud Run, which has no persistent disk at all).
- Firebase Hosting's `firebase.json` no longer rewrites `/api/**` anywhere --
  Hosting rewrites only support Cloud Run/Cloud Functions targets, not an
  arbitrary external host. Instead, the frontend calls PythonAnywhere's URL
  directly as a genuine cross-origin request, which already works because
  `CORS(app)` in `backend/app/__init__.py` allows any origin.
- `frontend/.env.production` needs your real PythonAnywhere username in it
  (currently a placeholder).

## Backend setup (PythonAnywhere)

1. Sign up for a free account at pythonanywhere.com -- no card required.

2. Open a **Bash console** (Dashboard -> "Consoles" -> "Bash") and get the
   code onto the server. If this repo is pushed to GitHub:
   ```
   git clone <your-repo-url> UTAS_SNA_System
   ```
   Otherwise, zip the project locally and upload it via the "Files" tab,
   then unzip it in the Bash console.

   Check that `backend/instance/sna_system.db` made it across -- that's
   your real data. If it's `.gitignore`d, upload that one file separately
   via the Files tab rather than relying on git.

3. Create a virtualenv and install dependencies:
   ```
   mkvirtualenv --python=python3.11 sna-venv
   cd UTAS_SNA_System
   pip install -r requirements.txt
   ```
   (`gunicorn` and `psycopg2-binary` in requirements.txt just install and go
   unused here -- PythonAnywhere uses its own WSGI server and SQLite needs
   no Postgres driver. Harmless either way.)

4. Create `backend/.env` on the server (it's gitignored, so it won't have
   come across with the clone) with real production values:
   ```
   nano backend/.env
   ```
   ```
   JWT_SECRET_KEY=<a real random secret, not the dev default>
   GOOGLE_CLIENT_ID=<your Google OAuth client ID, if using Google login>
   ```

5. Go to the **Web** tab -> "Add a new web app" -> pick your domain
   (`<username>.pythonanywhere.com`, free) -> **"Manual configuration"**
   (not the Flask quick-setup option, since this app uses `wsgi.py` +
   an app-factory pattern already) -> matching Python version.

6. On that same Web tab, set:
   - **Virtualenv**: `/home/<username>/.virtualenvs/sna-venv`
   - **Working directory**: `/home/<username>/UTAS_SNA_System/backend`

7. Click the WSGI configuration file link (something like
   `/var/www/<username>_pythonanywhere_com_wsgi.py`) and replace its
   contents with:
   ```python
   import sys

   path = '/home/<username>/UTAS_SNA_System/backend'
   if path not in sys.path:
       sys.path.insert(0, path)

   from wsgi import app as application
   ```
   (PythonAnywhere's WSGI server looks for a variable literally named
   `application` -- `backend/wsgi.py`'s `app` gets aliased to that name here.)

8. Click the green **Reload** button on the Web tab. Then check
   `https://<username>.pythonanywhere.com/health` returns `{"status": "OK"}`.

## Frontend setup (Firebase Hosting)

1. Edit `frontend/.env.production`, replacing the placeholder with your
   real PythonAnywhere URL:
   ```
   VITE_API_URL=https://<username>.pythonanywhere.com/api
   ```

2. Build and deploy:
   ```
   cd frontend
   npm run build
   cd ..
   firebase deploy --only hosting
   ```

## After any future code change

- Backend: `git pull` (or re-upload) in the PythonAnywhere Bash console,
  then hit **Reload** on the Web tab -- it does not auto-restart on its own.
- Frontend: re-run `npm run build` and `firebase deploy --only hosting`.

## Free-tier limits worth knowing

- Outbound network access from PythonAnywhere's free tier is restricted to
  an allowlist of external sites -- doesn't matter here, since this app
  never calls out to a third-party API itself.
- CPU-second quota resets daily; fine for a demo/thesis-defense workload,
  not for sustained heavy traffic.
- One web app per free account, on the `<username>.pythonanywhere.com`
  subdomain -- a custom domain needs a paid plan, but the free subdomain is
  HTTPS by default, which is what matters for the cross-origin call from
  Firebase Hosting to work without mixed-content issues.
