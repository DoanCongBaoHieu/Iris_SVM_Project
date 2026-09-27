// ==========================================
// CẤU HÌNH API
// ==========================================

const API_URL = "https://iris-svm-api-oar1.onrender.com/predict";


// ==========================================
// LẤY CÁC PHẦN TỬ HTML
// ==========================================

const sepalLengthInput =
    document.getElementById("sepal-length");

const sepalWidthInput =
    document.getElementById("sepal-width");

const petalLengthInput =
    document.getElementById("petal-length");

const petalWidthInput =
    document.getElementById("petal-width");


const predictButton =
    document.getElementById("predict-button");


const errorMessage =
    document.getElementById("error-message");


const resultPlaceholder =
    document.getElementById("result-placeholder");


const predictionResult =
    document.getElementById("prediction-result");


const flowerImage =
    document.getElementById("flower-image");


const speciesName =
    document.getElementById("species-name");


const predictionMessage =
    document.getElementById("prediction-message");


const predictionCode =
    document.getElementById("prediction-code");



// ==========================================
// HIỂN THỊ LỖI
// ==========================================

function showError(message) {

    errorMessage.textContent = message;

    errorMessage.classList.add("show");

}


// ==========================================
// XÓA THÔNG BÁO LỖI
// ==========================================

function clearError() {

    errorMessage.textContent = "";

    errorMessage.classList.remove("show");

}



// ==========================================
// KIỂM TRA DỮ LIỆU ĐẦU VÀO
// ==========================================

function validateInput() {

    const sepalLength =
        parseFloat(sepalLengthInput.value);

    const sepalWidth =
        parseFloat(sepalWidthInput.value);

    const petalLength =
        parseFloat(petalLengthInput.value);

    const petalWidth =
        parseFloat(petalWidthInput.value);


    // Kiểm tra ô trống

    if (
        isNaN(sepalLength) ||
        isNaN(sepalWidth) ||
        isNaN(petalLength) ||
        isNaN(petalWidth)
    ) {

        showError(
            "Vui lòng nhập đầy đủ 4 thông số của hoa."
        );

        return null;
    }


    // Kiểm tra giá trị âm

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



// ==========================================
// HIỂN THỊ TRẠNG THÁI LOADING
// ==========================================

function setLoading(isLoading) {

    if (isLoading) {

        predictButton.disabled = true;

        predictButton.textContent =
            "⏳ ĐANG DỰ ĐOÁN...";

    } else {

        predictButton.disabled = false;

        predictButton.textContent =
            "🌸 DỰ ĐOÁN LOÀI HOA";

    }

}



// ==========================================
// HIỂN THỊ KẾT QUẢ
// ==========================================

function displayResult(data) {

    const species =
        data.species;

    const prediction =
        data.prediction;


    // Hiển thị tên loài

    speciesName.textContent =
        species;


    // Hiển thị class

    predictionCode.textContent =
        prediction;


    // Hiển thị message từ API

    if (data.message) {

        predictionMessage.textContent =
            data.message;

    } else {

        predictionMessage.textContent =
            `Mô hình dự đoán đây là hoa ${species}.`;

    }


    // ======================================
    // XÁC ĐỊNH ẢNH HOA
    // ======================================

    const imageMap = {

        "setosa":
            "images/setosa.jpg",

        "versicolor":
            "images/versicolor.jpg",

        "virginica":
            "images/virginica.jpg"

    };


    const imagePath =
        imageMap[species.toLowerCase()];


    if (imagePath) {

        flowerImage.src =
            imagePath;

        flowerImage.alt =
            `Hoa Iris ${species}`;

    }


    // ======================================
    // CHUYỂN TỪ PLACEHOLDER SANG KẾT QUẢ
    // ======================================

    resultPlaceholder.classList.add("hidden");

    predictionResult.classList.remove("hidden");

}



// ==========================================
// GỌI API FASTAPI
// ==========================================

async function predictFlower() {

    clearError();


    // --------------------------------------
    // 1. KIỂM TRA INPUT
    // --------------------------------------

    const flowerData =
        validateInput();


    if (!flowerData) {

        return;

    }


    // --------------------------------------
    // 2. HIỂN THỊ LOADING
    // --------------------------------------

    setLoading(true);


    try {


        // ----------------------------------
        // 3. GỬI REQUEST ĐẾN FASTAPI
        // ----------------------------------

        const response =
            await fetch(API_URL, {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(flowerData)

            });


        // ----------------------------------
        // 4. KIỂM TRA RESPONSE
        // ----------------------------------

        if (!response.ok) {

            let errorText =
                "Không thể thực hiện dự đoán.";

            try {

                const errorData =
                    await response.json();

                if (errorData.detail) {

                    errorText =
                        typeof errorData.detail === "string"
                            ? errorData.detail
                            : "Dữ liệu gửi lên không hợp lệ.";

                }

            } catch (e) {

                // Không làm gì nếu response
                // không phải JSON

            }


            throw new Error(errorText);

        }


        // ----------------------------------
        // 5. ĐỌC JSON
        // ----------------------------------

        const result =
            await response.json();


        console.log(
            "Kết quả từ API:",
            result
        );


        // ----------------------------------
        // 6. HIỂN THỊ KẾT QUẢ
        // ----------------------------------

        displayResult(result);


    } catch (error) {

        console.error(
            "Lỗi API:",
            error
        );


        showError(
            "Không thể kết nối đến máy chủ. " +
            "Hãy kiểm tra FastAPI đang chạy tại " +
            "127.0.0.1:8000."
        );


    } finally {

        // ----------------------------------
        // 7. TẮT LOADING
        // ----------------------------------

        setLoading(false);

    }

}



// ==========================================
// GÁN SỰ KIỆN CHO NÚT DỰ ĐOÁN
// ==========================================

predictButton.addEventListener(
    "click",
    predictFlower
);



// ==========================================
// CHO PHÉP NHẤN ENTER ĐỂ DỰ ĐOÁN
// ==========================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter" &&
            !predictButton.disabled
        ) {

            predictFlower();

        }

    }
);


function fillSample(species) {

    const samples = {

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

    const sample = samples[species];

    if (!sample) {
        return;
    }

    sepalLengthInput.value = sample.sepal_length;
    sepalWidthInput.value = sample.sepal_width;
    petalLengthInput.value = sample.petal_length;
    petalWidthInput.value = sample.petal_width;

    clearError();
}