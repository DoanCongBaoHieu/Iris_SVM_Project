from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    predictions = relationship(
        "PredictionHistory",
        back_populates="user"
    )


class PredictionHistory(Base):
    __tablename__ = "prediction_history"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    sepal_length = Column(Float, nullable=False)
    sepal_width = Column(Float, nullable=False)
    petal_length = Column(Float, nullable=False)
    petal_width = Column(Float, nullable=False)

    prediction = Column(Integer, nullable=False)
    species = Column(String(50), nullable=False)

    prediction_time_ms = Column(Float, nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    user = relationship(
        "User",
        back_populates="predictions"
    )