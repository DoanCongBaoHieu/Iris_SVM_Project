from pathlib import Path

import joblib
from sklearn.datasets import load_iris
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from backend.kernels import laplacian_kernel


MODEL_DIR = Path(__file__).resolve().parents[1] / "model"


def create_models():
    return {
        "svm_linear": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", SVC(kernel="linear", C=0.1))
        ]),
        "svm_rbf": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", SVC(kernel="rbf", C=1.0, gamma="scale"))
        ]),
        "svm_poly": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", SVC(kernel="poly", degree=3, C=1.0, gamma="scale"))
        ]),
        "svm_sigmoid": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", SVC(kernel="sigmoid", C=1.0, gamma="scale"))
        ]),
        "svm_laplacian": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", SVC(kernel=laplacian_kernel, C=1.0))
        ])
    }


def main():
    iris = load_iris()
    X_train, X_test, y_train, y_test = train_test_split(
        iris.data,
        iris.target,
        test_size=0.2,
        random_state=42,
        stratify=iris.target
    )
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    for algorithm, estimator in create_models().items():
        estimator.fit(X_train, y_train)
        predictions = estimator.predict(X_test)
        print(
            f"{algorithm}: "
            f"accuracy={accuracy_score(y_test, predictions):.4f}, "
            f"precision={precision_score(y_test, predictions, average='weighted'):.4f}, "
            f"recall={recall_score(y_test, predictions, average='weighted'):.4f}, "
            f"f1={f1_score(y_test, predictions, average='weighted'):.4f}"
        )

        estimator.fit(iris.data, iris.target)
        model_path = MODEL_DIR / f"iris_{algorithm}_model.pkl"
        joblib.dump(estimator, model_path)
        print(f"Đã huấn luyện lại trên đủ 150 mẫu và lưu {algorithm}: {model_path}")


if __name__ == "__main__":
    main()
