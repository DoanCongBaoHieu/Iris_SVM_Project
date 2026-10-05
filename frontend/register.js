// ======================================================
// IRIS SVM CLASSIFIER - REGISTER
// ======================================================


// ======================================================
// 1. CẤU HÌNH API
// ======================================================

const API_BASE_URL =
    (window.location.hostname === "localhost" ||
     window.location.hostname === "127.0.0.1")
        ? "http://127.0.0.1:8000"
        : "https://iris-svm-api-oar1.onrender.com";


// ======================================================
// 2. LẤY PHẦN TỬ HTML
// ======================================================

const usernameInput =
    document.getElementById("register-username");

const passwordInput =
    document.getElementById("register-password");

const confirmPasswordInput =
    document.getElementById("register-confirm-password");

const registerButton =
    document.getElementById("register-button");

const registerMessage =
    document.getElementById("register-message");


// ======================================================
// 3. HIỂN THỊ THÔNG BÁO
// ======================================================

function showRegisterMessage(message, type = "") {

    registerMessage.textContent = message;

    registerMessage.className = "register-message";

    if (type) {
        registerMessage.classList.add("show", type);
    } else {
        registerMessage.classList.add("show");
    }
}


// ======================================================
// 4. XÓA THÔNG BÁO
// ======================================================

function clearRegisterMessage() {

    registerMessage.textContent = "";

    registerMessage.className = "register-message";
}


// ======================================================
// 5. KIỂM TRA DỮ LIỆU
// ======================================================

function validateRegisterInput() {

    const username =
        usernameInput.value.trim();

    const password =
        passwordInput.value;

    const confirmPassword =
        confirmPasswordInput.value;


    // Tên đăng nhập

    if (!username) {

        showRegisterMessage(
            "Vui lòng nhập tên đăng nhập.",
            "error"
        );

        usernameInput.focus();

        return null;
    }


    if (username.length < 3) {

        showRegisterMessage(
            "Tên đăng nhập phải có ít nhất 3 ký tự.",
            "error"
        );

        usernameInput.focus();

        return null;
    }


    if (username.length > 50) {

        showRegisterMessage(
            "Tên đăng nhập không được vượt quá 50 ký tự.",
            "error"
        );

        usernameInput.focus();

        return null;
    }


    // Mật khẩu

    if (!password) {

        showRegisterMessage(
            "Vui lòng nhập mật khẩu.",
            "error"
        );

        passwordInput.focus();

        return null;
    }


    if (password.length < 6) {

        showRegisterMessage(
            "Mật khẩu phải có ít nhất 6 ký tự.",
            "error"
        );

        passwordInput.focus();

        return null;
    }


    if (password.length > 100) {

        showRegisterMessage(
            "Mật khẩu không được vượt quá 100 ký tự.",
            "error"
        );

        passwordInput.focus();

        return null;
    }


    // Xác nhận mật khẩu

    if (!confirmPassword) {

        showRegisterMessage(
            "Vui lòng xác nhận mật khẩu.",
            "error"
        );

        confirmPasswordInput.focus();

        return null;
    }


    if (password !== confirmPassword) {

        showRegisterMessage(
            "Mật khẩu xác nhận không khớp.",
            "error"
        );

        confirmPasswordInput.focus();

        return null;
    }


    return {
        username,
        password
    };
}


// ======================================================
// 6. ĐĂNG KÝ
// ======================================================

async function register() {

    clearRegisterMessage();


    const formData =
        validateRegisterInput();


    if (!formData) {
        return;
    }


    // Loading

    registerButton.disabled = true;

    registerButton.textContent =
        "⏳ Đang đăng ký...";


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/register`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        username:
                            formData.username,

                        password:
                            formData.password
                    })
                }
            );


        const data =
            await response.json();


        // API trả lỗi

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Không thể đăng ký tài khoản."
            );
        }


        // Thành công

        showRegisterMessage(
            "✅ Đăng ký tài khoản thành công.",
            "success"
        );


        // Xóa dữ liệu form

        passwordInput.value = "";

        confirmPasswordInput.value = "";


        // Chuyển về Login

        setTimeout(() => {

            window.location.href =
                "login.html";

        }, 1200);


    } catch (error) {

        console.error(
            "Lỗi đăng ký:",
            error
        );

        showRegisterMessage(
            error.message ||
            "Không thể kết nối đến máy chủ.",
            "error"
        );


    } finally {

        registerButton.disabled = false;

        registerButton.textContent =
            "Đăng ký";
    }
}


// ======================================================
// 7. NÚT ĐĂNG KÝ
// ======================================================

registerButton.addEventListener(
    "click",
    register
);


// ======================================================
// 8. ENTER ĐỂ ĐĂNG KÝ
// ======================================================

[
    usernameInput,
    passwordInput,
    confirmPasswordInput
].forEach(input => {

    input.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                register();
            }

        }
    );

});