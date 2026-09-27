from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.model_selection import GridSearchCV
from sklearn.model_selection import StratifiedKFold

from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from sklearn.svm import SVC

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)


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


print("Số mẫu training:", len(X_train))
print("Số mẫu testing :", len(X_test))


# ============================================
# 3. XÂY DỰNG PIPELINE
# ============================================

pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("svm", SVC())
])


# ============================================
# 4. XÂY DỰNG GRID HYPERPARAMETER
# ============================================

param_grid = [

    # -------------------------
    # Linear SVM
    # -------------------------
    {
        "svm__kernel": ["linear"],
        "svm__C": [0.01, 0.1, 1, 10, 100]
    },

    # -------------------------
    # RBF SVM
    # -------------------------
    {
        "svm__kernel": ["rbf"],
        "svm__C": [0.1, 1, 10, 100],
        "svm__gamma": [
            "scale",
            "auto",
            0.001,
            0.01,
            0.1,
            1
        ]
    },

    # -------------------------
    # Polynomial SVM
    # -------------------------
    {
        "svm__kernel": ["poly"],
        "svm__C": [0.1, 1, 10, 100],
        "svm__gamma": [
            "scale",
            "auto",
            0.01,
            0.1
        ],
        "svm__degree": [2, 3, 4]
    }
]


# ============================================
# 5. CROSS-VALIDATION
# ============================================

cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)


# ============================================
# 6. GRID SEARCH
# ============================================

grid_search = GridSearchCV(
    estimator=pipeline,
    param_grid=param_grid,
    scoring="accuracy",
    cv=cv,
    n_jobs=-1,
    return_train_score=True
)


print("\n===== BẮT ĐẦU GRID SEARCH =====")

grid_search.fit(X_train, y_train)


# ============================================
# 7. KẾT QUẢ TỐI ƯU
# ============================================

print("\n===== KẾT QUẢ GRID SEARCH =====")

print("Best parameters:")
print(grid_search.best_params_)

print(
    f"\nBest CV Accuracy: "
    f"{grid_search.best_score_:.4f}"
)


# ============================================
# 8. BEST MODEL
# ============================================

best_model = grid_search.best_estimator_


# ============================================
# 9. ĐÁNH GIÁ TRÊN TEST SET
# ============================================

y_pred = best_model.predict(X_test)

test_accuracy = accuracy_score(
    y_test,
    y_pred
)


print("\n===== TEST SET =====")

print(
    f"Test Accuracy: "
    f"{test_accuracy:.4f}"
)


# ============================================
# 10. CLASSIFICATION REPORT
# ============================================

print("\n===== CLASSIFICATION REPORT =====")

print(
    classification_report(
        y_test,
        y_pred,
        target_names=iris.target_names
    )
)


# ============================================
# 11. CONFUSION MATRIX
# ============================================

cm = confusion_matrix(
    y_test,
    y_pred
)

print("\n===== CONFUSION MATRIX =====")

print(cm)