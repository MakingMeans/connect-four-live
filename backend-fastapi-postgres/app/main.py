from fastapi import FastAPI
from app.db.base import Base
from app.db.session import engine
from app.api.routes import auth, users

from app.models import user

from sqlalchemy.exc import OperationalError
import time

app = FastAPI()

app.include_router(auth.router)
app.include_router(users.router)


def init_db():
    for i in range(10):
        try:
            Base.metadata.create_all(bind=engine)
            print("DB conectada ✅")
            break
        except OperationalError:
            print(f"Esperando DB... intento {i+1}")
            time.sleep(2)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {"message": "API funcionando 🚀"}