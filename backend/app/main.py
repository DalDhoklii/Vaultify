from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, category, transaction, settings as settings_router, users

app = FastAPI(
    title="Vaultify API",
    version="0.1.0",
    debug=settings.debug,
)

# allow frontend origin
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://vaultify-mindmates.vercel.app",
    "https://vaultify-git-main-mindmates.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# register routers
app.include_router(auth.router)
app.include_router(category.router)
app.include_router(transaction.router)
app.include_router(settings_router.router)
app.include_router(users.router)
