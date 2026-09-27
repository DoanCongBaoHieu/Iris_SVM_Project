from sklearn.datasets import load_iris

iris = load_iris()

print("Số mẫu:", iris.data.shape[0])
print("Số đặc trưng:", iris.data.shape[1])
print("Tên đặc trưng:", iris.feature_names)
print("Tên lớp:", iris.target_names)