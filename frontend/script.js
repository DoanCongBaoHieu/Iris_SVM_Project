// ======================================================
// IRIS SVM CLASSIFIER - FRONTEND JAVASCRIPT
// ======================================================


// ======================================================
// 1. CẤU HÌNH API
// ======================================================

const API_BASE_URL =
    (window.location.hostname === "localhost" ||
     window.location.hostname === "127.0.0.1")
        ? "http://127.0.0.1:8000"
        : "https://iris-svm-api-oar1.onrender.com";

const API_ENDPOINTS = {
    predict: `${API_BASE_URL}/predict`,
    login: `${API_BASE_URL}/login`,
    register: `${API_BASE_URL}/register`
};


// ======================================================
// 2. LẤY CÁC PHẦN TỬ HTML
// ======================================================

const elements = {
    sepalLength:
        document.getElementById("sepal-length"),

    sepalWidth:
        document.getElementById("sepal-width"),

    petalLength:
        document.getElementById("petal-length"),

    petalWidth:
        document.getElementById("petal-width"),

    predictButton:
        document.getElementById("predict-button"),

    errorMessage:
        document.getElementById("error-message"),

    resultPlaceholder:
        document.getElementById("result-placeholder"),

    predictionResult:
        document.getElementById("prediction-result"),

    flowerImage:
        document.getElementById("flower-image"),

    speciesName:
        document.getElementById("species-name"),

    predictionMessage:
        document.getElementById("prediction-message"),

    predictionCode:
        document.getElementById("prediction-code")
};


// ======================================================
// 3. DỮ LIỆU CẤU HÌNH
// ======================================================

const FLOWER_IMAGES = {
    setosa: "images/setosa.jpg",
    versicolor: "images/versicolor.jpg",
    virginica: "images/virginica.jpg"
};


const SAMPLE_DATA = {
    setosa: {
        sepal_length: 5.1,
        sepal_width: 3.5,
        petal_length: 1.4,
        petal_width: 0.2
    },

    versicolor: {
        sepal_length: 6.0,
        sepal_width: 2.9,
        petal_length: 4.5,
        petal_width: 1.5
    },

    virginica: {
        sepal_length: 6.5,
        sepal_width: 3.0,
        petal_length: 5.2,
        petal_width: 2.0
    }
};


// ======================================================
// 4. HIỂN THỊ LỖI
// ======================================================

function showError(message) {

    if (!elements.errorMessage) {
        return;
    }

    elements.errorMessage.textContent = message;

    elements.errorMessage.classList.add("show");
}


// ======================================================
// 5. XÓA THÔNG BÁO LỖI
// ======================================================

function clearError() {

    if (!elements.errorMessage) {
        return;
    }

    elements.errorMessage.textContent = "";

    elements.errorMessage.classList.remove("show");
}


// ======================================================
// 6. KIỂM TRA DỮ LIỆU ĐẦU VÀO
// ======================================================

function validateInput() {

    const sepalLength =
        parseFloat(elements.sepalLength.value);

    const sepalWidth =
        parseFloat(elements.sepalWidth.value);

    const petalLength =
        parseFloat(elements.petalLength.value);

    const petalWidth =
        parseFloat(elements.petalWidth.value);


    // ----------------------------------------------
    // Kiểm tra ô trống
    // ----------------------------------------------

    if (
        Number.isNaN(sepalLength) ||
        Number.isNaN(sepalWidth) ||
        Number.isNaN(petalLength) ||
        Number.isNaN(petalWidth)
    ) {

        showError(
            "Vui lòng nhập đầy đủ 4 thông số của hoa."
        );

        return null;
    }


    // ----------------------------------------------
    // Kiểm tra giá trị phải lớn hơn 0
    // ----------------------------------------------

    if (
        sepalLength <= 0 ||
        sepalWidth <= 0 ||
        petalLength <= 0 ||
        petalWidth <= 0
    ) {

        showError(
            "Các thông số phải lớn hơn 0."
        );

        return null;
    }


    // ----------------------------------------------
    // Trả về dữ liệu
    // ----------------------------------------------

    return {
        sepal_length: sepalLength,
        sepal_width: sepalWidth,
        petal_length: petalLength,
        petal_width: petalWidth
    };
}


// ======================================================
// 7. HIỂN THỊ TRẠNG THÁI LOADING (CÓ VÒNG XOAY)
// ======================================================

function setLoading(isLoading) {
    if (!elements.predictButton) {
        return;
    }

    if (isLoading) {
        elements.predictButton.disabled = true;
        // Thêm vòng xoay (spinner) vào trước chữ
        elements.predictButton.innerHTML =
            '<span class="spinner"></span> ĐANG DỰ ĐOÁN...';
    } else {
        elements.predictButton.disabled = false;
        // Trả lại giao diện ban đầu
        elements.predictButton.innerHTML =
            '🌸 DỰ ĐOÁN LOÀI HOA';
    }
}


// ======================================================
// 8. HÀM GỌI API DÙNG CHUNG
// ======================================================

async function requestAPI(
    url,
    method = "GET",
    data = null
) {

    const options = {
        method: method,
        headers: {
            "Content-Type": "application/json"
        }
    };


    // Chỉ thêm body khi có dữ liệu
    if (data !== null) {

        options.body =
            JSON.stringify(data);
    }


    const response =
        await fetch(url, options);


    // ----------------------------------------------
    // Đọc response
    // ----------------------------------------------

    let responseData = null;

    try {

        responseData =
            await response.json();

    } catch (error) {

        responseData = null;
    }


    // ----------------------------------------------
    // Kiểm tra lỗi HTTP
    // ----------------------------------------------

    if (!response.ok) {

        let errorMessage =
            "Máy chủ không thể xử lý yêu cầu.";

        if (
            responseData &&
            responseData.detail
        ) {

            errorMessage =
                typeof responseData.detail === "string"
                    ? responseData.detail
                    : "Dữ liệu gửi lên không hợp lệ.";
        }


        throw new Error(errorMessage);
    }


    return responseData;
}


// ======================================================
// 9. HIỂN THỊ KẾT QUẢ DỰ ĐOÁN
// ======================================================

function displayResult(data) {

    const species =
        data.species;

    const prediction =
        data.prediction;


    // ----------------------------------------------
    // Hiển thị tên loài
    // ----------------------------------------------

    elements.speciesName.textContent =
        species;


    // ----------------------------------------------
    // Hiển thị mã lớp
    // ----------------------------------------------

    elements.predictionCode.textContent =
        prediction;


    // ----------------------------------------------
    // Hiển thị thông báo
    // ----------------------------------------------

    if (data.message) {

        elements.predictionMessage.textContent =
            data.message;

    } else {

        elements.predictionMessage.textContent =
            `Mô hình dự đoán đây là hoa ${species}.`;
    }


    // ----------------------------------------------
    // Hiển thị ảnh hoa
    // ----------------------------------------------

    const imagePath =
        FLOWER_IMAGES[species.toLowerCase()];


    if (imagePath) {

        elements.flowerImage.src =
            imagePath;

        elements.flowerImage.alt =
            `Hoa Iris ${species}`;
    }


    // ----------------------------------------------
    // Hiển thị khu vực kết quả
    // ----------------------------------------------

    elements.resultPlaceholder.classList.add(
        "hidden"
    );

    elements.predictionResult.classList.remove(
        "hidden"
    );


    elements.predictionResult.classList.remove("animate-pop");
    void elements.predictionResult.offsetWidth;
    elements.predictionResult.classList.add("animate-pop");
}


// ======================================================
// 10. DỰ ĐOÁN HOA
// ======================================================

async function predictFlower() {

    clearError();


    // ----------------------------------------------
    // Kiểm tra dữ liệu
    // ----------------------------------------------

    const flowerData =
        validateInput();


    if (!flowerData) {
        return;
    }


    // ----------------------------------------------
    // Bật loading
    // ----------------------------------------------

    setLoading(true);


    try {

        // ------------------------------------------
        // Gọi FastAPI
        // ------------------------------------------

        const requestData = {
            user_id: Number(localStorage.getItem("user_id")),
            ...flowerData
        };
        const result =
            await requestAPI(
            API_ENDPOINTS.predict,
            "POST",
            requestData
);


        // ------------------------------------------
        // Ghi log để kiểm tra
        // ------------------------------------------

        console.log(
            "Kết quả từ API:",
            result
        );


        // ------------------------------------------
        // Hiển thị kết quả
        // ------------------------------------------

        displayResult(result);

    } catch (error) {

        console.error(
            "Lỗi API:",
            error
        );


        showError(
            error.message ||
            "Không thể kết nối đến máy chủ."
        );

    } finally {

        // ------------------------------------------
        // Tắt loading
        // ------------------------------------------

        setLoading(false);
    }
}


// ======================================================
// 11. ĐIỀN DỮ LIỆU MẪU
// ======================================================

function fillSample(species) {

    const sample =
        SAMPLE_DATA[species];


    if (!sample) {
        return;
    }


    elements.sepalLength.value =
        sample.sepal_length;

    elements.sepalWidth.value =
        sample.sepal_width;

    elements.petalLength.value =
        sample.petal_length;

    elements.petalWidth.value =
        sample.petal_width;


    clearError();
}


// ======================================================
// 12. SỰ KIỆN NÚT DỰ ĐOÁN
// ======================================================

if (elements.predictButton) {

    elements.predictButton.addEventListener(
        "click",
        predictFlower
    );
}


// ======================================================
// 13. PHÍM ENTER
// ======================================================
//
// Chỉ cho phép Enter trong 4 ô nhập thông số Iris.
// Không dùng document-wide nữa.
//
// Điều này rất quan trọng khi sau này chúng ta
// thêm form Login/Register.
// ======================================================

const predictionInputs = [
    elements.sepalLength,
    elements.sepalWidth,
    elements.petalLength,
    elements.petalWidth
];


predictionInputs.forEach(input => {

    if (!input) {
        return;
    }


    input.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" &&
                elements.predictButton &&
                !elements.predictButton.disabled
            ) {

                event.preventDefault();

                predictFlower();
            }
        }
    );
});


// ======================================================
// 14. CHO PHÉP HTML GỌI fillSample()
// ======================================================
//
// Giữ tương thích với các nút mẫu hiện tại
// nếu index.html đang dùng:
// onclick="fillSample('setosa')"
// ======================================================

window.fillSample =
    fillSample;


// ======================================================
// 15. KIỂM TRA KẾT NỐI JAVASCRIPT
// ======================================================

console.log(
    "Iris SVM frontend JavaScript đã được tải."
);

console.log(
    "API:",
    API_BASE_URL
);
// ======================================================
// 16. QUẢN LÝ NGƯỜI DÙNG
// ======================================================

const userId = localStorage.getItem("user_id");
const username = localStorage.getItem("username");

const userAccount = document.getElementById("user-account");
const currentUsername = document.getElementById("current-username");
const logoutButton = document.getElementById("logout-button");

// Nếu chưa đăng nhập → quay về trang Login
if (!userId || !username) {
    window.location.href = "login.html";
}

// Hiển thị tài khoản đang đăng nhập
if (userAccount && currentUsername) {
    currentUsername.textContent = username;
    userAccount.classList.remove("hidden");
}

// Xử lý đăng xuất
if (logoutButton) {
    logoutButton.addEventListener("click", () => {

        localStorage.removeItem("user_id");
        localStorage.removeItem("username");

        window.location.href = "login.html";
    });
}
// ======================================================
// 17. QUẢN LÝ ĐỔI MẬT KHẨU
// ======================================================

const passwordModal =
    document.getElementById("change-password-modal");

const closePasswordButton =
    document.getElementById("close-password-modal");

const cancelPasswordButton =
    document.getElementById("cancel-password-button");

const submitPasswordButton =
    document.getElementById("submit-password-button");

const passwordOverlay =
    document.querySelector(".password-modal-overlay");

const currentPasswordInput =
    document.getElementById("current-password");

const newPasswordInput =
    document.getElementById("new-password");

const confirmPasswordInput =
    document.getElementById("confirm-password");

const passwordMessage =
    document.getElementById("password-message");


// ======================================================
// HÀM ĐÓNG POPUP
// ======================================================

function closePasswordModal() {

    if (!passwordModal) {
        return;
    }

    passwordModal.classList.add("hidden");

    if (currentPasswordInput) {
        currentPasswordInput.value = "";
    }

    if (newPasswordInput) {
        newPasswordInput.value = "";
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.value = "";
    }

    if (passwordMessage) {
        passwordMessage.textContent = "";
        passwordMessage.className = "password-message";
    }
}


// ======================================================
// NÚT X
// ======================================================

if (closePasswordButton) {

    closePasswordButton.addEventListener(
        "click",
        closePasswordModal
    );

}


// ======================================================
// NÚT HỦY
// ======================================================

if (cancelPasswordButton) {

    cancelPasswordButton.addEventListener(
        "click",
        closePasswordModal
    );

}


// ======================================================
// BẤM RA NGOÀI POPUP
// ======================================================

if (passwordOverlay) {

    passwordOverlay.addEventListener(
        "click",
        closePasswordModal
    );

}


// ======================================================
// PHÍM ESC
// ======================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            passwordModal &&
            !passwordModal.classList.contains("hidden")
        ) {
            closePasswordModal();
        }

    }
);


// ======================================================
// NÚT LƯU MẬT KHẨU MỚI
// ======================================================

if (submitPasswordButton) {

    submitPasswordButton.addEventListener(
        "click",
        async function () {

            const userId =
                localStorage.getItem("user_id");

            const currentPassword =
                currentPasswordInput.value.trim();

            const newPassword =
                newPasswordInput.value.trim();

            const confirmPassword =
                confirmPasswordInput.value.trim();


            // ------------------------------------------
            // Kiểm tra đăng nhập
            // ------------------------------------------

            if (!userId) {

                passwordMessage.textContent =
                    "Phiên đăng nhập không hợp lệ.";

                passwordMessage.className =
                    "password-message error";

                return;
            }


            // ------------------------------------------
            // Kiểm tra mật khẩu hiện tại
            // ------------------------------------------

            if (!currentPassword) {

                passwordMessage.textContent =
                    "Vui lòng nhập mật khẩu hiện tại.";

                passwordMessage.className =
                    "password-message error";

                currentPasswordInput.focus();

                return;
            }


            // ------------------------------------------
            // Kiểm tra mật khẩu mới
            // ------------------------------------------

            if (!newPassword) {

                passwordMessage.textContent =
                    "Vui lòng nhập mật khẩu mới.";

                passwordMessage.className =
                    "password-message error";

                newPasswordInput.focus();

                return;
            }


            // ------------------------------------------
            // Kiểm tra độ dài
            // ------------------------------------------

            if (newPassword.length < 6) {

                passwordMessage.textContent =
                    "Mật khẩu mới phải có ít nhất 6 ký tự.";

                passwordMessage.className =
                    "password-message error";

                newPasswordInput.focus();

                return;
            }


            // ------------------------------------------
            // Kiểm tra xác nhận
            // ------------------------------------------

            if (newPassword !== confirmPassword) {

                passwordMessage.textContent =
                    "Mật khẩu xác nhận không khớp.";

                passwordMessage.className =
                    "password-message error";

                confirmPasswordInput.focus();

                return;
            }


            // ------------------------------------------
            // Loading
            // ------------------------------------------

            submitPasswordButton.disabled = true;

            submitPasswordButton.textContent =
                "⏳ Đang cập nhật...";


            try {

                const response = await fetch(
                    `${API_BASE_URL}/change-password`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            user_id: Number(userId),
                            current_password:
                                currentPassword,
                            new_password:
                                newPassword
                        })
                    }
                );


                const data =
                    await response.json();


                // --------------------------------------
                // API trả lỗi
                // --------------------------------------

                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Không thể đổi mật khẩu."
                    );

                }


                // --------------------------------------
                // Thành công
                // --------------------------------------

                passwordMessage.textContent =
                    "✅ Đổi mật khẩu thành công.";

                passwordMessage.className =
                    "password-message success";


                setTimeout(
                    closePasswordModal,
                    1200
                );


            } catch (error) {

                console.error(
                    "Lỗi đổi mật khẩu:",
                    error
                );

                passwordMessage.textContent =
                    error.message ||
                    "Đã xảy ra lỗi.";

                passwordMessage.className =
                    "password-message error";


            } finally {

                submitPasswordButton.disabled = false;

                submitPasswordButton.textContent =
                    "🔑 Lưu mật khẩu mới";

            }

        }
    );

}

// ======================================================
// 18. LỊCH SỬ DỰ ĐOÁN
// ======================================================

const historyTotal =
    document.getElementById("history-total");

const historyMessage =
    document.getElementById("history-message");

const historyTableBody =
    document.getElementById("history-table-body");

const refreshHistoryButton =
    document.getElementById("refresh-history-button");

const historyPrevButton =
    document.getElementById("history-prev-button");

const historyNextButton =
    document.getElementById("history-next-button");

const historyPageNumbers =
    document.getElementById("history-page-numbers");

const historyPageInfo =
    document.getElementById("history-page-info");


// ======================================================
// CẤU HÌNH PHÂN TRANG
// ======================================================

const HISTORY_ITEMS_PER_PAGE = 10;

let historyData = [];

let currentHistoryPage = 1;


// ======================================================
// HIỂN THỊ THÔNG BÁO
// ======================================================

function showHistoryMessage(message, type = "") {

    if (!historyMessage) {
        return;
    }

    historyMessage.textContent = message;

    historyMessage.className = "history-message";

    if (type) {
        historyMessage.classList.add(type);
    }
}


// ======================================================
// ĐỊNH DẠNG THỜI GIAN
// ======================================================

function formatHistoryDate(dateValue) {

    if (!dateValue) {
        return "-";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}


// ======================================================
// ĐỊNH DẠNG TÊN LOÀI HOA
// ======================================================

function formatSpecies(species) {

    if (!species) {
        return "-";
    }

    return species.charAt(0).toUpperCase()
        + species.slice(1);
}


// ======================================================
// HIỂN THỊ MỘT TRANG
// ======================================================

function renderHistoryPage() {

    if (!historyTableBody) {
        return;
    }

    const totalItems =
        historyData.length;

    const totalPages =
        Math.ceil(
            totalItems / HISTORY_ITEMS_PER_PAGE
        );


    // Không có dữ liệu

    if (totalItems === 0) {

        historyTableBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="history-empty"
                >
                    📭 Bạn chưa có lần dự đoán nào.
                </td>
            </tr>
        `;

        renderHistoryPagination(0);

        return;
    }


    // Bảo đảm trang hiện tại hợp lệ

    if (currentHistoryPage > totalPages) {
        currentHistoryPage = totalPages;
    }

    if (currentHistoryPage < 1) {
        currentHistoryPage = 1;
    }


    // Xác định dữ liệu của trang hiện tại

    const startIndex =
        (currentHistoryPage - 1)
        * HISTORY_ITEMS_PER_PAGE;

    const endIndex =
        startIndex
        + HISTORY_ITEMS_PER_PAGE;

    const pageItems =
        historyData.slice(
            startIndex,
            endIndex
        );


    // Hiển thị bảng

    historyTableBody.innerHTML =
        pageItems.map((item, index) => {

            const rowNumber =
                startIndex + index + 1;

            return `
                <tr>

                    <td>
                        ${rowNumber}
                    </td>

                    <td>
                        ${formatHistoryDate(
                            item.created_at
                        )}
                    </td>

                    <td>
                        ${Number(
                            item.sepal_length
                        ).toFixed(1)}
                    </td>

                    <td>
                        ${Number(
                            item.sepal_width
                        ).toFixed(1)}
                    </td>

                    <td>
                        ${Number(
                            item.petal_length
                        ).toFixed(1)}
                    </td>

                    <td>
                        ${Number(
                            item.petal_width
                        ).toFixed(1)}
                    </td>

                    <td>
                        <strong class="history-species">
                            🌸 ${formatSpecies(
                                item.species
                            )}
                        </strong>
                    </td>

                    <td>
                        ${
                            item.prediction_time_ms !== null &&
                            item.prediction_time_ms !== undefined
                                ? `${Number(
                                    item.prediction_time_ms
                                ).toFixed(4)} ms`
                                : "-"
                        }
                    </td>

                </tr>
            `;

        }).join("");


    // Cập nhật phân trang

    renderHistoryPagination(totalPages);
}


// ======================================================
// HIỂN THỊ CÁC NÚT PHÂN TRANG
// ======================================================

function renderHistoryPagination(totalPages) {

    if (
        !historyPageNumbers ||
        !historyPageInfo
    ) {
        return;
    }


    // Không có dữ liệu / chỉ có 1 trang

    if (totalPages <= 1) {

        historyPageNumbers.innerHTML = "";

        historyPageInfo.textContent =
            historyData.length > 0
                ? `Hiển thị ${historyData.length} bản ghi`
                : "";

        if (historyPrevButton) {
            historyPrevButton.disabled = true;
        }

        if (historyNextButton) {
            historyNextButton.disabled = true;
        }

        return;
    }


    // Nút Trước

    if (historyPrevButton) {
        historyPrevButton.disabled =
            currentHistoryPage === 1;
    }


    // Nút Sau

    if (historyNextButton) {
        historyNextButton.disabled =
            currentHistoryPage === totalPages;
    }


    // Các nút số trang

    historyPageNumbers.innerHTML = "";


    for (let page = 1; page <= totalPages; page++) {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "history-page-number";

        button.textContent = page;


        if (page === currentHistoryPage) {
            button.classList.add("active");
        }


        button.addEventListener(
            "click",
            () => {

                currentHistoryPage = page;

                renderHistoryPage();

            }
        );


        historyPageNumbers.appendChild(button);
    }


    // Thông tin trang

    const startItem =
        (currentHistoryPage - 1)
        * HISTORY_ITEMS_PER_PAGE + 1;

    const endItem =
        Math.min(
            currentHistoryPage
            * HISTORY_ITEMS_PER_PAGE,
            historyData.length
        );


    historyPageInfo.textContent =
        `Hiển thị ${startItem}–${endItem} / ${historyData.length} bản ghi`;
}


// ======================================================
// TẢI LỊCH SỬ
// ======================================================

async function loadPredictionHistory() {

    if (!historyTableBody) {
        return;
    }

    const currentUserId =
        localStorage.getItem("user_id");


    if (!currentUserId) {

        showHistoryMessage(
            "Phiên đăng nhập không hợp lệ.",
            "error"
        );

        return;
    }


    // Loading

    historyTableBody.innerHTML = `
        <tr>
            <td
                colspan="8"
                class="history-empty"
            >
                ⏳ Đang tải lịch sử dự đoán...
            </td>
        </tr>
    `;


    showHistoryMessage("");


    if (refreshHistoryButton) {

        refreshHistoryButton.disabled = true;

        refreshHistoryButton.textContent =
            "⏳ Đang tải...";

    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/history/${currentUserId}`
            );


        const data =
            await response.json();


        // API trả lỗi

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Không thể tải lịch sử dự đoán."
            );
        }


        // Lưu toàn bộ lịch sử

        historyData =
            Array.isArray(data.history)
                ? data.history
                : [];


        // Tổng số bản ghi

        if (historyTotal) {

            historyTotal.textContent =
                data.total ?? historyData.length;

        }


        // Quay về trang 1 sau khi tải lại

        currentHistoryPage = 1;


        // Hiển thị dữ liệu

        renderHistoryPage();


    } catch (error) {

        console.error(
            "Lỗi tải lịch sử dự đoán:",
            error
        );


        historyData = [];

        currentHistoryPage = 1;


        historyTableBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="history-empty"
                >
                    ❌ Không thể tải lịch sử dự đoán.
                </td>
            </tr>
        `;


        showHistoryMessage(
            error.message ||
            "Đã xảy ra lỗi khi tải lịch sử.",
            "error"
        );


    } finally {

        if (refreshHistoryButton) {

            refreshHistoryButton.disabled = false;

            refreshHistoryButton.textContent =
                "🔄 Làm mới";

        }

    }
}


// ======================================================
// NÚT TRANG TRƯỚC
// ======================================================

if (historyPrevButton) {

    historyPrevButton.addEventListener(
        "click",
        () => {

            if (currentHistoryPage > 1) {

                currentHistoryPage--;

                renderHistoryPage();

            }

        }
    );

}


// ======================================================
// NÚT TRANG SAU
// ======================================================

if (historyNextButton) {

    historyNextButton.addEventListener(
        "click",
        () => {

            const totalPages =
                Math.ceil(
                    historyData.length
                    / HISTORY_ITEMS_PER_PAGE
                );


            if (currentHistoryPage < totalPages) {

                currentHistoryPage++;

                renderHistoryPage();

            }

        }
    );

}


// ======================================================
// NÚT LÀM MỚI
// ======================================================

if (refreshHistoryButton) {

    refreshHistoryButton.addEventListener(
        "click",
        loadPredictionHistory
    );

}


// ======================================================
// TỰ ĐỘNG TẢI KHI MỞ TRANG
// ======================================================

loadPredictionHistory();













// ======================================================
// HIỆU ỨNG TỰ ĐỘNG SÁNG MENU BÊN CẠNH (SCROLL SPY)
// ======================================================

function initSideMenu() {
    // Lấy danh sách các nút bên cạnh (ngoại trừ nút Lên đầu trang)
    const sideLinks = document.querySelectorAll('.floating-side-menu .side-link:not(.back-top)');

    window.addEventListener('scroll', () => {
        let currentSection = '';

        // Kiểm tra xem đang cuộn tới thẻ nào
        sideLinks.forEach(link => {
            const sectionId = link.getAttribute('href').substring(1);
            const section = document.getElementById(sectionId);

            if (section) {
                const sectionTop = section.offsetTop;
                // Nếu cuộn qua phần đầu của mục đó một chút thì nhận diện là đang ở mục đó
                if (window.scrollY >= sectionTop - 300) {
                    currentSection = sectionId;
                }
            }
        });

        // Bật màu xanh cho nút tương ứng, xóa màu của các nút khác
        sideLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    });
}

// Do giao diện của bạn load component động, ta chờ 1 giây để các khối HTML ghép xong rồi mới chạy
setTimeout(initSideMenu, 1000);



// ======================================================
// 20. CHẾ ĐỘ TỐI (DARK MODE)
// ======================================================
function initDarkMode() {
    // 1. Kiểm tra xem người dùng đã từng bật Dark Mode trước đó chưa (lưu trong máy)
    const isDarkMode = localStorage.getItem('darkMode') === 'true';

    // 2. Hàm áp dụng giao diện
    const applyTheme = (dark) => {
        const body = document.body;
        const toggleBtn = document.getElementById('theme-toggle');

        if (dark) {
            body.classList.add('dark-mode');
            if(toggleBtn) toggleBtn.textContent = '☀️'; // Đổi icon sang Mặt trời
        } else {
            body.classList.remove('dark-mode');
            if(toggleBtn) toggleBtn.textContent = '🌙'; // Đổi icon sang Mặt trăng
        }
    };

    // 3. Chạy giao diện ngay khi load trang
    applyTheme(isDarkMode);

    // 4. Lắng nghe sự kiện click vào nút (Vì header load động nên ta bắt sự kiện trên document)
    document.addEventListener('click', function(event) {
        const toggleBtn = event.target.closest('#theme-toggle');
        if (!toggleBtn) return; // Nếu không click trúng nút thì bỏ qua

        // Đảo ngược trạng thái
        const isDarkNow = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', !isDarkNow);
        applyTheme(!isDarkNow);
    });
}

// Khởi chạy tính năng
initDarkMode();