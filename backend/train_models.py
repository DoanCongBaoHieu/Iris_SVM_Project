from pathlib import Path

import joblib
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier


MODEL_DIR = Path(__file__).resolve().parents[1] / "model"


def create_models():
    return {
        "svm": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", SVC(kernel="linear", C=0.1))
        ]),
        "knn": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", KNeighborsClassifier(n_neighbors=5))
        ]),
        "tree": DecisionTreeClassifier(random_state=42),
        "random_forest": RandomForestClassifier(
            n_estimators=100,
            random_state=42
        ),
        "logistic": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(max_iter=1000, random_state=42))
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

        if algorithm == "svm":
            cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
            scores = cross_val_score(
                estimator,
                X_train,
                y_train,
                cv=cv,
                scoring="accuracy"
            )
            print(
                "svm 5-fold CV on training set: "
                f"scores={scores.tolist()}, "
                f"mean={scores.mean():.4f}, std={scores.std():.4f}"
            )

        estimator.fit(iris.data, iris.target)
        model_path = MODEL_DIR / f"iris_{algorithm}_model.pkl"
        joblib.dump(estimator, model_path)
        print(f"Đã huấn luyện lại trên đủ 150 mẫu và lưu {algorithm}: {model_path}")


if __name__ == "__main__":
    main()
