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
            loadComponent("comp-header", "components/header.html"),
            loadComponent("comp-prediction", "components/prediction.html"),
            loadComponent("comp-model-info", "components/model-info.html"),
            loadComponent("comp-evaluation", "components/evaluation.html"),
            loadComponent("comp-dataset", "components/dataset.html"),
            loadComponent("comp-svm-theory", "components/svm-theory.html"),
            loadComponent("comp-process", "components/process.html"),
            loadComponent("comp-api-footer", "components/api-footer.html")
        ]);

        console.log("✅ Tất cả component đã được tải.");

        // Chỉ chạy script.js sau khi toàn bộ HTML component đã có trong DOM
        const script = document.createElement("script");

        script.src = "script.js";

        document.body.appendChild(script);

    } catch (error) {

        console.error(
            "❌ Lỗi tải component:",
            error
        );
    }
});