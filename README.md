# Phân loại hoa Iris bằng các kernel SVM

This Iris classifier always predicts with a separately saved main SVM model. Linear, RBF, Polynomial, Sigmoid and Laplacian are optional comparison models.

## Nội dung

- Nhập bốn đặc trưng của hoa: chiều dài và chiều rộng đài hoa, chiều dài và chiều rộng cánh hoa.
- The main SVM always predicts; select any of five kernels to compare additional results.
- Đăng nhập bằng Auth0; tài khoản cũ vẫn có thể đăng nhập bằng tên đăng nhập và mật khẩu.
- Lưu/xem lịch sử dự đoán theo tài khoản.
- Tìm hiểu dữ liệu Iris, quy trình học máy và các kernel SVM trên giao diện.

## Main model and optional comparison kernels

The main model is stored as `model/iris_svm_model.pkl`. The table below lists optional comparison models; each uses a `StandardScaler` pipeline.

| Mã mô hình | Kernel | Mô tả ngắn |
| --- | --- | --- |
| `svm_linear` | Linear | Tạo ranh giới phân lớp tuyến tính. |
| `svm_rbf` | RBF | Tạo ranh giới phi tuyến dựa trên khoảng cách RBF. |
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
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 2. Tạo hoặc cập nhật các mô hình

Các tệp model đã huấn luyện có sẵn trong `model/`. Để huấn luyện lại và tính các chỉ số trên tập kiểm tra:

```powershell
.venv\Scripts\python.exe -m backend.train_models
```

This command replaces the five optional comparison model files in `model/`.

### 3. Khởi chạy API

Mở file `.env` ở thư mục gốc dự án và thay URL mẫu bằng **External Database URL**
của PostgreSQL trong Render Dashboard. File `.env` đã được Git bỏ qua, vì vậy
thông tin đăng nhập không bị commit. Chỉ cần thiết lập file này một lần:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Không chia sẻ URL này vì nó chứa thông tin đăng nhập. Khi file `.env` đã được
cấu hình, khởi chạy API bằng:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app:app --reload
```

API chạy tại `http://127.0.0.1:8000`. Tài liệu tương tác của API có tại `http://127.0.0.1:8000/docs`.

Backend chỉ hỗ trợ PostgreSQL và sẽ báo lỗi rõ ràng nếu `DATABASE_URL` chưa được cấu hình.

Auth0 onboarding đã lưu `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
và `AUTH0_SECRET` vào `.env`. Không đưa các giá trị bí mật này vào frontend hoặc Git.
Ở môi trường local, `AUTH0_APP_BASE_URL` mặc định là `http://localhost:8000`
và `AUTH0_FRONTEND_URL` là `http://localhost:5500`. Khi triển khai, đặt
`AUTH0_APP_BASE_URL` thành URL công khai của API và `AUTH0_FRONTEND_URL` thành URL
công khai của frontend trong cấu hình môi trường backend. Callback Auth0 cần trỏ
đến `<AUTH0_APP_BASE_URL>/auth/callback`; `APP_BASE_URL` do onboarding tạo không
được dùng vì giá trị mặc định của nó không khớp cổng FastAPI.

Tài khoản Auth0 được ánh xạ vào người dùng ứng dụng bằng mã subject ổn định
(`sub`); chúng không tự động liên kết với tài khoản tên đăng nhập/mật khẩu cũ.
Khi khởi động, backend tự thêm cột `auth0_sub` cho cơ sở dữ liệu hiện có.

### 4. Khởi chạy giao diện web

Phục vụ thư mục `frontend/` bằng một máy chủ web tĩnh. Ví dụ, mở terminal thứ hai tại thư mục gốc dự án:

```powershell
python -m http.server 5500 --directory frontend
```

Mở `http://localhost:5500`. Khi chạy trên `localhost` hoặc `127.0.0.1`, frontend gọi API tại `http://localhost:8000`.

## Prediction API

`POST /predict` always runs the separately saved main SVM model. Optional comparison kernels are supplied in `kernels`; an empty list still returns the main prediction.

```json
{
  "kernels": ["linear", "rbf", "polynomial"],
  "sepal_length": 5.1,
  "sepal_width": 3.5,
  "petal_length": 1.4,
  "petal_width": 0.2
}
```

The response contains `main_result`, `main_prediction_time_ms`, `comparison_results`, and `comparison_times_ms`. `comparison_results` and `comparison_times_ms` are empty objects when no comparison kernels are selected. `user_id` is optional and saves the main prediction to the user's history when provided.

`GET /evaluation` reports the fixed 80/20 holdout metrics and five-fold stratified CV separately. CV uses only the 120 training samples; the 30-sample holdout remains reserved for the holdout table and confusion matrices. `GET /decision-boundary` builds a separate two-feature SVM illustration and does not represent the deployed four-feature model.

## Cấu trúc thư mục

```text
backend/       FastAPI, database access, model training and the Laplacian kernel
frontend/      Giao diện web, JavaScript, CSS, các phần HTML và hình ảnh
model/         Main SVM model and five optional comparison models
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
