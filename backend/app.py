from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel, Field
import joblib
import numpy as np
import time
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, PredictionHistory
import bcrypt
from sqlalchemy import select

# ============================================
# 1. KHỞI TẠO FASTAPI
# ============================================

app = FastAPI(
    title="Iris SVM Classification API",
    description="API phân loại hoa Iris bằng mô hình SVM",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],

    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# 2. LOAD MODEL
# ============================================

model = joblib.load(
    "model/iris_svm_model.pkl"
)


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
# 5. API ROOT
# ============================================

@app.get("/")
def root():

    return {
        "message": "Iris SVM API is running"
    }


# ============================================
# 6. API PREDICT
# ============================================

@app.post("/predict")
def predict(data: IrisInput, db: Session = Depends(get_db)):

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

    # Đo thời gian chạy mô hình
    start_time = time.perf_counter()

    prediction = model.predict(features)[0]

    end_time = time.perf_counter()

    prediction_time_ms = (end_time - start_time) * 1000

    # Xác định loài hoa
    species = target_names[prediction]

    # Lưu lịch sử nếu có user_id
    if user is not None:
        history = PredictionHistory(
            user_id=user.id,
            sepal_length=data.sepal_length,
            sepal_width=data.sepal_width,
            petal_length=data.petal_length,
            petal_width=data.petal_width,
            prediction=int(prediction),
            species=species,
            prediction_time_ms=prediction_time_ms
        )

        db.add(history)
        db.commit()
        db.refresh(history)

    return {
        "prediction": int(prediction),
        "species": species,
        "message": f"Mô hình dự đoán hoa thuộc loài {species.capitalize()}.",
        "prediction_time_ms": round(prediction_time_ms, 4),
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

    # Kiểm tra username đã tồn tại
    existing_user = db.execute(
        select(User).where(User.username == data.username)
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
        username=data.username,
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
        # Tìm người dùng
        user = db.execute(
            select(User).where(User.username == data.username)
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