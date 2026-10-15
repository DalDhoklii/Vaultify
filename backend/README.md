# Vaultify API (FastAPI)

```bash
python3.12 -m venv venv && source venv/bin/activate
pip install -r requirements.txt          # runtime deps
pip install -r requirements-dev.txt      # + black, ruff, isort, pytest
cp .env.example .env                     # fill in DATABASE_URL, SECRET_KEY, CORS_ORIGINS
alembic upgrade head
uvicorn app.main:app --reload
```

- API docs: http://localhost:8000/docs
- Health check: `GET /health`
- Tests (use a temporary SQLite DB, no Postgres needed): `pytest`
