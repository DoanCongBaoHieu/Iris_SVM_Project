from fastapi import FastAPI
from pydantic import BaseModel, Field
import joblib
import numpy as np


# ============================================
# 1. KHỞI TẠO FASTAPI
# ============================================

app = FastAPI(
    title="Iris SVM Classification API",
    description="API phân loại hoa Iris bằng mô hình SVM",
    version="1.0.0"
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