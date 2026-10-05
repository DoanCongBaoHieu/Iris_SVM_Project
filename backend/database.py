import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


# ======================================================
# DATABASE CONFIGURATION
# ======================================================

# Local: SQL Server trên máy cá nhân
LOCAL_DATABASE_URL = (
    "mssql+pyodbc://@.\\SQLEXPRESS/IrisSVM_DB"
    "?driver=ODBC+Driver+17+for+SQL+Server"
    "&trusted_connection=yes"
    "&TrustServerCertificate=yes"
)


# Render: PostgreSQL
# DATABASE_URL sẽ được tạo trong Render Environment Variables
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    LOCAL_DATABASE_URL
)


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

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True
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