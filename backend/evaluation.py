from functools import lru_cache

import numpy as np
from sklearn.datasets import load_iris
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split

from backend.train_models import create_models


KERNEL_MODEL_KEYS = {
    "linear": "svm_linear",
    "rbf": "svm_rbf",
    "polynomial": "svm_poly",
    "sigmoid": "svm_sigmoid",
}


@lru_cache(maxsize=1)
def get_evaluation_report():
    """Compute holdout and CV metrics without reusing the holdout for CV."""
    iris = load_iris()
    X_train, X_test, y_train, y_test = train_test_split(
        iris.data,
        iris.target,
        test_size=0.2,
        random_state=42,
        stratify=iris.target,
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    models = create_models()
    holdout = {}
    cross_validation = {}

    for kernel, model_key in KERNEL_MODEL_KEYS.items():
        estimator = models[model_key]
        estimator.fit(X_train, y_train)
        predictions = estimator.predict(X_test)
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_test,
            predictions,
            average="weighted",
            zero_division=0,
        )
        holdout[kernel] = {
            "accuracy": float(accuracy_score(y_test, predictions)),
            "precision_weighted": float(precision),
            "recall_weighted": float(recall),
            "f1_weighted": float(f1),
            "confusion_matrix": confusion_matrix(
                y_test,
                predictions,
                labels=[0, 1, 2],
            ).astype(int).tolist(),
        }

        fold_scores = cross_validate(
            models[model_key],
            X_train,
            y_train,
            cv=cv,
            scoring={
                "accuracy": "accuracy",
                "f1_weighted": "f1_weighted",
            },
            return_train_score=False,
            n_jobs=1,
            error_score="raise",
        )
        cross_validation[kernel] = {
            "accuracy_mean": float(np.mean(fold_scores["test_accuracy"])),
            "accuracy_std": float(np.std(fold_scores["test_accuracy"], ddof=1)),
            "f1_weighted_mean": float(np.mean(fold_scores["test_f1_weighted"])),
            "f1_weighted_std": float(np.std(fold_scores["test_f1_weighted"], ddof=1)),
        }

    return {
        "kernels": list(KERNEL_MODEL_KEYS),
        "features": [str(name) for name in iris.feature_names],
        "classes": [str(name) for name in iris.target_names],
        "holdout_protocol": {
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test)),
            "test_size": 0.2,
            "random_state": 42,
            "stratified": True,
        },
        "cross_validation_protocol": {
            "samples": int(len(X_train)),
            "n_splits": 5,
            "shuffle": True,
            "random_state": 42,
            "standard_deviation": "sample (ddof=1)",
            "holdout_included": False,
        },
        "holdout": holdout,
        "cross_validation": cross_validation,
    }
