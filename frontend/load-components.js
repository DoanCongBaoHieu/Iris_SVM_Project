const COMPONENT_PATHS = {
    "account-modal": "components/account-modal.html?v=1",
    "api-footer": "components/api-footer.html?v=14",
    "batch-prediction": "components/batch-prediction.html?v=10",
    "contact-footer": "components/contact-footer.html?v=3",
    dataset: "components/dataset.html?v=11",
    evaluation: "components/evaluation.html?v=15",
    header: "components/header.html?v=17",
    history: "components/history.html?v=10",
    "model-info": "components/model-info.html?v=13",
    prediction: "components/prediction.html?v=16",
    process: "components/process.html?v=8",
    "svm-theory": "components/svm-theory.html?v=10"
};

async function loadComponent(name) {
    const container = document.getElementById(`comp-${name}`);

    if (!container) {
        throw new Error(`Missing component container: #comp-${name}`);
    }

    const response = await fetch(new URL(COMPONENT_PATHS[name], document.baseURI));
    if (!response.ok) {
        throw new Error(`Unable to load component: ${COMPONENT_PATHS[name]}`);
    }

    container.innerHTML = await response.text();
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = new URL(src, document.baseURI).href;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Unable to load script: ${src}`));
        document.body.appendChild(script);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const page = document.body;
    if (!localStorage.getItem("user_id") || !localStorage.getItem("username")) {
        window.location.replace(new URL("login.html?v=11", document.baseURI));
        return;
    }

    const componentNames = (page.dataset.components || "")
        .split(",")
        .map(name => name.trim())
        .filter(Boolean);
    const components = ["header", "account-modal", ...componentNames];

    try {
        const uniqueComponents = [...new Set(components)];
        const unknownComponents = uniqueComponents.filter(name => !COMPONENT_PATHS[name]);
        if (unknownComponents.length) {
            throw new Error(`Unknown components: ${unknownComponents.join(", ")}`);
        }

        await Promise.all(uniqueComponents.map(loadComponent));
        await loadScript("site-shell.js?v=14");

        for (const src of (page.dataset.scripts || "").split(",").map(item => item.trim()).filter(Boolean)) {
            await loadScript(src);
        }
    } catch (error) {
        console.error("Unable to initialize the page:", error);
    }
});
