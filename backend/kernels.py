"""Custom SVM kernels used by the Iris classifiers."""

import numpy as np


def laplacian_kernel(X, Y):
    """Laplacian kernel with unit bandwidth."""
    distances = np.abs(X[:, None, :] - Y[None, :, :]).sum(axis=2)
    return np.exp(-distances)
