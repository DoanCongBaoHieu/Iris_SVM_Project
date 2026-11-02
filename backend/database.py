import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


BASE_DIR = Path(__file__).resolve().parents[1]
SQLITE_DB_PATH = BASE_DIR / "iris_svm.db"


# ======================================================
# DATABASE CONFIGURATION
# ======================================================

LOCAL_DATABASE_URL = (
    "mssql+pyodbc://@.\\SQLEXPRESS/IrisSVM_DB"
    "?driver=ODBC+Driver+17+for+SQL+Server"
    "&trusted_connection=yes"
    "&TrustServerCertificate=yes"
)

SQLITE_DATABASE_URL = f"sqlite:///{SQLITE_DB_PATH.as_posix()}"


# Use an explicit DATABASE_URL when configured, but fall back to SQLite
# so the app can run in CI or local development environments without SQL
# Server / ODBC drivers installed.
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    try:
        import pyodbc  # noqa: F401
    except ImportError:
        DATABASE_URL = SQLITE_DATABASE_URL
    else:
        DATABASE_URL = LOCAL_DATABASE_URL


# SQLAlchemy dùng driver psycopg cho PostgreSQL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1
    )


# ======================================================
# SQLALCHEMY
# ======================================================

engine_kwargs = {
    "echo": False,
    "pool_pre_ping": True,
}

if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    **engine_kwargs
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


Base = declarative_base()


# ======================================================
# DATABASE SESSION
# ======================================================

def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()