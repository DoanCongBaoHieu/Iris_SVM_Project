import joblib
import numpy as np


# ============================================
# 1. LOAD MODEL
# ============================================

model = joblib.load(
    "model/iris_svm_model.pkl"
)


# ============================================
# 2. TẠO MỘT MẪU HOA IRIS
# ============================================

sample = np.array([
    [5.1, 3.5, 1.4, 0.2]
])


# ============================================
# 3. DỰ ĐOÁN
# ============================================

prediction = model.predict(sample)


# ============================================
# 4. XÁC ĐỊNH TÊN LOÀI
# ============================================

target_names = [
    "setosa",
    "versicolor",
    "virginica"
]


print("===== TEST MODEL ĐÃ LƯU =====")

print(
    "Prediction:",
    target_names[prediction[0]]
)