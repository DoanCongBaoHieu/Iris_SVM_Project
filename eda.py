from sklearn.datasets import load_iris
import pandas as pd


# 1. Load dataset
iris = load_iris()


# 2. Chuyển dữ liệu thành DataFrame
df = pd.DataFrame(
    iris.data,
    columns=iris.feature_names
)


# 3. Thêm biến target
df["target"] = iris.target


# 4. Thêm tên loài hoa
df["species"] = df["target"].map(
    {
        0: "setosa",
        1: "versicolor",
        2: "virginica"
    }
)


# 5. Hiển thị 5 dòng đầu
print("\n===== 5 DÒNG ĐẦU TIÊN =====")
print(df.head())


# 6. Kích thước dữ liệu
print("\n===== KÍCH THƯỚC DỮ LIỆU =====")
print(df.shape)


# 7. Thông tin dữ liệu
print("\n===== THÔNG TIN DỮ LIỆU =====")
print(df.info())


# 8. Kiểm tra giá trị thiếu
print("\n===== GIÁ TRỊ THIẾU =====")
print(df.isnull().sum())


# 9. Thống kê mô tả
print("\n===== THỐNG KÊ MÔ TẢ =====")
print(df.describe())


# 10. Số lượng mẫu theo từng lớp
print("\n===== PHÂN BỐ CÁC LỚP =====")
print(df["species"].value_counts())