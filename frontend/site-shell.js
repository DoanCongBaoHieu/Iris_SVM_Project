(() => {
    const apiBaseUrl = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:8000"
        : "https://iris-svm-api-oar1.onrender.com";
    const links = Array.from(document.querySelectorAll(".navbar [data-nav-page]"));
    const page = document.body.dataset.page;
    const standaloneRoutes = {
        prediction: "index.html",
        history: "history.html",
        evaluation: "evaluation.html",
        dataset: "dataset.html",
        process: "process.html",
        api: "project.html",
        introduction: "introduction.html"
    };

    links.forEach(link => {
        const navPage = link.dataset.navPage;
        const href = standaloneRoutes[navPage];
        if (!href) {
            console.error(`Unknown navigation page: ${navPage}`);
            return;
        }
        link.href = new URL(href, document.baseURI).href;
    });

    function setActivePage(pageName) {
        links.forEach(link => {
            const active = link.dataset.navPage === pageName;
            link.classList.toggle("is-active", active);
            if (active) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        });
    }

    setActivePage(page);
    function scrollToCurrentHash() {
        const targetId = decodeURIComponent(window.location.hash.slice(1));
        document.getElementById(targetId)?.scrollIntoView();
    }

    window.addEventListener("hashchange", scrollToCurrentHash);
    window.addEventListener("popstate", scrollToCurrentHash);
    if (window.location.hash) window.requestAnimationFrame(scrollToCurrentHash);

    const username = localStorage.getItem("username");
    const authProvider = localStorage.getItem("auth_provider");
    const account = document.getElementById("user-account");
    const usernameElement = document.getElementById("current-username");
    const changePasswordButton = document.getElementById("change-password-button");

    if (account && usernameElement) {
        usernameElement.textContent = username;
        account.classList.remove("hidden");
    }
    if (authProvider === "auth0" && changePasswordButton) {
        changePasswordButton.classList.add("hidden");
    }

    function clearBatchPredictionSessionState() {
        const keyPrefix = "iris-classifier:batch:v1:user:";
        try {
            for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
                const key = sessionStorage.key(index);
                if (key?.startsWith(keyPrefix)) sessionStorage.removeItem(key);
            }
        } catch (error) {
            console.warn("Unable to clear batch prediction session state:", error);
        }
    }

    document.addEventListener("click", event => {
        if (event.target.closest("#change-password-button")) {
            document.getElementById("change-password-modal")?.classList.remove("hidden");
        }

        if (!event.target.closest("#logout-button")) return;
        clearBatchPredictionSessionState();
        localStorage.removeItem("user_id");
        localStorage.removeItem("username");
        if (authProvider === "auth0") {
            localStorage.removeItem("auth_provider");
            const returnTo = `${apiBaseUrl}/auth/after-logout`;
            window.location.assign(`${apiBaseUrl}/auth/logout?returnTo=${encodeURIComponent(returnTo)}`);
        } else {
            window.location.assign(new URL("login.html?v=9", document.baseURI));
        }
    });
})();
