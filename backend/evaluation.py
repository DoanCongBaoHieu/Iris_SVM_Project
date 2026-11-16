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
    "laplacian": "svm_laplacian",
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


@lru_cache(maxsize=64)
def build_decision_boundary(kernel: str, feature_x: int, feature_y: int, grid_size: int = 40):
    """Fit a separate two-feature SVM; this is not the deployed four-feature model."""
    if feature_x == feature_y:
        raise ValueError("Choose two different Iris features.")

    iris = load_iris()
    X_train, X_test, y_train, y_test = train_test_split(
        iris.data,
        iris.target,
        test_size=0.2,
        random_state=42,
        stratify=iris.target,
    )
    model_key = KERNEL_MODEL_KEYS[kernel]
    feature_indices = [feature_x, feature_y]
    estimator = create_models()[model_key]
    estimator.fit(X_train[:, feature_indices], y_train)

    all_features = iris.data[:, feature_indices]
    x_min, y_min = np.min(all_features, axis=0)
    x_max, y_max = np.max(all_features, axis=0)
    x_padding = (x_max - x_min) * 0.08
    y_padding = (y_max - y_min) * 0.08
    x_values = np.linspace(x_min - x_padding, x_max + x_padding, grid_size)
    y_values = np.linspace(y_min - y_padding, y_max + y_padding, grid_size)
    xx, yy = np.meshgrid(x_values, y_values)
    grid_points = np.column_stack((xx.ravel(), yy.ravel()))
    grid_predictions = estimator.predict(grid_points).reshape(grid_size, grid_size)

    test_predictions = estimator.predict(X_test[:, feature_indices])
    holdout_points = [
        {
            "x": float(point[0]),
            "y": float(point[1]),
            "actual": int(actual),
            "predicted": int(predicted),
        }
        for point, actual, predicted in zip(
            X_test[:, feature_indices], y_test, test_predictions
        )
    ]

    return {
        "kernel": kernel,
        "model_kind": "separately_trained_2d_model",
        "note": (
            "Decision regions come from a separate SVM trained on the two selected "
            "features; they do not represent the deployed four-feature model."
        ),
        "feature_x": {"index": feature_x, "name": iris.feature_names[feature_x]},
        "feature_y": {"index": feature_y, "name": iris.feature_names[feature_y]},
        "classes": [str(name) for name in iris.target_names],
        "grid": {
            "x_values": x_values.astype(float).tolist(),
            "y_values": y_values.astype(float).tolist(),
            "predictions": grid_predictions.astype(int).tolist(),
        },
        "holdout_points": holdout_points,
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "random_state": 42,
    }
