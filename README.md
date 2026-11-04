# Phân loại hoa Iris bằng các kernel SVM

Dự án học máy minh họa cách dùng năm kernel của Support Vector Machine (SVM) để phân loại ba loài hoa Iris. Ứng dụng gồm giao diện web tiếng Việt, API dự đoán bằng FastAPI, các mô hình đã huấn luyện và chức năng tài khoản/lưu lịch sử dự đoán.

## Nội dung

- Nhập bốn đặc trưng của hoa: chiều dài và chiều rộng đài hoa, chiều dài và chiều rộng cánh hoa.
- Chọn một hoặc nhiều mô hình để so sánh kết quả dự đoán.
- Đăng ký, đăng nhập, đổi mật khẩu và lưu/xem lịch sử dự đoán.
- Tìm hiểu dữ liệu Iris, quy trình học máy và các kernel SVM trên giao diện.

## Năm kernel SVM

Mỗi mô hình dùng `StandardScaler` để chuẩn hóa dữ liệu trước khi huấn luyện SVC.

| Mã mô hình | Kernel | Mô tả ngắn |
| --- | --- | --- |
| `svm_linear` | Linear | Tạo ranh giới phân lớp tuyến tính. |
| `svm_rbf` | RBF | Mô hình hóa ranh giới phi tuyến bằng hàm xuyên tâm. |
| `svm_poly` | Polynomial | Tạo ranh giới dựa trên đa thức bậc 3. |
| `svm_sigmoid` | Sigmoid | Dùng hàm sigmoid để tạo ranh giới phân lớp. |
| `svm_laplacian` | Laplacian | Kernel tùy chỉnh dựa trên khoảng cách Manhattan; được định nghĩa trong `backend/kernels.py`. |

Các chỉ số được in khi huấn luyện dùng tập kiểm tra 20% với chia phân tầng và `random_state=42`. Sau bước đánh giá, mỗi mô hình được huấn luyện lại trên toàn bộ 150 mẫu Iris và lưu trong `model/`.

## Công nghệ

- Python, scikit-learn, NumPy, joblib
- FastAPI và Uvicorn
- SQLAlchemy với SQLite, SQL Server hoặc PostgreSQL
- HTML, CSS và JavaScript thuần cho frontend

## Yêu cầu

- Python 3.10 trở lên
- Trình duyệt web hiện đại
- Git (nếu tải dự án bằng Git)

## Cài đặt và chạy

### 1. Cài thư viện Python

Mở terminal tại thư mục gốc dự án:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### 2. Tạo hoặc cập nhật các mô hình

Các tệp model đã huấn luyện có sẵn trong `model/`. Để huấn luyện lại và tính các chỉ số trên tập kiểm tra:

```powershell
python -m backend.train_models
```

Lệnh này thay mới năm tệp `model/iris_svm_*_model.pkl`.

### 3. Khởi chạy API

Thiết lập SQLite để chạy cục bộ mà không cần cấu hình máy chủ cơ sở dữ liệu:

```powershell
$env:DATABASE_URL = "sqlite:///./iris_svm.db"
uvicorn backend.app:app --reload
```

API chạy tại `http://127.0.0.1:8000`. Tài liệu tương tác của API có tại `http://127.0.0.1:8000/docs`.

Nếu không đặt `DATABASE_URL`, backend sẽ ưu tiên SQL Server cục bộ (`.\SQLEXPRESS`) khi driver `pyodbc` khả dụng; nếu không, backend dùng SQLite. Có thể đặt `DATABASE_URL` thành URL PostgreSQL hoặc SQL Server phù hợp với môi trường của bạn.

### 4. Khởi chạy giao diện web

Phục vụ thư mục `frontend/` bằng một máy chủ web tĩnh. Ví dụ, mở terminal thứ hai tại thư mục gốc dự án:

```powershell
python -m http.server 5500 --directory frontend
```

Mở `http://127.0.0.1:5500`. Khi chạy trên `localhost` hoặc `127.0.0.1`, frontend gọi API tại `http://127.0.0.1:8000`.

## API dự đoán

Endpoint `POST /predict` nhận các đặc trưng theo centimet và danh sách mã mô hình tùy chọn:

```json
{
  "algorithms": ["svm_linear", "svm_rbf"],
  "sepal_length": 5.1,
  "sepal_width": 3.5,
  "petal_length": 1.4,
  "petal_width": 0.2
}
```

`algorithms` có thể chứa một hoặc nhiều mã trong bảng kernel. Nếu bỏ qua trường này, API dùng `svm_rbf`. Có thể thêm `user_id` để lưu kết quả đầu tiên vào lịch sử của người dùng đã đăng nhập.

Các endpoint tài khoản và lịch sử chính:

| Phương thức | Đường dẫn | Mục đích |
| --- | --- | --- |
| `POST` | `/register` | Tạo tài khoản. |
| `POST` | `/login` | Đăng nhập. |
| `POST` | `/change-password` | Đổi mật khẩu. |
| `GET` | `/history/{user_id}` | Lấy lịch sử dự đoán. |
| `DELETE` | `/history/{user_id}/{history_id}` | Xóa một bản ghi lịch sử. |
| `DELETE` | `/history/{user_id}` | Xóa toàn bộ lịch sử của người dùng. |

## Cấu trúc thư mục

```text
backend/       API, kết nối cơ sở dữ liệu, huấn luyện và kernel Laplacian
frontend/      Giao diện web, JavaScript, CSS, các phần HTML và hình ảnh
model/         Năm mô hình SVM đã huấn luyện
reports/       Hình trực quan hóa dữ liệu
eda.py         Phân tích khám phá dữ liệu Iris
visualize.py   Tạo biểu đồ dữ liệu
requirements.txt
```

## Dữ liệu

Dự án sử dụng bộ Iris có sẵn trong scikit-learn (`sklearn.datasets.load_iris`): 150 mẫu, 4 đặc trưng số và 3 lớp (`setosa`, `versicolor`, `virginica`).

## Ghi chú

- Khi chạy backend, cần giữ nguyên tệp `backend/kernels.py` vì mô hình Laplacian đã lưu tham chiếu đến hàm kernel trong tệp này.
- Thông tin cấu hình cơ sở dữ liệu được đọc từ biến môi trường `DATABASE_URL`.
- Các chỉ số được ghi trong giao diện là kết quả của lần đánh giá trên tập chia cố định; kết quả có thể thay đổi nếu thay dữ liệu hoặc tham số huấn luyện.
