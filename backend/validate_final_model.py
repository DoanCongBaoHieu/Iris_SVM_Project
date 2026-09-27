from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.model_selection import StratifiedKFold
from sklearn.model_selection import cross_val_score

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
# 2. TRAIN / TEST SPLIT
# ============================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


# ============================================
# 3. BEST MODEL TỪ GRID SEARCH
# ============================================

final_model = Pipeline([
    ("scaler", StandardScaler()),
    ("svm", SVC(
        kernel="linear",
        C=0.1
    ))
])


# ============================================
# 4. STRATIFIED 5-FOLD CV
# ============================================

cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)


scores = cross_val_score(
    final_model,
    X_train,
    y_train,
    cv=cv,
    scoring="accuracy"
)


# ============================================
# 5. HIỂN THỊ KẾT QUẢ
# ============================================

print("===== VALIDATION FINAL MODEL =====")

for i, score in enumerate(scores, start=1):
    print(f"Fold {i}: {score:.4f}")


print(f"\nMean CV Accuracy: {scores.mean():.4f}")
print(f"Std CV Accuracy : {scores.std():.4f}")