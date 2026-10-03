from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel, Field
import joblib
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User
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
    allow_origins=["*"],
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
def predict(data: IrisInput):

    features = np.array([
        [
            data.sepal_length,
            data.sepal_width,
            data.petal_length,
            data.petal_width
        ]
    ])


    prediction = model.predict(features)[0]


    species = target_names[prediction]


    return {
    "prediction": int(prediction),
    "species": species,
    "message": f"Mô hình dự đoán hoa thuộc loài {species.capitalize()}."
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
def login(data: LoginInput, db: Session = Depends(get_db)):

    # Tìm người dùng theo username
    user = db.execute(
        select(User).where(User.username == data.username)
    ).scalar_one_or_none()

    # Không tìm thấy username
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Tên đăng nhập hoặc mật khẩu không đúng."
        )

    # Kiểm tra mật khẩu
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