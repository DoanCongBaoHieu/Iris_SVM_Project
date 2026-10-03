// ======================================================
// IRIS SVM CLASSIFIER - FRONTEND JAVASCRIPT
// ======================================================


// ======================================================
// 1. CẤU HÌNH API
// ======================================================

const API_BASE_URL =
    "https://iris-svm-api-oar1.onrender.com";

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
// 7. HIỂN THỊ TRẠNG THÁI LOADING
// ======================================================

function setLoading(isLoading) {

    if (!elements.predictButton) {
        return;
    }


    if (isLoading) {

        elements.predictButton.disabled = true;

        elements.predictButton.textContent =
            "⏳ ĐANG DỰ ĐOÁN...";

    } else {

        elements.predictButton.disabled = false;

        elements.predictButton.textContent =
            "🌸 DỰ ĐOÁN LOÀI HOA";
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

        const result =
            await requestAPI(
                API_ENDPOINTS.predict,
                "POST",
                flowerData
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