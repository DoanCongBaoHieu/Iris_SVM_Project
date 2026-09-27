from sklearn.datasets import load_iris
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.svm import SVC

import joblib
import os


# ============================================
# 1. LOAD DATASET
# ============================================

iris = load_iris()

X = iris.data
y = iris.target


# ============================================
# 2. XÂY DỰNG FINAL MODEL
# ============================================

final_model = Pipeline([
    ("scaler", StandardScaler()),
    ("svm", SVC(
        kernel="linear",
        C=0.1
    ))
])


# ============================================
# 3. HUẤN LUYỆN FINAL MODEL
# ============================================

final_model.fit(X, y)


# ============================================
# 4. TẠO THƯ MỤC LƯU MODEL
# ============================================

os.makedirs("model", exist_ok=True)


# ============================================
# 5. LƯU MODEL
# ============================================

model_path = "model/iris_svm_model.pkl"

joblib.dump(
    final_model,
    model_path
)


print("===== LƯU MÔ HÌNH =====")
print(f"Model đã được lưu tại: {model_path}")