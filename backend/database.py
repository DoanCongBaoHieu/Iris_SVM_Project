import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL chưa được cấu hình. Hãy thêm External Database URL "
        "của PostgreSQL vào file .env ở thư mục gốc dự án."
    )

# SQLAlchemy dùng driver psycopg cho PostgreSQL. Render có thể cung cấp
# URL theo dạng postgres://, trong khi SQLAlchemy cần postgresql+psycopg://.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql+psycopg://",
        1
    )
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1
    )
elif not DATABASE_URL.startswith("postgresql+psycopg://"):
    raise RuntimeError(
        "Chỉ hỗ trợ PostgreSQL. DATABASE_URL phải bắt đầu bằng "
        "postgres://, postgresql:// hoặc postgresql+psycopg://."
    )


# ======================================================
# SQLALCHEMY
# ======================================================

engine_kwargs = {
    "echo": False,
    "pool_pre_ping": True,
}

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