async function loadComponent(elementId, filePath) {
    const container = document.getElementById(elementId);

    if (!container) {
        throw new Error(`Không tìm thấy container: #${elementId}`);
    }

    const response = await fetch(filePath);

    if (!response.ok) {
        throw new Error(
            `Không thể tải component: ${filePath}`
        );
    }

    container.innerHTML = await response.text();
}


document.addEventListener("DOMContentLoaded", async () => {

    try {

        await Promise.all([
            loadComponent("comp-header", "components/header.html?v=6"),
            loadComponent("comp-history", "components/history.html?v=4"),
            loadComponent("comp-prediction", "components/prediction.html?v=5"),
            loadComponent("comp-model-info", "components/model-info.html?v=5"),
            loadComponent("comp-evaluation", "components/evaluation.html?v=3"),
            loadComponent("comp-dataset", "components/dataset.html?v=5"),
            loadComponent("comp-svm-theory", "components/svm-theory.html?v=5"),
            loadComponent("comp-process", "components/process.html?v=4"),
            loadComponent("comp-api-footer", "components/api-footer.html?v=5")
        ]);
        // ================================================
// MỞ POPUP ĐỔI MẬT KHẨU
// ================================================

document.addEventListener("click", function (event) {

    const button =
        event.target.closest("#change-password-button");

    if (!button) {
        return;
    }

    const modal =
        document.getElementById("change-password-modal");

    if (!modal) {
        console.error(
            "Không tìm thấy popup change-password-modal."
        );
        return;
    }

    modal.classList.remove("hidden");

});

        console.log("✅ Tất cả component đã được tải.");

        // Chỉ chạy script.js sau khi toàn bộ HTML component đã có trong DOM
        const script = document.createElement("script");

        script.src = "script.js?v=" + new Date().getTime();

        document.body.appendChild(script);

    } catch (error) {

        console.error(
            "❌ Lỗi tải component:",
            error
        );
    }
});