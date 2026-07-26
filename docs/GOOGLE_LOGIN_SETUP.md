# Setting up "Sign in with Google"

The code is fully wired up (backend endpoint, token verification, frontend
button), but it needs a real Google OAuth Client ID before it will do
anything — there is no way to generate that for you, since it has to be
created under your own Google account.

## 1. Create the OAuth Client ID

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create a project (or use an existing one).
2. Go to **APIs & Services → OAuth consent screen** and configure it
   (External is fine for testing; add your own Google account as a test
   user if the app is left in "Testing" publishing status).
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth
   client ID**.
4. Application type: **Web application**.
5. Under **Authorized JavaScript origins**, add every origin the frontend
   will actually be served from, for example:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - your production domain, once you have one
6. Save, then copy the generated **Client ID** (looks like
   `123456789-abc...apps.googleusercontent.com`). You do not need the
   client secret for this flow — Google Identity Services only uses the ID
   token/JWT flow, verified on the backend.

## 2. Configure the backend

Copy `backend/.env.example` to `backend/.env` and set:

```
GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
```

The Flask app loads `.env` automatically on startup (`python-dotenv`).

## 3. Configure the frontend

Copy `frontend/.env.example` to `frontend/.env` and set the **same** client
ID:

```
VITE_GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
```

Restart the Vite dev server after adding this file — Vite only reads `.env`
files at startup.

## 4. How it behaves

- The Login page renders Google's own "Sign in with Google" button. If
  `VITE_GOOGLE_CLIENT_ID` isn't set, it shows a small note instead of a
  broken button, so this is safe to leave unconfigured for now.
- Clicking it opens Google's account picker, then posts an ID token to
  `POST /api/auth/google`.
- The backend verifies that token's signature against Google's public keys
  (via the `google-auth` library) and confirms the email is verified.
- If a user with that email already exists, they're logged in. If not, a
  new account is created automatically with the `student` role and a
  random password nobody knows (it can only be reached again via Google
  sign-in). An admin can promote the account afterwards from the Users
  page, same as any other account.
