"""Production WSGI entrypoint -- what gunicorn (Cloud Run) actually serves.

run.py stays as the local development entrypoint (Flask's own reloader,
debug=True); this module just exposes the same app built in 'production'
config, since gunicorn needs a plain module:attribute target rather than a
factory call.
"""
from app import create_app

app = create_app('production')
