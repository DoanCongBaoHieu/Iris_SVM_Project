from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel, Field
import joblib
import numpy as np
import time
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from fastapi.middleware.cors import CORSMiddleware
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sqlalchemy import delete, func, text
from sqlalchemy.orm import Session

from backend.database import Base, engine, get_db
from backend.models import User, PredictionHistory
import bcrypt
from sqlalchemy import select

# ============================================
# 1. KHỞI TẠO FASTAPI
# ============================================

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

    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# 2. LOAD MODEL
# ============================================

MODEL_PATH = Path(__file__).resolve().parents[1] / "model" / "iris_svm_model.pkl"

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Không tìm thấy mô hình tại: {MODEL_PATH}")

model = joblib.load(MODEL_PATH)

iris_dataset = load_iris()
prediction_models = {
    "svm": model,
    "knn": Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", KNeighborsClassifier(n_neighbors=5))
    ]),
    "tree": DecisionTreeClassifier(random_state=42),
    "random_forest": RandomForestClassifier(
        n_estimators=100,
        random_state=42
    ),
    "logistic": Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(max_iter=1000, random_state=42))
    ])
}

for algorithm, estimator in prediction_models.items():
    if algorithm != "svm":
        estimator.fit(iris_dataset.data, iris_dataset.target)

model_names = {
    "svm": "Support Vector Machine (SVM)",
    "knn": "K-Nearest Neighbors (K-NN)",
    "tree": "Decision Tree",
    "random_forest": "Random Forest",
    "logistic": "Logistic Regression"
}


# ============================================
# 3. TÊN CÁC LỚP
# ============================================

target_names = [
    "setosa",
    "versicolor",
    "virginica"
]
# ============================================
# PASSWORD HASHING
# ============================================




# ============================================
# 4. ĐỊNH NGHĨA INPUT
# ============================================

class IrisInput(BaseModel):
    user_id: int | None = Field(
        default=None,
        description="ID người dùng"
    )

    algorithms: list[str] = Field(
        default_factory=lambda: ["svm"],
        min_length=1,
        description="Các thuật toán cần dùng để dự đoán"
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

# ============================================
# 5. DATABASE INITIALIZATION
# ============================================

@app.on_event("startup")
def create_database_tables():
    Base.metadata.create_all(bind=engine)


# ============================================
# 6. API ROOT
# ============================================

@app.get("/")
def root():

    return {
        "message": "Iris classification API is running"
    }


# ============================================
# 6. API PREDICT
# ============================================

@app.post("/predict")
def predict(data: IrisInput, db: Session = Depends(get_db)):
    if len(set(data.algorithms)) != len(data.algorithms):
        raise HTTPException(
            status_code=422,
            detail="Danh sách thuật toán không được chứa lựa chọn trùng lặp."
        )

    unsupported_algorithms = [
        algorithm
        for algorithm in data.algorithms
        if algorithm not in prediction_models
    ]
    if unsupported_algorithms:
        raise HTTPException(
            status_code=422,
            detail=(
                "Thuật toán không được hỗ trợ: "
                + ", ".join(unsupported_algorithms)
            )
        )

    # Kiểm tra user nếu có user_id
    user = None

    if data.user_id is not None:
        user = db.execute(
            select(User).where(User.id == data.user_id)
        ).scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy người dùng."
            )

    # Chuẩn bị dữ liệu đầu vào
    features = np.array([
        [
            data.sepal_length,
            data.sepal_width,
            data.petal_length,
            data.petal_width
        ]
    ])

    results = []
    for algorithm in data.algorithms:
        start_time = time.perf_counter()
        prediction = int(prediction_models[algorithm].predict(features)[0])
        prediction_time_ms = (time.perf_counter() - start_time) * 1000

        results.append({
            "algorithm": algorithm,
            "model_name": model_names[algorithm],
            "prediction": prediction,
            "species": target_names[prediction],
            "prediction_time_ms": round(prediction_time_ms, 4)
        })

    primary_result = results[0]

    # Lưu lịch sử nếu có user_id
    if user is not None:
        history = PredictionHistory(
            user_id=user.id,
            sepal_length=data.sepal_length,
            sepal_width=data.sepal_width,
            petal_length=data.petal_length,
            petal_width=data.petal_width,
            prediction=primary_result["prediction"],
            species=primary_result["species"],
            prediction_time_ms=primary_result["prediction_time_ms"]
        )

        db.add(history)
        db.commit()
        db.refresh(history)

    return {
        **primary_result,
        "message": (
            f"Mô hình {primary_result['model_name']} dự đoán hoa thuộc "
            f"loài {primary_result['species'].capitalize()}."
        ),
        "results": results,
        "history_saved": user is not None
    }

# ============================================
# 7. API KIỂM TRA KẾT NỐI CSDL
# ============================================

@app.get("/db-test")
def database_test(db: Session = Depends(get_db)):

    result = db.execute(text("SELECT 1"))
    value = result.scalar()

    return {
        "database": "IrisSVM_DB",
        "status": "connected",
        "test": value
    }

# ============================================
# 8. API ĐĂNG KÝ
# ============================================

@app.post("/register")
def register(data: RegisterInput, db: Session = Depends(get_db)):
    username = data.username.strip()

    # Kiểm tra username đã tồn tại (case-insensitive)
    existing_user = db.execute(
        select(User).where(func.lower(User.username) == username.lower())
    ).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Tên đăng nhập đã tồn tại."
        )

    # Hash mật khẩu
    password_hash = bcrypt.hashpw(
        data.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    # Tạo người dùng mới
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


# ============================================
# 9. API ĐĂNG NHẬP
# ============================================

@app.post("/login")
def login(
    data: LoginInput,
    db: Session = Depends(get_db)
):
    try:
        username = data.username.strip()

        # Tìm người dùng (case-insensitive)
        user = db.execute(
            select(User).where(func.lower(User.username) == username.lower())
        ).scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Tên đăng nhập hoặc mật khẩu không đúng."
            )

        # Kiểm tra hash
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
# ======================================================
# ĐỔI MẬT KHẨU
# ======================================================

@app.post("/change-password")
def change_password(
    data: ChangePasswordInput,
    db: Session = Depends(get_db)
):
    # Tìm người dùng
    user = db.execute(
        select(User).where(User.id == data.user_id)
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy người dùng."
        )

    # Kiểm tra mật khẩu hiện tại
    if not bcrypt.checkpw(
        data.current_password.encode("utf-8"),
        user.password_hash.encode("utf-8")
    ):
        raise HTTPException(
            status_code=400,
            detail="Mật khẩu hiện tại không đúng."
        )

    # Không cho đổi thành chính mật khẩu cũ
    if bcrypt.checkpw(
        data.new_password.encode("utf-8"),
        user.password_hash.encode("utf-8")
    ):
        raise HTTPException(
            status_code=400,
            detail="Mật khẩu mới phải khác mật khẩu hiện tại."
        )

    # Mã hóa mật khẩu mới
    new_password_hash = bcrypt.hashpw(
        data.new_password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    # Cập nhật vào database
    user.password_hash = new_password_hash

    db.commit()
    db.refresh(user)

    return {
        "message": "Đổi mật khẩu thành công."
    }


# ============================================
# 10. API LẤY LỊCH SỬ DỰ ĐOÁN
# ============================================

@app.get("/history/{user_id}")
def get_prediction_history(
    user_id: int,
    db: Session = Depends(get_db)
):
    # Kiểm tra người dùng
    user = db.execute(
        select(User).where(User.id == user_id)
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy người dùng."
        )

    # Lấy lịch sử dự đoán
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
                "prediction_time_ms": item.prediction_time_ms,
                "created_at": item.created_at
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