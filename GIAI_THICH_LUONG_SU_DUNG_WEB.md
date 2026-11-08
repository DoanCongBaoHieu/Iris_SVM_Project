# Giải thích website và luồng sử dụng dự án Iris SVM

Tài liệu này giải thích website theo góc nhìn người dùng: nhập ở đâu, bấm gì, hệ thống xử lý ra sao, kết quả hiện ở đâu và “độ chính xác” có ý nghĩa gì. Trọng tâm không phải HTML/CSS.

## 1. Website dùng để làm gì?

Website là giao diện cho hệ thống phân loại hoa Iris. Người dùng nhập bốn số đo bằng centimet. Backend đưa số đo vào một hoặc nhiều model SVM đã huấn luyện trước và trả về một trong ba nhãn `setosa`, `versicolor`, `virginica`.

**Điểm quan trọng:** Khi bấm **Dự đoán**, hệ thống không huấn luyện lại model. Model được huấn luyện trước, lưu trong thư mục `model/` rồi API nạp model đó và chạy dự đoán trên số đo vừa nhập.

## 2. Các phần chính trên website

| Phần | Mục đích |
| --- | --- |
| Đăng nhập / đăng ký | Tạo tài khoản hoặc mở phiên sử dụng. Hiện tại cần đăng nhập trước khi dự đoán. |
| Dữ liệu Iris | Giới thiệu 150 mẫu, 4 đặc trưng, 3 loài và hình ảnh minh họa. |
| Tìm hiểu SVM / quy trình | Giải thích khái niệm và các bước xây dựng model. |
| Dự đoán loài hoa | Nhập bốn số đo, chọn kernel và xem dự đoán. |
| Đánh giá mô hình | Xem các chỉ số đánh giá tổng thể của những kernel. Đây không phải điểm tin cậy cho một lần dự đoán. |
| Lịch sử dự đoán | Xem, làm mới, phân trang hoặc xóa các bản ghi của tài khoản. |
| API / liên hệ | Giới thiệu API, đường dẫn tài liệu Swagger và thông tin dự án. |

## 3. Đăng ký và đăng nhập

### Đăng ký

1. Chọn **Đăng ký** ở màn hình đăng nhập.
2. Nhập tên đăng nhập, mật khẩu và xác nhận mật khẩu.
3. Tên đăng nhập cần ít nhất 3 ký tự; mật khẩu cần ít nhất 6 ký tự; hai ô mật khẩu cần khớp.
4. Trình duyệt gửi dữ liệu đến `POST /register`.
5. Backend kiểm tra tên đã tồn tại chưa, băm mật khẩu bằng bcrypt rồi lưu tài khoản vào database.

Nếu hợp lệ, website báo đăng ký thành công. Nếu trùng tên hoặc dữ liệu không hợp lệ, website hiện lỗi và không tạo tài khoản.

### Đăng nhập

1. Nhập tên đăng nhập và mật khẩu, rồi chọn **Đăng nhập**.
2. Trình duyệt gửi yêu cầu `POST /login`.
3. Backend tìm tài khoản và so sánh mật khẩu với giá trị đã băm.
4. Khi thành công, backend trả `user_id` và `username`. Trình duyệt lưu hai giá trị này để nhận diện phiên hiện tại rồi chuyển vào trang chính.

Đăng xuất sẽ xóa `user_id` và `username` khỏi trình duyệt. Vì vậy, cần đăng nhập lại trước khi dự đoán tiếp.

## 4. Input nằm ở đâu?

Vào phần **Dự đoán loài hoa**. Bốn ô nhập ở cột bên trái:

| Nhãn trên ô nhập | Tên trường gửi API | Ví dụ |
| --- | --- | ---: |
| Chiều dài đài hoa | `sepal_length` | 5.1 cm |
| Chiều rộng đài hoa | `sepal_width` | 3.5 cm |
| Chiều dài cánh hoa | `petal_length` | 1.4 cm |
| Chiều rộng cánh hoa | `petal_width` | 0.2 cm |

Nút mẫu nhanh **Setosa**, **Versicolor**, **Virginica** chỉ điền số liệu vào các ô; nó không tự chạy dự đoán. Sau khi bấm nút mẫu vẫn cần bấm **Dự đoán loài hoa**.

Đầu vào cần đủ bốn giá trị số lớn hơn 0. Backend giới hạn mỗi số đo tối đa 10 cm. Nếu thiếu ô, nhập giá trị sai, số đo ngoài giới hạn, chưa chọn kernel hoặc phiên đăng nhập không hợp lệ, yêu cầu không được xử lý thành công và website hiện thông báo.

## 5. Chọn kernel là chọn gì?

Các ô chọn bên dưới bốn số đo tương ứng với năm pipeline SVM đã huấn luyện. Chọn một kernel để dự đoán đơn lẻ; chọn nhiều kernel để so sánh trên cùng bộ số đo.

| Nhãn lựa chọn | Mã gửi lên API |
| --- | --- |
| SVM Linear | `svm_linear` |
| SVM RBF | `svm_rbf` |
| SVM Polynomial | `svm_poly` |
| SVM Sigmoid | `svm_sigmoid` |
| SVM Laplacian | `svm_laplacian` |

RBF được chọn sẵn ban đầu. Mỗi pipeline gồm scaler `StandardScaler` và một bộ phân loại SVC với kernel tương ứng.

## 6. Khi bấm “Dự đoán” thì điều gì xảy ra?

1. **Kiểm tra trên trình duyệt:** JavaScript đọc bốn ô, kiểm tra chúng là số và lớn hơn 0.
2. **Kiểm tra lựa chọn và phiên:** cần chọn ít nhất một kernel và phải có `user_id` đã đăng nhập.
3. **Tạo yêu cầu:** trình duyệt ghép ID người dùng, danh sách kernel và bốn số đo thành JSON.
4. **Gửi yêu cầu:** frontend gọi `POST /predict` trên FastAPI.
5. **Kiểm tra ở backend:** FastAPI kiểm tra giới hạn đầu vào, mã kernel có được hỗ trợ không và người dùng có tồn tại không.
6. **Chuẩn hóa:** pipeline dùng `StandardScaler` đã được khớp khi huấn luyện để biến đổi các số đo.
7. **Phân loại:** mỗi SVC được chọn trả nhãn số `0`, `1` hoặc `2`.
8. **Đổi nhãn:** backend ánh xạ `0 → setosa`, `1 → versicolor`, `2 → virginica`.
9. **Trả kết quả:** API trả tên model, tên loài, thời gian dự đoán và danh sách kết quả theo thứ tự kernel được chọn.
10. **Hiển thị và lưu:** JavaScript hiển thị kết quả; nếu lưu lịch sử thành công, frontend tải lại danh sách lịch sử.

Trong chuỗi trên không có huấn luyện lại model. Thời gian dự đoán là thời gian backend gọi `predict` của model; không bao gồm thời gian mạng, database hoặc cập nhật màn hình.

### Ví dụ dữ liệu gửi lên

Giả sử tài khoản có `user_id` là `12`, người dùng chọn Linear và RBF, nhập mẫu `5.1, 3.5, 1.4, 0.2`. JSON gửi đến API có dạng:

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

## 7. Output hiện ở đâu?

Output hiện ở **khung bên phải**, mục **Kết quả dự đoán**:

- Tên loài được hiển thị nổi bật cùng ảnh minh họa.
- Khi chọn từ hai kernel trở lên, phía dưới xuất hiện thẻ kết quả của từng kernel: tên model, loài dự đoán và thời gian xử lý.
- Khi chỉ chọn một kernel, giao diện chỉ hiện kết quả chính, không mở danh sách so sánh nhiều model.

Mẫu `5.1, 3.5, 1.4, 0.2` hiện được cả năm model trong thư mục dự án phân loại là `setosa`, phù hợp để demo. Với đầu vào khác, các kernel có thể cho nhãn khác nhau.

Phản hồi API gần như sau:

```json
{
  "algorithm": "svm_rbf",
  "model_name": "SVM kernel RBF",
  "prediction": 0,
  "species": "setosa",
  "prediction_time_ms": 0.12,
  "message": "...",
  "results": ["..."],
  "history_saved": true
}
```

Thời gian `0.12` chỉ minh họa định dạng, không phải thời gian cố định.

### Nhãn dự đoán không phải độ tin cậy

API hiện trả lời model chọn lớp nào; nó không trả xác suất hay phần trăm tin cậy cho riêng bông hoa đó. `species: "setosa"` nghĩa là model dự đoán Setosa, không có nghĩa model tin chắc 96,67% rằng mẫu cụ thể này là Setosa.

## 8. Độ chính xác khác kết quả một lần bấm ra sao?

- **Kết quả một lần dự đoán:** nhãn cho một bộ số đo, ví dụ `setosa`. Website hiện không cho biết confidence của mẫu đó.
- **Accuracy / độ chính xác đánh giá:** tỷ lệ dự đoán đúng trên nhiều mẫu đã biết đáp án, trong lần đánh giá model trước đó.

Theo log huấn luyện hiện có, RBF đạt accuracy 96,67% trên 30 mẫu kiểm tra, tương ứng 29 mẫu đúng và 1 mẫu sai trong lần chia đó. Con số này không được tính lại mỗi khi bấm nút và không phải xác suất đúng của đầu vào đang nhập.

Các chỉ số khác trên bảng:

- **Precision:** trong các mẫu được dự đoán thuộc một lớp, bao nhiêu mẫu thực sự đúng lớp đó.
- **Recall:** trong các mẫu thực sự thuộc một lớp, model tìm đúng được bao nhiêu.
- **F1:** chỉ số kết hợp precision và recall.
- Các chỉ số này trong log dùng trung bình có trọng số theo số mẫu của từng lớp.

## 9. Trang đánh giá mô hình

Bảng **Đánh giá mô hình** so sánh các kernel trên tập kiểm tra. Bảng được ghi sẵn trong file giao diện; API không chạy benchmark mỗi khi mở website. Nếu đổi dữ liệu hoặc huấn luyện lại, cần cập nhật bảng để nó đồng bộ với kết quả mới.

Các hàng trong bảng so sánh hiện đồng bộ với log của `backend/train_models.py`, gồm Sigmoid Precision 92,31% và F1 89,77%. Đây là số liệu đã ghi từ một lần đánh giá; bảng không tự chạy lại benchmark khi mở website.

Phần **Đánh giá và cách đọc kết quả** giải thích tập test 30 mẫu, cách hiểu các chỉ số và việc cross-validation chưa được chạy trong script hiện tại. Không hiển thị ma trận nhầm lẫn hay điểm cross-validation không được tính trong quy trình huấn luyện hiện tại.

## 10. Lịch sử: lưu gì và xem ở đâu?

Sau khi dự đoán bằng tài khoản hợp lệ, website gọi `GET /history/{user_id}` và hiển thị các bản ghi trong **Lịch sử dự đoán**. Một bản ghi gồm thời điểm, bốn số đo, loài dự đoán và thời gian của model chính.

Nếu người dùng chọn nhiều kernel, API trả tất cả kết quả cho màn hình, nhưng database chỉ lưu kết quả của kernel đầu tiên trong danh sách. Bản ghi hiện không lưu danh sách kernel đã chọn. Vì vậy, một lần bấm dự đoán tạo một bản ghi lịch sử chính, không phải một bản ghi riêng cho từng kernel.

Trong phần lịch sử có thể làm mới dữ liệu, chuyển trang, xóa từng bản ghi hoặc xóa toàn bộ. Xóa toàn bộ cần xác nhận và không thể hoàn tác.

## 11. Lỗi có thể gặp

| Thông báo / hiện tượng | Nguyên nhân có thể có | Việc cần làm |
| --- | --- | --- |
| Thiếu thông số | Chưa nhập đủ bốn giá trị số | Điền đủ bốn ô. |
| Số đo không hợp lệ | Có giá trị ≤ 0 hoặc > 10 cm | Kiểm tra số đo và đơn vị centimet. |
| Chưa chọn model | Chưa chọn kernel nào | Chọn ít nhất một trong năm kernel. |
| Yêu cầu đăng nhập lại | Trình duyệt không còn user ID hợp lệ | Đăng nhập lại. |
| Không kết nối máy chủ | Backend chưa chạy, sai API URL hoặc lỗi mạng | Khởi chạy API và kiểm tra kết nối. |
| Backend không tải được model | Thiếu tệp `.pkl` hoặc `backend/kernels.py` | Khôi phục model hoặc chạy script huấn luyện. |
| Dự đoán được nhưng lịch sử lỗi | Database không kết nối hoặc tải lịch sử lỗi | Kiểm tra `DATABASE_URL` và database. |

## 12. Lời giải thích ngắn khi demo

“Đầu tiên em đăng nhập để hệ thống biết tài khoản nào sẽ sở hữu lịch sử. Ở phần Dự đoán, em nhập bốn số đo bằng centimet hoặc chọn mẫu nhanh để điền. Em chọn một hay nhiều kernel rồi bấm Dự đoán. Trình duyệt kiểm tra dữ liệu và gửi JSON đến FastAPI. API dùng scaler đã học để chuẩn hóa số đo, chạy các SVM đã lưu, đổi nhãn số sang tên loài rồi trả kết quả. Tên loài và ảnh xuất hiện trong khung kết quả; nếu chọn nhiều kernel, bên dưới có kết quả và thời gian riêng của từng model. Nếu lưu thành công, bốn số đo và nhãn từ kernel đầu tiên được đưa vào lịch sử. Accuracy trên trang đánh giá là chỉ số trên 30 mẫu kiểm tra, không phải xác suất tin cậy cho mẫu vừa nhập.”

## 13. Sáu ý cần nhớ khi trình bày

1. **Input:** bốn số đo của đài hoa và cánh hoa, đơn vị centimet.
2. **Output:** tên loài do một hoặc nhiều kernel dự đoán; hiện chưa có confidence.
3. **Bấm dự đoán:** chạy model đã lưu, không huấn luyện lại.
4. **Accuracy:** đánh giá tổng thể trên tập kiểm tra 30 mẫu, không phải phần trăm chắc chắn cho một lần dự đoán.
5. **Lịch sử:** hiện chỉ lưu kết quả của kernel đầu tiên được chọn.
6. **RBF 96,67%:** cao nhất trong lần đánh giá hiện tại, không đảm bảo trên mọi dữ liệu mới.
