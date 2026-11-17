// ======================================================
// IRIS SVM CLASSIFIER - FRONTEND JAVASCRIPT
// ======================================================


// ======================================================
// 1. CẤU HÌNH API
// ======================================================

const API_BASE_URL =
    (window.location.hostname === "localhost" ||
     window.location.hostname === "127.0.0.1")
        ? "http://localhost:8000"
        : "https://iris-svm-api-oar1.onrender.com";

const API_ENDPOINTS = {
    predict: `${API_BASE_URL}/predict`,
    login: `${API_BASE_URL}/login`,
    register: `${API_BASE_URL}/register`
};

const apiStatus = document.querySelector(".api-status");

async function updateApiStatus() {
    if (!apiStatus) {
        return;
    }

    const statusText = apiStatus.querySelector("[data-api-status-text]");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    apiStatus.dataset.state = "checking";
    statusText.textContent = "Đang kiểm tra API...";

    try {
        const response = await fetch(API_BASE_URL, {
            cache: "no-store",
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`API phản hồi HTTP ${response.status}`);
        }

        apiStatus.dataset.state = "online";
        statusText.textContent = "API đang hoạt động";
    } catch (error) {
        apiStatus.dataset.state = "offline";
        statusText.textContent = "API không hoạt động";
        console.warn("Không thể kết nối API:", error);
    } finally {
        clearTimeout(timeoutId);
    }
}

updateApiStatus();
setInterval(() => {
    if (document.visibilityState === "visible") {
        updateApiStatus();
    }
}, 300000);
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        updateApiStatus();
    }
});


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

    modelResults:
        document.getElementById("model-results")
};


// ======================================================
// 3. DỮ LIỆU CẤU HÌNH
// ======================================================

const FLOWER_IMAGES = {
    setosa: "images/setosa.jpg?v=2",
    versicolor: "images/versicolor.jpg?v=2",
    virginica: "images/virginica.jpg?v=2"
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


    return {
        sepal_length: sepalLength,
        sepal_width: sepalWidth,
        petal_length: petalLength,
        petal_width: petalWidth
    };
}


// ======================================================
// 7. Trạng thái đang dự đoán
// ======================================================

function setLoading(isLoading) {
    if (!elements.predictButton) {
        return;
    }

    if (isLoading) {
        elements.predictButton.disabled = true;
        elements.predictButton.innerHTML =
            '<span class="spinner"></span> ĐANG DỰ ĐOÁN...';
    } else {
        elements.predictButton.disabled = false;
        elements.predictButton.innerHTML =
            ' DỰ ĐOÁN LOÀI HOA';
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
        },
        credentials: "include"
    };


    if (data !== null) {

        options.body =
            JSON.stringify(data);
    }


    const response =
        await fetch(url, options);


    let responseData = null;

    try {

        responseData =
            await response.json();

    } catch (error) {

        responseData = null;
    }


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
    const species = String(data.main_result || "").toLowerCase();
    elements.speciesName.textContent = species;

    if (elements.modelResults) {
        elements.modelResults.replaceChildren();
        const comparisons = data.comparison_results || {};
        const comparisonTimes = data.comparison_times_ms || {};
        const kernels = Object.entries(comparisons);

        if (kernels.length > 0) {
            const comparison = document.createElement("details");
            comparison.className = "model-comparison";
            const summary = document.createElement("summary");
            summary.textContent = `So sánh kernel (${kernels.length})`;
            comparison.appendChild(summary);

            const table = document.createElement("table");
            table.className = "model-comparison-table";
            const thead = document.createElement("thead");
            const header = document.createElement("tr");
            ["Mô hình", "Dự đoán", "Thời gian xử lý"].forEach(label => {
                const th = document.createElement("th");
                th.scope = "col";
                th.textContent = label;
                header.appendChild(th);
            });
            thead.appendChild(header);

            const tbody = document.createElement("tbody");
            [["SVM gốc", species, data.main_prediction_time_ms],
                ...kernels.map(([kernel, result]) => [kernel, result, comparisonTimes[kernel]])]
                .forEach(([name, result, timeMs]) => {
                    const row = document.createElement("tr");
                    const nameCell = document.createElement("td");
                    nameCell.textContent = name;
                    const resultCell = document.createElement("td");
                    resultCell.textContent = result;
                    if (String(result).toLowerCase() !== species) {
                        resultCell.classList.add("prediction-disagreement");
                    }
                    const timeCell = document.createElement("td");
                    const elapsedMs = Number(timeMs);
                    timeCell.textContent = Number.isFinite(elapsedMs)
                        ? `${elapsedMs.toFixed(4)} ms`
                        : "—";
                    row.append(nameCell, resultCell, timeCell);
                    tbody.appendChild(row);
                });

            table.append(thead, tbody);
            comparison.appendChild(table);
            elements.modelResults.appendChild(comparison);
            elements.modelResults.classList.remove("hidden");
        } else {
            elements.modelResults.classList.add("hidden");
        }
    }

    const imagePath = FLOWER_IMAGES[species];
    if (imagePath) {
        elements.flowerImage.src = imagePath;
        elements.flowerImage.alt = `\u1ea2nh hoa Iris ${formatSpecies(species)} t\u01b0\u01a1ng \u1ee9ng v\u1edbi lo\u00e0i \u0111\u01b0\u1ee3c d\u1ef1 \u0111o\u00e1n.`;
        const caption = elements.flowerImage.closest(".result-section")?.querySelector(".artwork-caption");
        if (caption) {
            caption.textContent =
                "\\u1ea2nh hoa Iris " + formatSpecies(species) + " theo k\\u1ebft qu\\u1ea3 d\\u1ef1 \\u0111o\\u00e1n";
        }
    }

    elements.resultPlaceholder.classList.add("hidden");
    elements.predictionResult.classList.remove("hidden");
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

    const kernels = Array.from(
        document.querySelectorAll('input[name="prediction-kernel"]:checked')
    ).map(input => input.value);

    const storedUserId = localStorage.getItem("user_id");
    const userId = Number(storedUserId);

    if (!storedUserId || !Number.isInteger(userId) || userId <= 0) {
        showError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
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
            user_id: userId,
            kernels,
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

        if (result.history_saved) {
            await loadPredictionHistory();
        } else {
            showHistoryMessage(
                "Dự đoán thành công nhưng chưa được lưu lịch sử. Vui lòng đăng nhập lại.",
                "error"
            );
        }

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
const authProvider = localStorage.getItem("auth_provider");

const userAccount = document.getElementById("user-account");
const currentUsername = document.getElementById("current-username");
const logoutButton = document.getElementById("logout-button");

// Nếu chưa đăng nhập → quay về trang Login
if (!userId || !username) {
    window.location.href = "login.html?v=9";
}

// Hiển thị tài khoản đang đăng nhập
if (userAccount && currentUsername) {
    currentUsername.textContent = username;
    userAccount.classList.remove("hidden");
}

if (authProvider === "auth0") {
    const changePasswordButton = document.getElementById("change-password-button");
    if (changePasswordButton) {
        changePasswordButton.classList.add("hidden");
    }
}

// Xử lý đăng xuất
if (logoutButton) {
    logoutButton.addEventListener("click", () => {

        localStorage.removeItem("user_id");
        localStorage.removeItem("username");

        if (authProvider === "auth0") {
            localStorage.removeItem("auth_provider");
            window.location.assign(
                `${API_BASE_URL}/auth/logout?returnTo=${encodeURIComponent(
                    `${API_BASE_URL}/auth/after-logout`
                )}`
            );
            return;
        }

        window.location.href = "login.html?v=9";
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
                    " Đổi mật khẩu thành công.";

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
                    " Lưu mật khẩu mới";

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

const deleteAllHistoryButton =
    document.getElementById("delete-all-history-button");

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

    const timestamp = String(dateValue).trim();
    const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(timestamp);
    const date = new Date(hasTimezone ? timestamp : `${timestamp}+07:00`);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
        hourCycle: "h23"
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

    if (deleteAllHistoryButton) {
        deleteAllHistoryButton.disabled = totalItems === 0;
    }

    const totalPages =
        Math.ceil(
            totalItems / HISTORY_ITEMS_PER_PAGE
        );


    // Không có dữ liệu

    if (totalItems === 0) {

        historyTableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="history-empty"
                >
                     Bạn chưa có lần dự đoán nào.
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
                             ${formatSpecies(
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
                                            ).toFixed(4)} mili giây`
                                : "-"
                        }
                    </td>

                    <td>
                        <button
                            type="button"
                            class="history-delete-button history-delete-record-button"
                            data-history-id="${Number(item.id)}"
                        >
                             Xóa
                        </button>
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
                ? `Tổng cộng ${historyData.length} bản ghi`
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
        `Đang xem ${startItem}–${endItem} / ${historyData.length} bản ghi`;
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
                colspan="9"
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
        if (historyTotal) {
            historyTotal.textContent = "0";
        }
        if (deleteAllHistoryButton) {
            deleteAllHistoryButton.disabled = true;
        }


        historyTableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="history-empty"
                >
                     Không thể tải lịch sử dự đoán.
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
                " Làm mới";

        }

    }
}

async function deleteHistoryRecord(historyId, button) {
    const userId = localStorage.getItem("user_id");
    const record = historyData.find(item => item.id === historyId);

    if (!userId || !record) {
        showHistoryMessage(
            "Không tìm thấy bản ghi hoặc phiên đăng nhập không hợp lệ.",
            "error"
        );
        return;
    }

    if (!window.confirm(
        `Bạn có chắc muốn xóa lịch sử dự đoán hoa ${formatSpecies(record.species)} này không?`
    )) {
        return;
    }

    button.disabled = true;

    try {
        const result = await requestAPI(
            `${API_BASE_URL}/history/${encodeURIComponent(userId)}/${historyId}`,
            "DELETE"
        );
        await loadPredictionHistory();
        showHistoryMessage(result.message, "success");
    } catch (error) {
        showHistoryMessage(
            error.message || "Không thể xóa bản ghi lịch sử.",
            "error"
        );
    } finally {
        button.disabled = false;
    }
}

if (historyTableBody) {
    historyTableBody.addEventListener("click", event => {
        const button = event.target.closest(".history-delete-record-button");

        if (!button) {
            return;
        }

        const historyId = Number(button.dataset.historyId);
        if (Number.isInteger(historyId) && historyId > 0) {
            deleteHistoryRecord(historyId, button);
        }
    });
}

if (deleteAllHistoryButton) {
    deleteAllHistoryButton.addEventListener("click", async () => {
        const userId = localStorage.getItem("user_id");

        if (!userId || historyData.length === 0) {
            return;
        }

        if (!window.confirm(
            `Bạn có chắc muốn xóa toàn bộ ${historyData.length} bản ghi lịch sử dự đoán không? Thao tác này không thể hoàn tác.`
        )) {
            return;
        }

        deleteAllHistoryButton.disabled = true;

        try {
            const result = await requestAPI(
                `${API_BASE_URL}/history/${encodeURIComponent(userId)}`,
                "DELETE"
            );
            await loadPredictionHistory();
            showHistoryMessage(result.message, "success");
        } catch (error) {
            showHistoryMessage(
                error.message || "Không thể xóa lịch sử dự đoán.",
                "error"
            );
        } finally {
            deleteAllHistoryButton.disabled = false;
        }
    });
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

function initEditorialNavigation() {
    const links = Array.from(document.querySelectorAll(".navbar a[href^='#']"));
    const sectionIds = [
        "prediction",
        "history",
        "evaluation",
        "dataset",
        "svm-theory",
        "process",
        "api-info"
    ];
    const sections = sectionIds
        .map(id => document.getElementById(id))
        .filter(Boolean);
    let scrollFrame = null;

    function setActiveSection(sectionId) {
        const navId = sectionId === "svm-theory" ? "dataset" : sectionId;
        links.forEach(link => {
            const isActive = link.getAttribute("href") === `#${navId}`;
            link.classList.toggle("is-active", isActive);
            if (isActive) {
                link.setAttribute("aria-current", "location");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    function updateActiveSection() {
        const readingLine = window.scrollY + window.innerHeight * 0.34;
        let currentId = sections[0]?.id;

        sections.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top + window.scrollY;
            if (sectionTop <= readingLine) {
                currentId = section.id;
            }
        });

        if (currentId) {
            setActiveSection(currentId);
        }
        scrollFrame = null;
    }

    window.addEventListener("scroll", () => {
        if (scrollFrame === null) {
            scrollFrame = window.requestAnimationFrame(updateActiveSection);
        }
    }, { passive: true });
    window.addEventListener("resize", updateActiveSection, { passive: true });
    links.forEach(link => link.addEventListener("click", () => {
        const sectionId = link.getAttribute("href").slice(1);
        setActiveSection(sectionId);
    }));
    updateActiveSection();
}

initEditorialNavigation();
loadPredictionHistory();


function formatEvaluationPercent(value, digits = 2) {
    return `${(Number(value) * 100).toFixed(digits)}%`;
}

function createEvaluationCell(text, tagName = "td") {
    const cell = document.createElement(tagName);
    cell.textContent = text;
    return cell;
}

function renderKernelEvaluation(report, root) {
    const holdoutBody = root.querySelector("#holdout-kernel-body");
    const cvBody = root.querySelector("#cv-kernel-body");
    const confusionSelect = root.querySelector("#confusion-kernel");
    const kernels = report.kernels;

    root.querySelector("#holdout-count").textContent =
        report.holdout_protocol.test_samples + " m\u1eabu ki\u1ec3m th\u1eed";
    root.querySelector("#holdout-protocol").textContent =
        "Ph\u00e2n t\u1ea7ng 80/20 | random_state=" +
        report.holdout_protocol.random_state + " | " +
        report.holdout_protocol.train_samples + " train / " +
        report.holdout_protocol.test_samples + " holdout.";
    root.querySelector("#overview-train-count").textContent =
        report.holdout_protocol.train_samples;
    root.querySelector("#overview-test-count").textContent =
        report.holdout_protocol.test_samples;
    root.querySelector("#overview-main-model").textContent = "SVM g\u1ed1c";
    root.querySelector("#overview-kernel-count").textContent = kernels.length;
    const trainPercent = Math.round((1 - report.holdout_protocol.test_size) * 100);
    const testPercent = Math.round(report.holdout_protocol.test_size * 100);
    root.querySelector("#overview-holdout-protocol").textContent =
        trainPercent + "/" + testPercent + " ph\u00e2n t\u1ea7ng";
    root.querySelector("#overview-cv-status").textContent =
        report.cross_validation_protocol.n_splits + "-fold / train-only";
    root.querySelector("#cv-protocol").textContent =
        "StratifiedKFold (" + report.cross_validation_protocol.n_splits +
        " folds, c\u00f3 x\u00e1o tr\u1ed9n, random_state=" +
        report.cross_validation_protocol.random_state + ") ch\u1ec9 d\u00f9ng " +
        report.cross_validation_protocol.samples + " m\u1eabu hu\u1ea5n luy\u1ec7n.";

    holdoutBody.replaceChildren();
    cvBody.replaceChildren();
    confusionSelect.replaceChildren();


    kernels.forEach(kernel => {
        const holdoutRow = document.createElement("tr");
        const holdoutKernelCell = createEvaluationCell(kernel, "th");
        holdoutKernelCell.scope = "row";
        holdoutRow.appendChild(holdoutKernelCell);
        ["accuracy", "precision_weighted", "recall_weighted", "f1_weighted"].forEach(metric => {
            holdoutRow.appendChild(
                createEvaluationCell(formatEvaluationPercent(report.holdout[kernel][metric]))
            );
        });
        holdoutBody.appendChild(holdoutRow);

        const cv = report.cross_validation[kernel];
        const cvRow = document.createElement("tr");
        const cvKernelCell = createEvaluationCell(kernel, "th");
        cvKernelCell.scope = "row";
        cvRow.appendChild(cvKernelCell);
        cvRow.appendChild(createEvaluationCell(
            formatEvaluationPercent(cv.accuracy_mean, 3) + " \u00b1 " +
            formatEvaluationPercent(cv.accuracy_std, 3)
        ));
        cvRow.appendChild(createEvaluationCell(
            formatEvaluationPercent(cv.f1_weighted_mean, 3) + " \u00b1 " +
            formatEvaluationPercent(cv.f1_weighted_std, 3)
        ));
        cvBody.appendChild(cvRow);

        const option = document.createElement("option");
        option.value = kernel;
        option.textContent = kernel;
        confusionSelect.appendChild(option);
    });

    renderConfusionMatrix(report, root, confusionSelect.value);
    renderMetricChart(report, root);
}
function renderConfusionMatrix(report, root, kernel) {
    const container = root.querySelector("#confusion-matrix-container");
    const matrix = report.holdout[kernel].confusion_matrix;
    const classes = report.classes;
    const table = document.createElement("table");
    table.className = "confusion-matrix-table";
    const caption = document.createElement("caption");
    caption.textContent = `H\u00e0ng: th\u1ef1c t\u1ebf; c\u1ed9t: d\u1ef1 \u0111o\u00e1n — ${kernel}`;
    table.appendChild(caption);

    const thead = document.createElement("thead");
    const header = document.createElement("tr");
    header.appendChild(createEvaluationCell("Th\u1ef1c t\u1ebf \\ D\u1ef1 \u0111o\u00e1n", "th"));
    classes.forEach(name => {
        const th = createEvaluationCell(name, "th");
        th.scope = "col";
        header.appendChild(th);
    });
    thead.appendChild(header);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    matrix.forEach((rowValues, rowIndex) => {
        const row = document.createElement("tr");
        const rowHeader = createEvaluationCell(classes[rowIndex], "th");
        rowHeader.scope = "row";
        row.appendChild(rowHeader);
        rowValues.forEach((count, columnIndex) => {
            const cell = createEvaluationCell(String(count));
            if (rowIndex === columnIndex) cell.classList.add("matrix-correct");
            else if (count > 0) cell.classList.add("matrix-error");
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.replaceChildren(table);

    const correct = matrix.reduce((sum, row, index) => sum + row[index], 0);
    const total = matrix.flat().reduce((sum, count) => sum + count, 0);
    root.querySelector("#confusion-counts").textContent =
        `${correct} d\u1ef1 \u0111o\u00e1n \u0111\u00fang | ${total - correct} d\u1ef1 \u0111o\u00e1n sai | ${total} m\u1eabu holdout`;
}

function renderMetricChart(report, root) {
    const container = root.querySelector("#metric-chart-container");
    const metric = root.querySelector("#metric-chart-select").value;
    const metricLabels = {
        accuracy: "Accuracy",
        precision_weighted: "Precision (weighted)",
        recall_weighted: "Recall (weighted)",
        f1_weighted: "F1 (weighted)"
    };
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("viewBox", "0 0 760 330");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${metricLabels[metric]} for four SVM kernels on the fixed holdout split`);
    const title = document.createElementNS(svgNs, "title");
    title.textContent = `${metricLabels[metric]} on holdout`;
    svg.appendChild(title);
    const domainMin = 0.8;
    const domainMax = 1.0;
    const plotX = 190;
    const plotWidth = 470;
    const rowHeight = 52;
    const top = 34;

    [0.8, 0.85, 0.9, 0.95, 1].forEach(tick => {
        const x = plotX + ((tick - domainMin) / (domainMax - domainMin)) * plotWidth;
        const line = document.createElementNS(svgNs, "line");
        line.setAttribute("x1", x); line.setAttribute("x2", x);
        line.setAttribute("y1", 22); line.setAttribute("y2", 292);
        line.setAttribute("stroke", "#263753"); line.setAttribute("stroke-width", "1");
        svg.appendChild(line);
        const label = document.createElementNS(svgNs, "text");
        label.setAttribute("x", x); label.setAttribute("y", 316);
        label.setAttribute("text-anchor", "middle"); label.setAttribute("class", "chart-axis-label");
        label.textContent = `${Math.round(tick * 100)}%`;
        svg.appendChild(label);
    });

    report.kernels.forEach((kernel, index) => {
        const y = top + index * rowHeight;
        const value = Number(report.holdout[kernel][metric]);
        const label = document.createElementNS(svgNs, "text");
        label.setAttribute("x", plotX - 14); label.setAttribute("y", y + 17);
        label.setAttribute("text-anchor", "end"); label.setAttribute("class", "chart-kernel-label");
        label.textContent = kernel;
        svg.appendChild(label);
        const track = document.createElementNS(svgNs, "rect");
        track.setAttribute("x", plotX); track.setAttribute("y", y);
        track.setAttribute("width", plotWidth); track.setAttribute("height", 23);
        track.setAttribute("fill", "#101a2c");
        svg.appendChild(track);
        const bar = document.createElementNS(svgNs, "rect");
        bar.setAttribute("x", plotX); bar.setAttribute("y", y);
        bar.setAttribute("width", Math.max(0, Math.min(1, (value - domainMin) / (domainMax - domainMin))) * plotWidth);
        bar.setAttribute("height", 23);
        bar.setAttribute("fill", "#526b8d");
        svg.appendChild(bar);
        const valueLabel = document.createElementNS(svgNs, "text");
        valueLabel.setAttribute("x", plotX + plotWidth + 10); valueLabel.setAttribute("y", y + 17);
        valueLabel.setAttribute("class", "chart-value-label");
        valueLabel.textContent = formatEvaluationPercent(value);
        svg.appendChild(valueLabel);
    });
    container.replaceChildren(svg);
}
function initMachineLearningPanels() {
    const root = document.querySelector(".model-evaluation-region");
    if (!root) return;

    const loading = root.querySelector("#evaluation-loading");
    const error = root.querySelector("#evaluation-error");
    const errorMessage = root.querySelector("#evaluation-error-message");
    const content = root.querySelector("#evaluation-content");
    let reportPromise = null;

    async function loadEvaluation() {
        if (reportPromise) return reportPromise;
        loading.hidden = false;
        error.hidden = true;
        errorMessage.textContent = "";
        reportPromise = requestAPI(`${API_BASE_URL}/evaluation`)
            .then(report => {
                renderKernelEvaluation(report, root);
                content.hidden = false;
                loading.hidden = true;
                return report;
            })
            .catch(failure => {
                reportPromise = null;
                loading.hidden = true;
                errorMessage.textContent = failure.message || "Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c d\u1eef li\u1ec7u \u0111\u00e1nh gi\u00e1 m\u00f4 h\u00ecnh.";
                error.hidden = false;
                return null;
            });
        return reportPromise;
    }

    const observer = "IntersectionObserver" in window
        ? new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                observer.disconnect();
                loadEvaluation();
            }
        }, { rootMargin: "220px 0px" })
        : null;
    if (observer) observer.observe(root);
    else loadEvaluation();

    root.querySelector("#retry-evaluation-button").addEventListener("click", loadEvaluation);

    root.querySelector("#confusion-kernel").addEventListener("change", async event => {
        const report = await loadEvaluation();
        if (report) renderConfusionMatrix(report, root, event.target.value);
    });
    root.querySelector("#metric-chart-select").addEventListener("change", async () => {
        const report = await loadEvaluation();
        if (report) renderMetricChart(report, root);
    });


}

initMachineLearningPanels();
