# Thuyết trình dự án phân loại hoa Iris bằng SVM

Tài liệu này giải thích dự án đã làm, cách các phần phối hợp, thao tác trên web và API Swagger nhận/trả dữ liệu ra sao. Đây là bản trình bày về sản phẩm hiện có, không phải bài hướng dẫn lập trình một website khác. Thời lượng gợi ý: 10–15 phút; mỗi mục có thể dùng làm một slide.

## 1. Mở đầu: dự án giải quyết vấn đề gì?

**Nội dung slide:** Phân loại hoa Iris; input là bốn số đo; output là một trong ba loài; sản phẩm gồm model, API, website, tài khoản và lịch sử.

**Lời trình bày:** Em xin chào thầy và các bạn. Em là [họ tên], hôm nay em xin trình bày dự án phân loại hoa Iris bằng Support Vector Machine, viết tắt là SVM. Người dùng nhập bốn số đo của một bông hoa, hệ thống dự đoán hoa thuộc Setosa, Versicolor hay Virginica. Dự án không dừng ở việc huấn luyện một model trong Python mà kết nối model với API và giao diện web để người dùng trực tiếp nhập dữ liệu và xem kết quả.

## 2. Input của bài toán

Bộ dữ liệu Iris có 150 mẫu, 3 lớp và 4 đặc trưng đo bằng centimet. Model phân loại bằng số đo, không phân loại bằng hình ảnh; ảnh trên trang chỉ để minh họa.

| Đặc trưng | Ý nghĩa | Ví dụ |
| --- | --- | ---: |
| `sepal_length` | Chiều dài đài hoa | 5.1 cm |
| `sepal_width` | Chiều rộng đài hoa | 3.5 cm |
| `petal_length` | Chiều dài cánh hoa | 1.4 cm |
| `petal_width` | Chiều rộng cánh hoa | 0.2 cm |

**Lời trình bày:** Bài toán nhận bốn đặc trưng số làm input và dự đoán nhãn loài làm output. Bộ Iris gốc có 150 mẫu, mỗi loài gồm 50 mẫu. Các ảnh hoa trên website không được đưa vào model; model chỉ sử dụng bốn số đo.

## 3. Quy trình model đã thực hiện

```text
150 mẫu Iris có nhãn
        ↓
Chia train/test 80% / 20%, phân tầng, random_state=42
        ↓
StandardScaler → SVC với từng kernel
        ↓
Đo chỉ số trên 30 mẫu test
        ↓
Huấn luyện lại trên toàn bộ 150 mẫu
        ↓
Lưu năm pipeline vào model/
```

Mỗi pipeline gồm `StandardScaler` để chuẩn hóa bốn số đo và `SVC` để phân loại. Scaler được đặt trong pipeline nên ở giai đoạn đánh giá nó chỉ được fit bằng dữ liệu huấn luyện, tránh rò rỉ thông tin từ tập test. Sau khi đánh giá, script fit lại mỗi pipeline với toàn bộ dữ liệu rồi lưu thành file `.pkl`.

**Lời trình bày:** Năm cấu hình được đánh giá trên cùng một tập kiểm tra gồm 30 mẫu, chia phân tầng với `random_state=42`, để phép so sánh công bằng. Sau khi tính chỉ số, mỗi model được huấn luyện lại trên 150 mẫu và lưu trong thư mục `model/`. Khi website dự đoán, backend dùng những model đã lưu; không chia tập và không huấn luyện lại ở thời điểm người dùng bấm nút.

## 4. Năm kernel SVM

SVM tìm ranh giới phân loại. Kernel là cách tính độ tương đồng giữa các điểm, cho phép SVM biểu diễn những dạng ranh giới khác nhau. Dự án giữ nguyên SVC và thay kernel/cấu hình để so sánh.

| Tên trên web | Mã API | Cấu hình chính | Giải thích trực quan |
| --- | --- | --- | --- |
| SVM Linear | `svm_linear` | `C=0.1` | Ranh giới tuyến tính. |
| SVM RBF | `svm_rbf` | `C=1`, `gamma="scale"` | Ranh giới phi tuyến linh hoạt. |
| SVM Polynomial | `svm_poly` | Bậc 3, `C=1`, `gamma="scale"` | Mô hình hóa quan hệ đa thức. |
| SVM Sigmoid | `svm_sigmoid` | `C=1`, `gamma="scale"` | Dùng hàm sigmoid làm kernel. |
| SVM Laplacian | `svm_laplacian` | `C=1` | Kernel tùy chỉnh `exp(-L1 distance)`. |

Bốn kernel đầu là lựa chọn sẵn có trong scikit-learn. Laplacian được định nghĩa trong `backend/kernels.py`, tính khoảng cách Manhattan trên đặc trưng đã chuẩn hóa rồi lấy hàm mũ. Mỗi mã model được backend ánh xạ đến một file model riêng.

## 5. Các phần của sản phẩm kết nối ra sao?

```text
Người dùng → Frontend web → HTTP/JSON → FastAPI
                                         ├─ pipeline SVM đã lưu
                                         └─ SQLAlchemy → database
Người dùng ← Frontend web ← JSON response ← FastAPI
```

- **Frontend:** đăng nhập/đăng ký, nhập số đo, chọn kernel, hiển thị kết quả, bảng đánh giá và lịch sử.
- **FastAPI:** nhận request, kiểm tra dữ liệu, chọn model, tạo response JSON và cung cấp endpoint tài khoản/lịch sử.
- **Models:** năm pipeline được nạp khi backend khởi động.
- **Database:** SQLAlchemy lưu tài khoản và lịch sử; cấu hình qua `DATABASE_URL`, hỗ trợ SQLite, SQL Server, PostgreSQL.
- **Swagger:** tài liệu tương tác cho chính các endpoint FastAPI này, không phải API/model thứ hai.

## 6. Đăng ký và đăng nhập

**Đăng ký:** người dùng nhập tên, mật khẩu, xác nhận mật khẩu. Tên cần 3–50 ký tự; mật khẩu 6–100 ký tự; hai mật khẩu phải trùng. Frontend gửi `POST /register`. Backend kiểm tra trùng tên, băm mật khẩu với bcrypt rồi lưu tài khoản. Output thành công gồm thông báo, `user_id`, `username`.

**Đăng nhập:** frontend gửi `POST /login` với tên và mật khẩu. Backend kiểm tra mật khẩu với hash đã lưu. Khi đúng, backend trả `user_id` và `username`; trình duyệt giữ hai giá trị trong `localStorage` để gắn hành động với tài khoản. Đăng xuất xóa hai giá trị này. Trang chính và tính năng dự đoán yêu cầu có phiên đăng nhập.

## 7. Khi người dùng thao tác dự đoán trên web

### Input ở đâu?

Trong phần **Thông số đầu vào / Dự đoán**, bên trái là bốn ô cho chiều dài/rộng đài hoa và chiều dài/rộng cánh hoa. Đơn vị là centimet. Bên dưới là năm checkbox kernel; RBF được chọn sẵn. Nút mẫu nhanh chỉ điền các ô, không tự chạy dự đoán.

### Quá trình sau khi bấm “Dự đoán loài hoa”

1. JavaScript đọc và kiểm tra đủ bốn giá trị là số, lớn hơn 0.
2. Kiểm tra đã chọn ít nhất một model và có user ID hợp lệ.
3. Ghép `user_id`, danh sách `algorithms`, bốn số đo thành JSON.
4. Gửi JSON đến `POST /predict` trên FastAPI.
5. Backend kiểm tra schema, số đo `>0` và `<=10`, model có hỗ trợ và user có tồn tại.
6. Với từng model được chọn, pipeline chuẩn hóa số đo bằng scaler đã học rồi gọi SVC.
7. SVC trả nhãn số `0`, `1` hoặc `2`; backend đổi lần lượt thành `setosa`, `versicolor`, `virginica`.
8. Backend đo thời gian gọi `predict`, trả response.
9. Frontend hiển thị loài/ảnh trong khung **Kết quả dự đoán**. Nếu chọn nhiều kernel thì hiện thêm thẻ cho từng model.
10. Nếu lịch sử được lưu, frontend tải lại bảng **Lịch sử dự đoán**.

**Lưu ý:** không có huấn luyện model trong chuỗi này. `prediction_time_ms` là thời gian chạy dự đoán trong backend, không tính mạng, database hay cập nhật giao diện.

### Ví dụ input và output

Ví dụ các số `5.1, 3.5, 1.4, 0.2` với các model đã lưu hiện tại đều được dự đoán là `setosa`.

Output chính xuất hiện ở bên phải: tên loài dự đoán và ảnh minh họa. Nếu chọn nhiều model, các thẻ bên dưới thể hiện tên kernel, loài dự đoán và thời gian riêng của từng model. Kết quả chính là model đầu tiên trong danh sách checkbox được gửi.

API không trả xác suất/confidence cho riêng mẫu. Nhãn `setosa` chỉ nói model chọn lớp Setosa; không có nghĩa mẫu đó được dự đoán với độ tin cậy 96,67%.

## 8. Swagger: nhận gì, trả gì, dùng ra sao?

Mở `http://127.0.0.1:8000/docs` khi backend chạy. Swagger được FastAPI tạo tự động. Với mỗi endpoint, nó trình bày phương thức, đường dẫn, schema. Người dùng bấm **Try it out**, điền dữ liệu rồi **Execute**. Swagger gửi HTTP request trực tiếp đến backend và hiển thị status code, response JSON và thời gian request. Website cũng gọi cùng backend; khác nhau là website trình bày thân thiện, Swagger trình bày request/response kỹ thuật.

### `POST /predict`

Input là `algorithms` (một hoặc nhiều mã kernel), bốn số đo và `user_id` tùy chọn. Thiếu `algorithms` thì backend mặc định RBF. Không gửi `user_id` vẫn dự đoán được qua Swagger nhưng không lưu lịch sử; website hiện yêu cầu login.

```json
{
  "user_id": 12,
  "algorithms": ["svm_linear", "svm_rbf"],
  "sepal_length": 5.1,
  "sepal_width": 3.5,
  "petal_length": 1.4,
  "petal_width": 0.2
}
```

Response thành công có dạng:

```json
{
  "algorithm": "svm_linear",
  "model_name": "SVM kernel tuyến tính (Linear)",
  "prediction": 0,
  "species": "setosa",
  "prediction_time_ms": 0.1,
  "message": "...",
  "results": [
    {
      "algorithm": "svm_linear",
      "model_name": "SVM kernel tuyến tính (Linear)",
      "prediction": 0,
      "species": "setosa",
      "prediction_time_ms": 0.1
    }
  ],
  "history_saved": true
}
```

Thời gian là ví dụ minh họa. Khi chọn nhiều model, `results` có một phần tử cho mỗi model, đúng theo thứ tự request. Các trường ở đầu response là output chính từ model đầu tiên. `history_saved` cho biết backend đã lưu lịch sử chưa.

**Thao tác thử:** mở `POST /predict` → **Try it out** → dán JSON → **Execute** → đọc status/response bên dưới. Đây tương đương việc website gửi cùng bộ số liệu và kernel đã chọn; website sau đó chuyển response thành ảnh, tên loài và thẻ hiển thị.

### Những endpoint khác thường dùng

| Endpoint | Input | Output |
| --- | --- | --- |
| `POST /register` | `{"username":"demo","password":"abc123"}` | Thông báo, `user_id`, `username`. Tạo tài khoản trong database đang kết nối. |
| `POST /login` | username/password | Thông báo, `user_id`, `username`. |
| `POST /change-password` | `user_id`, `current_password`, `new_password` | Thông báo đổi mật khẩu hoặc lỗi nếu mật khẩu hiện tại sai/mật khẩu mới không hợp lệ. |
| `GET /history/{user_id}` | user ID ở URL, ví dụ `/history/12` | user ID, username, tổng số và mảng lịch sử gồm thời gian, input, loài, thời gian dự đoán. |
| `DELETE /history/{user_id}/{history_id}` | user ID và ID bản ghi ở URL | Thông báo cùng số bản ghi xóa. |
| `DELETE /history/{user_id}` | user ID ở URL | Xóa lịch sử của user, trả số bản ghi đã xóa. |

Thử `POST /register` hoặc `DELETE` trên Swagger sẽ tác động đến database thật đang cấu hình. Đăng ký cùng tên có thể bị từ chối; xóa dữ liệu là thao tác thật.

Status thường gặp: `200` thành công; `400` lỗi nghiệp vụ; `401` tên/mật khẩu sai; `404` không thấy user/bản ghi; `422` input sai hoặc model không hỗ trợ; `500` lỗi backend/database.

## 9. Lịch sử dự đoán lưu gì?

Sau dự đoán bằng user ID hợp lệ, database lưu user, bốn số đo, nhãn số, tên loài, thời gian model chính và thời điểm tạo. Frontend gọi `GET /history/{user_id}` để đưa dữ liệu vào bảng có phân trang, làm mới, xóa từng bản ghi và xóa toàn bộ.

Khi chọn nhiều kernel, API trả về toàn bộ output cho giao diện nhưng database chỉ lưu output của kernel đầu tiên. Bản ghi hiện không lưu danh sách kernel đã chọn. Không lưu confidence vì API không tạo confidence.

## 10. Độ chính xác và bảng đánh giá

Đây là chỉ số tổng thể trên dữ liệu có đáp án, không phải output của một lần dự đoán.

| Kernel | Accuracy | Precision weighted | Recall weighted | F1 weighted |
| --- | ---: | ---: | ---: | ---: |
| Linear | 93.33% | 93.33% | 93.33% | 93.33% |
| RBF | **96.67%** | **96.97%** | **96.67%** | **96.66%** |
| Polynomial | 90.00% | 92.31% | 90.00% | 89.77% |
| Sigmoid | 90.00% | 92.31% | 90.00% | 89.77% |
| Laplacian | 93.33% | 93.33% | 93.33% | 93.33% |

Các số trên lấy từ log lần chạy script huấn luyện, tập test 30 mẫu. Với RBF, 96,67% tương đương 29/30 mẫu đúng trong lần chia này. Precision là tỷ lệ dự đoán một lớp mà đúng; recall là tỷ lệ mẫu thực sự của lớp được model tìm thấy; F1 kết hợp hai chỉ số; weighted là trung bình tính theo số mẫu mỗi lớp.

RBF cao nhất trong lần đánh giá đó, nhưng chưa thể khẳng định luôn tốt nhất: test chỉ có 30 mẫu, một lần chia cố định và script train hiện không chạy cross-validation.

Giao diện hiện dùng cùng số liệu với log huấn luyện cho cả năm kernel. Phần diễn giải đánh giá cũng nêu rõ phép đo dùng một tập test 30 mẫu và chưa chạy cross-validation; vì vậy đây là kết quả của một phép chia cố định, không phải cam kết cho mọi dữ liệu mới.

## 11. Các phần nội dung còn lại trên website

- **Dữ liệu Iris:** kích thước dataset, bốn đặc trưng, ba loài và hình minh họa.
- **Tìm hiểu SVM:** phần diễn giải khái niệm thuật toán/kernel.
- **Quy trình xây dựng:** tóm tắt chuẩn bị dữ liệu, chia tập, huấn luyện, đánh giá, dự đoán.
- **Bảng đánh giá:** so sánh năm kernel, nội dung tĩnh nên cần cập nhật sau mỗi lần thay kết quả.
- **Thông tin API:** đường dẫn để mở Swagger và xem endpoint.
- **Liên hệ:** thông tin dự án và giảng viên hướng dẫn.

## 12. Kịch bản demo mạch lạc

1. Đăng nhập và nói rằng tài khoản dùng để gắn lịch sử với người dùng.
2. Chỉ bốn input và nhắc đơn vị centimet.
3. Dùng nút mẫu Setosa để điền `5.1, 3.5, 1.4, 0.2`.
4. Chọn hai hay nhiều kernel rồi bấm **Dự đoán loài hoa**.
5. Chỉ khung output chính và thẻ output từng model; nói model đầu tiên là kết quả chính.
6. Chỉ lịch sử để cho thấy input và kết quả chính đã lưu.
7. Mở `/docs`, thử `POST /predict` bằng JSON tương đương, đối chiếu response thô với output web.
8. Cuối cùng chỉ bảng đánh giá và nói rõ accuracy là kết quả trên 30 mẫu test, không phải confidence của mẫu demo.

**Lời dẫn:** “Em nhập bốn số đo và chọn kernel trên web. Frontend gửi JSON đến FastAPI. Backend dùng scaler đã học, gọi các model đã lưu, đổi nhãn 0/1/2 thành tên loài và trả JSON. Website biến JSON đó thành tên, ảnh và thời gian. Swagger gọi đúng endpoint ấy nhưng cho em thấy trực tiếp dữ liệu gửi đi và phản hồi API. Nếu có user ID hợp lệ, output chính được ghi vào lịch sử. Accuracy là chỉ số đánh giá từ tập test trước đó, không phải xác suất của dự đoán hiện tại.”

## 13. Câu hỏi thường gặp

### Model có dùng ảnh hoa làm input không?

Không. Ảnh chỉ minh họa. Input model là bốn số đo hình thái.

### Năm model là năm thuật toán khác nhau?

Không. Cả năm đều là SVC; phần khác nhau là kernel và tham số. Dự án so sánh các cách SVM tạo ranh giới.

### Accuracy 96,67% có nghĩa mẫu đang nhập có 96,67% khả năng đúng?

Không. Đó là tỷ lệ đúng của RBF trên 30 mẫu test trong lần chia đó. API hiện không trả xác suất của mẫu riêng lẻ.

### Web và Swagger có model/API riêng?

Không. Cả hai gọi cùng FastAPI và model đã nạp. Web làm giao diện người dùng; Swagger dùng để thử request/response kỹ thuật.

### Chọn nhiều kernel thì lịch sử lưu gì?

Frontend nhận kết quả của mọi kernel, nhưng database lưu output chính của kernel đầu tiên.

## 14. Kết luận

Dự án kết nối dữ liệu Iris, năm pipeline SVM, đánh giá model, file model đã lưu, API FastAPI, giao diện web, tài khoản và lịch sử database. Người dùng nhập bốn số đo; backend gọi kernel đã chọn; website hiển thị nhãn; Swagger giúp quan sát và gọi trực tiếp cùng API. Trong lần đánh giá hiện tại, RBF đứng đầu trên tập test 30 mẫu, với giới hạn là kết quả của một lần chia cố định.

**Lời kết:** “Qua dự án, em đã kết nối input số đo với model, API, output trên web và lịch sử. Em xin cảm ơn thầy và các bạn đã lắng nghe. Em sẵn sàng trả lời câu hỏi.”
