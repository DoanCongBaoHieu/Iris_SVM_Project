from sklearn.datasets import load_iris
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.svm import SVC


# ============================================
# 1. LOAD DATASET
# ============================================

iris = load_iris()

X = iris.data
y = iris.target


# ============================================
# 2. CROSS-VALIDATION
# ============================================

cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)


# ============================================
# 3. CÁC CẤU HÌNH SVM
# ============================================

models = {
    "Linear SVM": Pipeline([
        ("scaler", StandardScaler()),
        ("svm", SVC(kernel="linear"))
    ]),

    "RBF SVM": Pipeline([
        ("scaler", StandardScaler()),
        ("svm", SVC(kernel="rbf"))
    ]),

    "Polynomial SVM": Pipeline([
        ("scaler", StandardScaler()),
        ("svm", SVC(kernel="poly"))
    ])
}


# ============================================
# 4. SO SÁNH
# ============================================

print("===== SO SÁNH CÁC KERNEL SVM =====")

for name, model in models.items():

    scores = cross_val_score(
        model,
        X,
        y,
        cv=cv,
        scoring="accuracy"
    )

    print(f"\n{name}")

    for i, score in enumerate(scores, start=1):
        print(f"  Fold {i}: {score:.4f}")

    print(f"  Mean: {scores.mean():.4f}")
    print(f"  Std : {scores.std():.4f}")