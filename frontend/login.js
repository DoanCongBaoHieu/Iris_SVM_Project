const API_BASE_URL =
    (window.location.hostname === "localhost" ||
     window.location.hostname === "127.0.0.1")
        ? "http://127.0.0.1:8000"
        : "https://iris-svm-api-oar1.onrender.com";

const loginButton = document.getElementById("login-button");
const usernameInput = document.getElementById("login-username");
const passwordInput = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const togglePasswordButton = document.getElementById("toggle-password");
const loginPuppy = document.getElementById("login-puppy");


function updatePuppyState() {
    const shouldCoverEyes =
        passwordInput.type === "password" && passwordInput.value.length > 0;

    loginPuppy.classList.toggle("is-covering", shouldCoverEyes);
}


passwordInput.addEventListener("input", updatePuppyState);
passwordInput.addEventListener("blur", updatePuppyState);

togglePasswordButton.addEventListener("click", () => {
    const showPassword = passwordInput.type === "password";
    passwordInput.type = showPassword ? "text" : "password";
    togglePasswordButton.textContent = showPassword ? "Ẩn" : "Hiện";
    togglePasswordButton.setAttribute("aria-label", showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    togglePasswordButton.setAttribute("aria-pressed", String(showPassword));
    updatePuppyState();
    passwordInput.focus();
});


function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.add("show");
}


function hideLoginError() {
    loginError.textContent = "";
    loginError.classList.remove("show");
}


async function login() {
    hideLoginError();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showLoginError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Đang đăng nhập...";

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Tên đăng nhập hoặc mật khẩu không đúng."
            );
        }

        // Lưu thông tin người dùng sau khi đăng nhập thành công
        localStorage.setItem("user_id", data.user_id);
        localStorage.setItem("username", data.username);

        // Chuyển sang trang chính
        window.location.href = "index.html";

    } catch (error) {
        console.error("Lỗi đăng nhập:", error);

        showLoginError(
            error.message || "Không thể kết nối đến máy chủ."
        );

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Đăng nhập";
    }
}


loginButton.addEventListener("click", login);


// Cho phép nhấn Enter để đăng nhập
[usernameInput, passwordInput].forEach(input => {
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            login();
        }
    });
});