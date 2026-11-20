from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
import secrets
import time
from pathlib import Path
from urllib.parse import urlencode

import bcrypt
from auth0_fastapi.auth.auth_client import AuthClient
from auth0_fastapi.config import Auth0Config
from auth0_fastapi.errors import register_exception_handlers
from auth0_fastapi.server.routes import register_auth_routes, router as auth0_router
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import joblib
import numpy as np
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, inspect, select, text
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

from dotenv import load_dotenv

from backend.database import Base, engine, get_db
from backend.evaluation import get_evaluation_report
from backend.models import PredictionHistory, User

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_CLIENT_ID = os.getenv("AUTH0_CLIENT_ID")
AUTH0_CLIENT_SECRET = os.getenv("AUTH0_CLIENT_SECRET")
AUTH0_SECRET = os.getenv("AUTH0_SECRET")
AUTH0_APP_BASE_URL = os.getenv(
    "AUTH0_APP_BASE_URL",
    "http://localhost:8000",
).rstrip("/")
AUTH0_FRONTEND_URL = os.getenv(
    "AUTH0_FRONTEND_URL",
    "http://localhost:5500",
).rstrip("/")

missing_auth0_settings = [
    setting
    for setting, value in {
        "AUTH0_DOMAIN": AUTH0_DOMAIN,
        "AUTH0_CLIENT_ID": AUTH0_CLIENT_ID,
        "AUTH0_CLIENT_SECRET": AUTH0_CLIENT_SECRET,
        "AUTH0_SECRET": AUTH0_SECRET,
    }.items()
    if not value
]
if missing_auth0_settings:
    raise RuntimeError(
        "Missing Auth0 configuration: " + ", ".join(missing_auth0_settings)
    )

app = FastAPI(
    title="Iris Classification API",
    description="API phân loại hoa Iris bằng nhiều thuật toán học máy",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://iris-svm-frontend-alrz.onrender.com",
    ],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=AUTH0_SECRET,
    https_only=AUTH0_APP_BASE_URL.startswith("https://"),
    same_site="lax",
)

auth0_config = Auth0Config(
    domain=AUTH0_DOMAIN,
    client_id=AUTH0_CLIENT_ID,
    client_secret=AUTH0_CLIENT_SECRET,
    app_base_url=AUTH0_APP_BASE_URL,
    secret=AUTH0_SECRET,
    authorization_params={"scope": "openid profile email"},
)
app.state.config = auth0_config
app.state.auth_client = AuthClient(auth0_config)
register_auth_routes(auth0_router, auth0_config)
app.include_router(auth0_router)
register_exception_handlers(app)


MODEL_DIR = Path(__file__).resolve().parents[1] / "model"
MAIN_MODEL_PATH = MODEL_DIR / "iris_svm_model.pkl"
if not MAIN_MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Main SVM model not found at {MAIN_MODEL_PATH}. "
        "Create it with `python model/save_model.py`."
    )
main_model = joblib.load(MAIN_MODEL_PATH)

KERNEL_MODEL_FILES = {
    "linear": "iris_svm_linear_model.pkl",
    "rbf": "iris_svm_rbf_model.pkl",
    "polynomial": "iris_svm_poly_model.pkl",
    "sigmoid": "iris_svm_sigmoid_model.pkl",
}
comparison_models = {}



target_names = [
    "setosa",
    "versicolor",
    "virginica"
]

class IrisInput(BaseModel):
    user_id: int | None = Field(
        default=None,
        description="ID người dùng"
    )

    kernels: list[str] = Field(
        default_factory=list,
        description="Optional kernels to compare with the main SVM model"
    )

    sepal_length: float = Field(
        ...,
        gt=0,
        le=10,
        description="Chiều dài đài hoa (cm)"
    )

    sepal_width: float = Field(
        ...,
        gt=0,
        le=10,
        description="Chiều rộng đài hoa (cm)"
    )

    petal_length: float = Field(
        ...,
        gt=0,
        le=10,
        description="Chiều dài cánh hoa (cm)"
    )

    petal_width: float = Field(
        ...,
        gt=0,
        le=10,
        description="Chiều rộng cánh hoa (cm)"
    )

class BatchIrisSample(BaseModel):
    sepal_length: float = Field(..., gt=0, le=10, allow_inf_nan=False)
    sepal_width: float = Field(..., gt=0, le=10, allow_inf_nan=False)
    petal_length: float = Field(..., gt=0, le=10, allow_inf_nan=False)
    petal_width: float = Field(..., gt=0, le=10, allow_inf_nan=False)


class BatchPredictionInput(BaseModel):
    user_id: int = Field(..., gt=0)
    kernels: list[str] = Field(default_factory=list, max_length=4)
    kernel: str | None = Field(default=None)
    samples: list[BatchIrisSample] = Field(..., min_length=1, max_length=500)


class RegisterInput(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Tên đăng nhập"
    )

    password: str = Field(
        ...,
        min_length=6,
        max_length=100,
        description="Mật khẩu"
    )

class LoginInput(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Tên đăng nhập"
    )

    password: str = Field(
        ...,
        min_length=6,
        max_length=100,
        description="Mật khẩu"
    )


class ChangePasswordInput(BaseModel):
    user_id: int = Field(
        ...,
        description="ID người dùng"
    )

    current_password: str = Field(
        ...,
        min_length=1,
        description="Mật khẩu hiện tại"
    )

    new_password: str = Field(
        ...,
        min_length=6,
        max_length=100,
        description="Mật khẩu mới"
    )

@app.on_event("startup")
def create_database_tables():
    Base.metadata.create_all(bind=engine)
    columns = {
        column["name"]
        for column in inspect(engine).get_columns("users")
    }
    history_columns = {
        column["name"]
        for column in inspect(engine).get_columns("prediction_history")
    }
    with engine.begin() as connection:
        if "auth0_sub" not in columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN auth0_sub VARCHAR(255)")
            )
        if "comparison_kernels" not in history_columns:
            connection.execute(
                text("ALTER TABLE prediction_history ADD COLUMN comparison_kernels TEXT")
            )
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS "
                "uq_users_auth0_sub ON users (auth0_sub)"
            )
        )


@app.get("/")
def root():

    return {
        "message": "Iris classification API is running"
    }


@app.get("/auth/complete")
async def auth_complete(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    auth_client = request.app.state.auth_client
    await auth_client.require_session(request, response)
    profile = await auth_client.client.get_user(
        store_options={"request": request, "response": response}
    )
    if not profile or not profile.get("sub"):
        raise HTTPException(
            status_code=401,
            detail="Auth0 session does not include a user profile.",
        )

    auth0_sub = profile["sub"]
    user = db.execute(
        select(User).where(User.auth0_sub == auth0_sub)
    ).scalar_one_or_none()
    if user is None:
        username = "auth0_" + hashlib.sha256(
            auth0_sub.encode("utf-8")
        ).hexdigest()[:44]
        password_hash = bcrypt.hashpw(
            secrets.token_bytes(32),
            bcrypt.gensalt(),
        ).decode("utf-8")
        user = User(
            username=username,
            password_hash=password_hash,
            auth0_sub=auth0_sub,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    callback_data = urlencode({
        "user_id": user.id,
        "username": profile.get("name") or profile.get("email") or user.username,
    })
    return RedirectResponse(
        url=f"{AUTH0_FRONTEND_URL}/auth-callback.html#{callback_data}",
        status_code=303,
        headers=response.headers,
    )


@app.get("/auth/after-logout")
def auth_after_logout():
    return RedirectResponse(
        url=f"{AUTH0_FRONTEND_URL}/login-form.html",
        status_code=303,
    )


@app.get("/evaluation")
def model_evaluation():
    """Return separate fixed-holdout and train-only cross-validation results."""
    return get_evaluation_report()


@app.post("/predict")
def predict(data: IrisInput, db: Session = Depends(get_db)):
    features = np.array([[
        data.sepal_length,
        data.sepal_width,
        data.petal_length,
        data.petal_width,
    ]])

    # The original, separately trained SVM always produces the official result.
    prediction_started_at = time.perf_counter()
    main_prediction = int(main_model.predict(features)[0])
    prediction_time_ms = (time.perf_counter() - prediction_started_at) * 1000
    main_result = target_names[main_prediction]

    if len(set(data.kernels)) != len(data.kernels):
        raise HTTPException(
            status_code=422,
            detail="The kernels list must not contain duplicates.",
        )

    unsupported_kernels = [
        kernel for kernel in data.kernels if kernel not in KERNEL_MODEL_FILES
    ]
    if unsupported_kernels:
        raise HTTPException(
            status_code=422,
            detail="Unsupported kernels: " + ", ".join(unsupported_kernels),
        )

    comparison_results = {}
    comparison_times_ms = {}
    for kernel in data.kernels:
        if kernel not in comparison_models:
            model_path = MODEL_DIR / KERNEL_MODEL_FILES[kernel]
            if not model_path.exists():
                raise HTTPException(
                    status_code=500,
                    detail=f"Comparison model file not found: {model_path.name}",
                )
            comparison_models[kernel] = joblib.load(model_path)

        comparison_started_at = time.perf_counter()
        prediction = int(comparison_models[kernel].predict(features)[0])
        comparison_times_ms[kernel] = round(
            (time.perf_counter() - comparison_started_at) * 1000,
            4,
        )
        comparison_results[kernel] = target_names[prediction]

    user = None
    if data.user_id is not None:
        user = db.execute(
            select(User).where(User.id == data.user_id)
        ).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

    if user is not None:
        history = PredictionHistory(
            user_id=user.id,
            sepal_length=data.sepal_length,
            sepal_width=data.sepal_width,
            petal_length=data.petal_length,
            petal_width=data.petal_width,
            prediction=main_prediction,
            species=main_result,
            comparison_kernels=json.dumps(data.kernels),
            prediction_time_ms=round(prediction_time_ms, 4),
        )
        db.add(history)
        db.commit()

    return {
        "main_result": main_result,
        "main_prediction_time_ms": round(prediction_time_ms, 4),
        "comparison_results": comparison_results,
        "comparison_times_ms": comparison_times_ms,
        "history_saved": user is not None,
    }

@app.post("/predict/batch")
def predict_batch(data: BatchPredictionInput, db: Session = Depends(get_db)):
    kernel = data.kernel if data.kernel is not None else "original"
    if kernel != "original" and kernel not in KERNEL_MODEL_FILES:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported kernel: {kernel}",
        )

    # Keep the former comparison request shape working for existing clients.
    legacy_comparison_kernels = data.kernels if data.kernel is None else []
    if len(set(legacy_comparison_kernels)) != len(legacy_comparison_kernels):
        raise HTTPException(
            status_code=422,
            detail="The kernels list must not contain duplicates.",
        )

    unsupported_kernels = [
        item for item in legacy_comparison_kernels if item not in KERNEL_MODEL_FILES
    ]
    if unsupported_kernels:
        raise HTTPException(
            status_code=422,
            detail="Unsupported kernels: " + ", ".join(unsupported_kernels),
        )

    user = db.execute(
        select(User).where(User.id == data.user_id)
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    features = np.array([
        [
            sample.sepal_length,
            sample.sepal_width,
            sample.petal_length,
            sample.petal_width,
        ]
        for sample in data.samples
    ])
    model = main_model
    if kernel != "original":
        if kernel not in comparison_models:
            model_path = MODEL_DIR / KERNEL_MODEL_FILES[kernel]
            if not model_path.exists():
                raise HTTPException(
                    status_code=500,
                    detail=f"Selected model file not found: {model_path.name}",
                )
            comparison_models[kernel] = joblib.load(model_path)
        model = comparison_models[kernel]

    predictions = []
    sample_metrics = []
    inference_time_ms = 0.0
    for sample_features in features:
        sample_matrix = sample_features.reshape(1, -1)
        inference_started_at = time.perf_counter()
        prediction = int(model.predict(sample_matrix)[0])
        decision_scores = np.asarray(model.decision_function(sample_matrix)).reshape(-1)
        prediction_time_ms = (time.perf_counter() - inference_started_at) * 1000
        inference_time_ms += prediction_time_ms

        if decision_scores.size == 1:
            confidence_margin = abs(float(decision_scores[0]))
        else:
            predicted_class_index = int(np.flatnonzero(np.asarray(model.classes_) == prediction)[0])
            other_scores = np.delete(decision_scores, predicted_class_index)
            confidence_margin = float(decision_scores[predicted_class_index] - other_scores.max())

        predictions.append(prediction)
        sample_metrics.append({
            "confidence_margin": round(confidence_margin, 4),
            "prediction_time_ms": round(prediction_time_ms, 4),
        })
    predictions = np.asarray(predictions)

    comparison_predictions = {}
    for comparison_kernel in legacy_comparison_kernels:
        if comparison_kernel not in comparison_models:
            model_path = MODEL_DIR / KERNEL_MODEL_FILES[comparison_kernel]
            if not model_path.exists():
                raise HTTPException(
                    status_code=500,
                    detail=f"Comparison model file not found: {model_path.name}",
                )
            comparison_models[comparison_kernel] = joblib.load(model_path)
        comparison_predictions[comparison_kernel] = comparison_models[comparison_kernel].predict(features)

    results = []
    for index, sample in enumerate(data.samples):
        results.append({
            "sepal_length": sample.sepal_length,
            "sepal_width": sample.sepal_width,
            "petal_length": sample.petal_length,
            "petal_width": sample.petal_width,
            "main_result": target_names[int(predictions[index])],
            "prediction": target_names[int(predictions[index])],
            "confidence_margin": sample_metrics[index]["confidence_margin"],
            "prediction_time_ms": sample_metrics[index]["prediction_time_ms"],
            "comparison_results": {
                comparison_kernel: target_names[int(comparison_predictions[comparison_kernel][index])]
                for comparison_kernel in comparison_predictions
            },
        })

    return {
        "total": len(results),
        "counts": {
            species: int(np.count_nonzero(predictions == index))
            for index, species in enumerate(target_names)
        },
        "results": results,
        "kernel_used": kernel,
        "inference_time_ms": round(inference_time_ms, 4),
        "history_saved": False,
    }


@app.get("/db-test")
def database_test(db: Session = Depends(get_db)):

    result = db.execute(text("SELECT 1"))
    value = result.scalar()

    return {
        "database": "IrisSVM_DB",
        "status": "connected",
        "test": value
    }

@app.post("/register")
def register(data: RegisterInput, db: Session = Depends(get_db)):
    username = data.username.strip()

    existing_user = db.execute(
        select(User).where(func.lower(User.username) == username.lower())
    ).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Tên đăng nhập đã tồn tại."
        )

    password_hash = bcrypt.hashpw(
        data.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    new_user = User(
        username=username,
        password_hash=password_hash
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Đăng ký tài khoản thành công.",
        "user_id": new_user.id,
        "username": new_user.username
    }


@app.post("/login")
def login(
    data: LoginInput,
    db: Session = Depends(get_db)
):
    try:
        username = data.username.strip()

        user = db.execute(
            select(User).where(func.lower(User.username) == username.lower())
        ).scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Tên đăng nhập hoặc mật khẩu không đúng."
            )

        if not user.password_hash:
            raise Exception("password_hash của người dùng đang bị NULL.")

        password_valid = bcrypt.checkpw(
            data.password.encode("utf-8"),
            user.password_hash.encode("utf-8")
        )

        if not password_valid:
            raise HTTPException(
                status_code=401,
                detail="Tên đăng nhập hoặc mật khẩu không đúng."
            )

        return {
            "message": "Đăng nhập thành công.",
            "user_id": user.id,
            "username": user.username
        }

    except HTTPException:
        raise

    except Exception as e:
        print("========== LOGIN ERROR ==========")
        print(type(e).__name__)
        print(str(e))
        print("=================================")

        raise HTTPException(
            status_code=500,
            detail=f"Lỗi đăng nhập: {type(e).__name__}: {str(e)}"
        )
@app.post("/change-password")
def change_password(
    data: ChangePasswordInput,
    db: Session = Depends(get_db)
):
    user = db.execute(
        select(User).where(User.id == data.user_id)
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy người dùng."
        )

    if not bcrypt.checkpw(
        data.current_password.encode("utf-8"),
        user.password_hash.encode("utf-8")
    ):
        raise HTTPException(
            status_code=400,
            detail="Mật khẩu hiện tại không đúng."
        )

    if bcrypt.checkpw(
        data.new_password.encode("utf-8"),
        user.password_hash.encode("utf-8")
    ):
        raise HTTPException(
            status_code=400,
            detail="Mật khẩu mới phải khác mật khẩu hiện tại."
        )

    new_password_hash = bcrypt.hashpw(
        data.new_password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    user.password_hash = new_password_hash

    db.commit()
    db.refresh(user)

    return {
        "message": "Đổi mật khẩu thành công."
    }


def serialize_history_timestamp(created_at: datetime) -> str:
    if created_at.tzinfo is None:
        # SQL Server stores CURRENT_TIMESTAMP in server-local time; SQLite/PostgreSQL use UTC.
        if engine.dialect.name == "mssql":
            created_at = created_at.replace(
                tzinfo=timezone(timedelta(hours=7))
            )
        else:
            created_at = created_at.replace(tzinfo=timezone.utc)

    return created_at.isoformat()


def deserialize_history_comparison_kernels(value):
    if not value:
        return None
    try:
        kernels = json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None
    return kernels if isinstance(kernels, list) else None


@app.get("/history/{user_id}")
def get_prediction_history(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = db.execute(
        select(User).where(User.id == user_id)
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy người dùng."
        )

    histories = db.execute(
        select(PredictionHistory)
        .where(PredictionHistory.user_id == user_id)
        .order_by(PredictionHistory.created_at.desc())
    ).scalars().all()

    return {
        "user_id": user.id,
        "username": user.username,
        "total": len(histories),
        "history": [
            {
                "id": item.id,
                "sepal_length": item.sepal_length,
                "sepal_width": item.sepal_width,
                "petal_length": item.petal_length,
                "petal_width": item.petal_width,
                "prediction": item.prediction,
                "species": item.species,
                "comparison_kernels": deserialize_history_comparison_kernels(
                    item.comparison_kernels
                ),
                "prediction_time_ms": item.prediction_time_ms,
                "created_at": serialize_history_timestamp(item.created_at)
            }
            for item in histories
        ]
    }


@app.delete("/history/{user_id}/{history_id}")
def delete_prediction_history(
    user_id: int,
    history_id: int,
    db: Session = Depends(get_db)
):
    user = db.execute(
        select(User).where(User.id == user_id)
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy người dùng."
        )

    history = db.execute(
        select(PredictionHistory).where(
            PredictionHistory.id == history_id,
            PredictionHistory.user_id == user_id
        )
    ).scalar_one_or_none()

    if not history:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy bản ghi lịch sử của tài khoản này."
        )

    db.delete(history)
    db.commit()

    return {
        "message": "Đã xóa bản ghi lịch sử dự đoán.",
        "deleted": 1
    }


@app.delete("/history/{user_id}")
def delete_all_prediction_history(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = db.execute(
        select(User).where(User.id == user_id)
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy người dùng."
        )

    result = db.execute(
        delete(PredictionHistory).where(
            PredictionHistory.user_id == user_id
        )
    )
    deleted_count = result.rowcount or 0
    db.commit()

    return {
        "message": f"Đã xóa {deleted_count} bản ghi lịch sử dự đoán.",
        "deleted": deleted_count
    }
