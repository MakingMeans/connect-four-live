import logging

from fastapi import FastAPI

from app.api.routes import auth, games, users
from app.core.config import PROJECT_NAME
from app.db.bootstrap import init_db
from app.models import game, user

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

app = FastAPI(title=PROJECT_NAME)

app.include_router(auth.router)
app.include_router(games.router)
app.include_router(users.router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {"message": "API funcionando"}
