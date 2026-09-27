from sklearn.datasets import load_iris
from sklearn.model_selection import (
    train_test_split,
    cross_val_score,
    StratifiedKFold
)
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
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
# 2. CHIA TRAIN / TEST
# ============================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


# ============================================
# 3. XÂY DỰNG PIPELINE
# ============================================

model = Pipeline([
    ("scaler", StandardScaler()),
    ("svm", SVC(kernel="linear"))
])


# ============================================
# 4. HUẤN LUYỆN
# ============================================

model.fit(X_train, y_train)


# ============================================
# 5. DỰ ĐOÁN
# ============================================

y_pred = model.predict(X_test)



# ============================================
# 6. ĐÁNH GIÁ MÔ HÌNH
# ============================================

accuracy = accuracy_score(y_test, y_pred)

precision = precision_score(
    y_test,
    y_pred,
    average="weighted"
)

recall = recall_score(
    y_test,
    y_pred,
    average="weighted"
)

f1 = f1_score(
    y_test,
    y_pred,
    average="weighted"
)


print("\n===== BASELINE SVM =====")

print(f"Accuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1-score : {f1:.4f}")


# ============================================
# 7. CLASSIFICATION REPORT
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
# 8. CONFUSION MATRIX
# ============================================

cm = confusion_matrix(y_test, y_pred)

print("\n===== CONFUSION MATRIX =====")
print(cm)
# ============================================
# 9. CROSS-VALIDATION
# ============================================

cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)

cv_scores = cross_val_score(
    model,
    X,
    y,
    cv=cv,
    scoring="accuracy"
)

print("\n===== 5-FOLD CROSS-VALIDATION =====")

for i, score in enumerate(cv_scores, start=1):
    print(f"Fold {i}: {score:.4f}")

print(f"\nMean CV Accuracy: {cv_scores.mean():.4f}")
print(f"Std CV Accuracy : {cv_scores.std():.4f}")