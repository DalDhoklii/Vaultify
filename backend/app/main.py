from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, category, transaction, users
from app.routers import settings as settings_router

app = FastAPI(
    title="Vaultify API",
    version="0.2.0",
    debug=settings.debug,
)

# Allowed frontend origins come from the CORS_ORIGINS env variable
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page", "X-Page-Size"],
)


@app.get("/health", tags=["health"])
def health():
    """Lightweight endpoint for uptime checks / hosting health probes."""
    return {"status": "ok"}


# register routers
app.include_router(auth.router)
app.include_router(category.router)
app.include_router(transaction.router)
app.include_router(settings_router.router)
app.include_router(users.router)
