import logging
import time

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.db.base import Base
from app.db.session import engine

logger = logging.getLogger(__name__)


def ensure_auth_columns() -> None:
    statements = [
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP WITH TIME ZONE NULL
        """,
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def init_db() -> None:
    for attempt in range(1, 11):
        try:
            Base.metadata.create_all(bind=engine)
            ensure_auth_columns()
            logger.info("Base de datos lista para autenticacion.")
            return
        except OperationalError:
            logger.warning("Esperando base de datos... intento %s/10", attempt)
            time.sleep(2)

    raise RuntimeError("No fue posible conectar con la base de datos luego de varios intentos.")
