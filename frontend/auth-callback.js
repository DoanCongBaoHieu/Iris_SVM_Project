function completeAuth0Login() {
    const status = document.getElementById("auth-status");

    try {
        const callbackData = new URLSearchParams(
            window.location.hash.slice(1)
        );
        const userId = Number(callbackData.get("user_id"));
        const username = callbackData.get("username");
        if (!Number.isInteger(userId) || userId <= 0 || !username) {
            throw new Error("Không thể xác nhận phiên đăng nhập.");
        }

        localStorage.setItem("user_id", userId);
        localStorage.setItem("username", username);
        localStorage.setItem("auth_provider", "auth0");
        window.location.replace("index.html");
    } catch (error) {
        console.error("Auth0 sign-in failed:", error);
        status.textContent = error.message || "Không thể kết nối đến máy chủ.";
        const loginLink = document.createElement("a");
        loginLink.href = "login-form.html";
        loginLink.textContent = "Quay lại trang đăng nhập";
        status.after(loginLink);
    }
}

completeAuth0Login();
