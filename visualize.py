from sklearn.datasets import load_iris
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns


# ==============================
# 1. LOAD DATASET
# ==============================

iris = load_iris()

df = pd.DataFrame(
    iris.data,
    columns=iris.feature_names
)

df["species"] = pd.Categorical.from_codes(
    iris.target,
    iris.target_names
)


# ==============================
# 2. TẠO THƯ MỤC LƯU BIỂU ĐỒ
# ==============================

import os

os.makedirs("reports", exist_ok=True)


# ==============================
# 3. PHÂN BỐ 4 ĐẶC TRƯNG
# ==============================

fig, axes = plt.subplots(2, 2, figsize=(12, 8))

features = iris.feature_names

for ax, feature in zip(axes.ravel(), features):
    sns.histplot(
        data=df,
        x=feature,
        hue="species",
        kde=True,
        ax=ax
    )

    ax.set_title(f"Phân bố {feature}")
    ax.set_xlabel(feature)
    ax.set_ylabel("Số lượng")

plt.tight_layout()

plt.savefig(
    "reports/feature_distribution.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()


# ==============================
# 4. SCATTER PLOT
# ==============================

plt.figure(figsize=(10, 7))

sns.scatterplot(
    data=df,
    x="petal length (cm)",
    y="petal width (cm)",
    hue="species",
    s=80
)

plt.title("Quan hệ giữa Petal Length và Petal Width")
plt.xlabel("Petal Length (cm)")
plt.ylabel("Petal Width (cm)")
plt.legend(title="Loài hoa")

plt.tight_layout()

plt.savefig(
    "reports/petal_scatter.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()



# ==============================
# 5. PAIR PLOT
# ==============================

pair_plot = sns.pairplot(
    df,
    hue="species",
    diag_kind="hist"
)

pair_plot.fig.suptitle(
    "Pair Plot - Bộ dữ liệu Iris",
    y=1.02
)

pair_plot.savefig(
    "reports/pairplot.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()