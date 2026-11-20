(() => {
    const MAX_FILE_BYTES = 2 * 1024 * 1024;
    const MAX_SESSION_STATE_BYTES = 2 * 1024 * 1024;
    const MAX_ROWS = 500;
    const PAGE_SIZE = 25;
    const SESSION_STATE_PREFIX = "iris-classifier:batch:v1:user:";
    const SUPPORTED_KERNELS = ["original", "linear", "polynomial", "rbf", "sigmoid"];
    const SUPPORTED_FILTERS = ["all", "setosa", "versicolor", "virginica"];
    const REQUIRED_COLUMNS = [
        "sepal_length",
        "sepal_width",
        "petal_length",
        "petal_width"
    ];
    const API_BASE_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:8000"
        : "https://iris-svm-api-oar1.onrender.com";

    const fileInput = document.getElementById("batch-file-input");
    const dropZone = document.getElementById("batch-drop-zone");
    const fileDetails = document.getElementById("batch-file-details");
    const fileName = document.getElementById("batch-file-name");
    const fileRowCount = document.getElementById("batch-file-row-count");
    const status = document.getElementById("batch-status");
    const runButton = document.getElementById("batch-run-button");
    const resultsSection = document.getElementById("batch-results");
    const resultsHeader = document.getElementById("batch-results-header");
    const resultsBody = document.getElementById("batch-results-body");
    const pageInfo = document.getElementById("batch-page-info");
    const previousPageButton = document.getElementById("batch-prev-page");
    const nextPageButton = document.getElementById("batch-next-page");

    let selectedFile = null;
    let restoredFileName = "";
    let parsedRows = null;
    let predictionResults = [];
    let filteredResults = [];
    let activeBatchFilter = "all";
    let currentPage = 1;
    let isPredicting = false;
    let resultOwnerId = "";
    let batchInferenceTimeMs = null;

    function setStatus(message, type = "") {
        status.textContent = message;
        status.className = `batch-status${type ? ` is-${type}` : ""}`;
    }

    function csvError(line, message) {
        return new Error(`Dòng ${line}: ${message}`);
    }

    function parseCsv(text) {
        const rows = [];
        let row = [];
        let field = "";
        let inQuotes = false;
        let closedQuote = false;
        let line = 1;
        let rowStartLine = 1;

        function pushField() {
            row.push(field);
            field = "";
            closedQuote = false;
        }

        function pushRow() {
            pushField();
            if (row.some(value => value.trim() !== "")) {
                rows.push({ values: row, line: rowStartLine });
            }
            row = [];
            line += 1;
            rowStartLine = line;
        }

        for (let index = 0; index < text.length; index += 1) {
            const character = text[index];

            if (inQuotes) {
                if (character === '"' && text[index + 1] === '"') {
                    field += '"';
                    index += 1;
                } else if (character === '"') {
                    inQuotes = false;
                    closedQuote = true;
                } else {
                    field += character;
                    if (character === "\n") line += 1;
                }
                continue;
            }

            if (closedQuote && character !== "," && character !== "\r" && character !== "\n" && !/\s/.test(character)) {
                throw csvError(line, "Có ký tự không hợp lệ sau dấu ngoặc kép.");
            }

            if (character === '"') {
                if (field.trim() !== "") {
                    throw csvError(line, "Dấu ngoặc kép không hợp lệ trong giá trị.");
                }
                field = "";
                inQuotes = true;
            } else if (character === ",") {
                pushField();
            } else if (character === "\r" || character === "\n") {
                pushRow();
                if (character === "\r" && text[index + 1] === "\n") index += 1;
            } else if (!closedQuote) {
                field += character;
            }
        }

        if (inQuotes) {
            throw csvError(rowStartLine, "Thiếu dấu ngoặc kép đóng.");
        }
        if (field !== "" || row.length > 0) pushRow();
        return rows;
    }

    function validateCsv(text) {
        const rows = parseCsv(text);
        if (rows.length < 2) {
            throw new Error("File CSV cần có header và ít nhất một dòng dữ liệu.");
        }

        const headers = rows[0].values.map(value => value.trim());
        const allowedColumns = [...REQUIRED_COLUMNS, "species"];
        if (![REQUIRED_COLUMNS.length, REQUIRED_COLUMNS.length + 1].includes(headers.length) ||
            new Set(headers).size !== headers.length || headers.some(column => !allowedColumns.includes(column))) {
            throw csvError(rows[0].line, `Header cần có các cột ${REQUIRED_COLUMNS.join(", ")} và có thể thêm species.`);
        }

        const columnIndexes = REQUIRED_COLUMNS.map(column => headers.indexOf(column));
        const missingColumns = REQUIRED_COLUMNS.filter((column, index) => columnIndexes[index] < 0);
        if (missingColumns.length) {
            throw csvError(rows[0].line, `Thiếu cột: ${missingColumns.join(", ")}.`);
        }

        const dataRows = rows.slice(1);
        if (dataRows.length > MAX_ROWS) {
            throw csvError(dataRows[MAX_ROWS].line, `Vượt giới hạn ${MAX_ROWS} dòng dữ liệu.`);
        }

        return dataRows.map(({ values, line }) => {
            const displayValues = Object.fromEntries(REQUIRED_COLUMNS.map((column, index) => [
                column,
                values[columnIndexes[index]]?.trim() || ""
            ]));
            const hasSpeciesColumn = headers.includes("species");
            const speciesIndex = headers.indexOf("species");
            const rawSpecies = hasSpeciesColumn ? values[speciesIndex]?.trim() || "" : "";
            const missingOptionalTrailingLabel = hasSpeciesColumn &&
                speciesIndex === headers.length - 1 && values.length === headers.length - 1;
            let error = values.length === headers.length || missingOptionalTrailingLabel
                ? ""
                : `Cần đúng ${headers.length} giá trị tương ứng với header.`;
            const sample = {};

            if (!error) {
                for (const column of REQUIRED_COLUMNS) {
                    const rawValue = displayValues[column];
                    if (!rawValue) {
                        error = `Thiếu giá trị ở cột ${column}.`;
                        break;
                    }
                    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(rawValue)) {
                        error = `Giá trị ở cột ${column} phải là số.`;
                        break;
                    }
                    const value = Number(rawValue);
                    if (!Number.isFinite(value) || value <= 0 || value > 10) {
                        error = `Giá trị ở cột ${column} phải lớn hơn 0 và không vượt quá 10.`;
                        break;
                    }
                    sample[column] = value;
                }
            }
            return {
                line,
                displayValues,
                hasSpeciesColumn,
                rawSpecies,
                sample: error ? null : sample,
                error
            };
        });
    }

    function getCurrentUserId() {
        const value = Number(localStorage.getItem("user_id"));
        return Number.isInteger(value) && value > 0 ? String(value) : "";
    }

    function batchStateKey(userId) {
        return `${SESSION_STATE_PREFIX}${userId}`;
    }

    function removeBatchState(userId = getCurrentUserId()) {
        if (!userId) return true;
        try {
            sessionStorage.removeItem(batchStateKey(userId));
            return true;
        } catch (error) {
            console.warn("Unable to remove batch session state:", error);
            return false;
        }
    }

    function removeOtherAccountStates(userId) {
        try {
            for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
                const key = sessionStorage.key(index);
                if (key?.startsWith(SESSION_STATE_PREFIX) && key !== batchStateKey(userId)) {
                    sessionStorage.removeItem(key);
                }
            }
        } catch (error) {
            console.warn("Unable to clear another account's batch cache:", error);
        }
    }

    function getPredictionCounts(results) {
        return {
            total: results.length,
            setosa: results.filter(result => !result.error && String(result.prediction).toLowerCase() === "setosa").length,
            versicolor: results.filter(result => !result.error && String(result.prediction).toLowerCase() === "versicolor").length,
            virginica: results.filter(result => !result.error && String(result.prediction).toLowerCase() === "virginica").length
        };
    }

    function persistBatchState(userId = resultOwnerId) {
        const fileNameForRun = selectedFile?.name || restoredFileName;
        if (!userId || userId !== resultOwnerId || getCurrentUserId() !== resultOwnerId ||
            !fileNameForRun || !predictionResults.some(result => !result.error && result.prediction)) return false;

        const state = {
            version: 1,
            userId,
            fileName: fileNameForRun,
            kernel: getSelectedKernel(),
            results: predictionResults.map(result => ({
                rowNumber: result.rowNumber,
                line: result.line,
                sepal_length: result.sepal_length,
                sepal_width: result.sepal_width,
                petal_length: result.petal_length,
                petal_width: result.petal_width,
                prediction: result.prediction,
                error: result.error,
                prediction_time_ms: result.prediction_time_ms,
                hasSpeciesColumn: result.hasSpeciesColumn,
                rawSpecies: result.rawSpecies
            })),
            counts: getPredictionCounts(predictionResults),
            inferenceTimeMs: batchInferenceTimeMs,
            filter: activeBatchFilter,
            page: currentPage
        };

        try {
            const serialized = JSON.stringify(state);
            if (new Blob([serialized]).size > MAX_SESSION_STATE_BYTES) {
                throw new Error("Kết quả vượt quá dung lượng lưu phiên cho phép.");
            }
            sessionStorage.setItem(batchStateKey(userId), serialized);
            return true;
        } catch (error) {
            removeBatchState(userId);
            setStatus("Dự đoán vẫn dùng được nhưng không thể lưu phiên Batch trong trình duyệt. Hãy tải CSV kết quả nếu cần giữ lại.", "error");
            console.warn("Unable to persist batch prediction state:", error);
            return false;
        }
    }

    function clearResults() {
        predictionResults = [];
        filteredResults = [];
        activeBatchFilter = "all";
        currentPage = 1;
        resultOwnerId = "";
        batchInferenceTimeMs = null;
        resultsSection.hidden = true;
        resultsHeader.replaceChildren();
        resultsBody.replaceChildren();
        document.getElementById("batch-invalid-details").replaceChildren();
        document.getElementById("batch-invalid-details").hidden = true;
        updateBatchFilterButtons();
    }

    function updateBatchFilterButtons() {
        document.querySelectorAll("[data-batch-filter]").forEach(button => {
            button.setAttribute("aria-pressed", String(button.dataset.batchFilter === activeBatchFilter));
        });
    }

    function setBatchFilter(filter) {
        activeBatchFilter = filter;
        filteredResults = filter === "all"
            ? predictionResults
            : predictionResults.filter(result => !result.error && String(result.prediction).toLowerCase() === filter);
        currentPage = 1;
        updateBatchFilterButtons();
        renderResultsPage();
        persistBatchState();
    }

    function selectFile(file) {
        selectedFile = file || null;
        restoredFileName = "";
        parsedRows = null;
        runButton.disabled = true;
        clearResults();
        fileInput.value = "";

        if (!file) {
            fileDetails.hidden = true;
            setStatus("");
            return;
        }

        fileDetails.hidden = false;
        fileName.textContent = file.name;
        fileRowCount.textContent = "";

        if (!file.name.toLowerCase().endsWith(".csv")) {
            setStatus("Chỉ chấp nhận file có định dạng .CSV.", "error");
            return;
        }
        if (file.size === 0) {
            setStatus("File CSV đang trống.", "error");
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            setStatus("File CSV không được vượt quá 2 MB.", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            try {
                parsedRows = validateCsv(String(reader.result || "").replace(/^\uFEFF/, ""));
                const validCount = parsedRows.filter(row => row.sample).length;
                const invalidCount = parsedRows.length - validCount;
                fileRowCount.textContent = `${validCount} hợp lệ · ${invalidCount} sai dữ liệu`;
                runButton.disabled = false;
                setStatus(invalidCount
                    ? `Đã đọc ${parsedRows.length} dòng. Các dòng lỗi vẫn sẽ hiện trong bảng.`
                    : "File hợp lệ. Nhấn nút để bắt đầu dự đoán.", invalidCount ? "loading" : "success");
            } catch (error) {
                parsedRows = null;
                setStatus(error.message || "Không thể đọc file CSV.", "error");
            }
        };
        reader.onerror = () => setStatus("Không thể đọc file CSV đã chọn.", "error");
        reader.readAsText(file, "UTF-8");
    }

    function getSelectedKernel() {
        return document.querySelector('input[name="batch-kernel"]:checked')?.value || "original";
    }

    function getErrorMessage(data, fallback) {
        if (typeof data?.detail === "string") return data.detail;
        if (Array.isArray(data?.detail) && data.detail.length) {
            const detail = data.detail[0];
            const field = Array.isArray(detail.loc) ? detail.loc.slice(-1)[0] : "";
            return `${field ? `${field}: ` : ""}${detail.msg || fallback}`;
        }
        return fallback;
    }

    function displaySpecies(value) {
        const name = String(value || "");
        return name ? name.charAt(0).toUpperCase() + name.slice(1) : "—";
    }

    function renderResultHeaders() {
        const labels = [
            "#",
            "Đài hoa · dài (cm)",
            "Đài hoa · rộng (cm)",
            "Cánh hoa · dài (cm)",
            "Cánh hoa · rộng (cm)"
        ];
        labels.push("Dự đoán", "Thời gian dự đoán");
        resultsHeader.replaceChildren(...labels.map(label => {
            const th = document.createElement("th");
            th.scope = "col";
            th.textContent = label;
            return th;
        }));
    }

    function renderResultsPage() {
        const start = (currentPage - 1) * PAGE_SIZE;
        const visibleResults = filteredResults.slice(start, start + PAGE_SIZE);
        resultsBody.replaceChildren(...visibleResults.map((result, offset) => {
            const row = document.createElement("tr");
            const values = [
                result.rowNumber || start + offset + 1,
                result.sepal_length,
                result.sepal_width,
                result.petal_length,
                result.petal_width,
                result.error ? "(Sai dữ liệu)" : displaySpecies(result.prediction),
                result.error || !Number.isFinite(result.prediction_time_ms)
                    ? "(Sai dữ liệu)"
                    : `${result.prediction_time_ms.toFixed(4)} ms`
            ];
            values.forEach((value, index) => {
                const cell = document.createElement("td");
                cell.textContent = value;
                if (index === 5 && !result.error) cell.className = "batch-main-result";
                if (index === 6 && !result.error) cell.className = "batch-metric-cell";
                if (index >= 5 && result.error) {
                    cell.className = "batch-invalid-result";
                    cell.title = `Dòng ${result.line}: ${result.error}`;
                }
                row.appendChild(cell);
            });
            return row;
        }));

        const totalPages = Math.ceil(filteredResults.length / PAGE_SIZE);
        const filterName = activeBatchFilter === "all"
            ? "Tất cả"
            : activeBatchFilter.charAt(0).toUpperCase() + activeBatchFilter.slice(1);
        const rangeStart = filteredResults.length ? start + 1 : 0;
        const rangeEnd = Math.min(start + visibleResults.length, filteredResults.length);
        document.getElementById("batch-visible-count").textContent = filteredResults.length
            ? `Bộ lọc ${filterName}: ${filteredResults.length} dòng · Đang xem ${rangeStart}–${rangeEnd}.`
            : `Bộ lọc ${filterName}: không có dòng kết quả.`;
        pageInfo.textContent = totalPages ? `Trang ${currentPage} / ${totalPages}` : "0 dòng";
        previousPageButton.disabled = currentPage <= 1 || totalPages === 0;
        nextPageButton.disabled = currentPage >= totalPages || totalPages === 0;
    }

    function showResults(data, rows) {
        batchInferenceTimeMs = Number.isFinite(data.inference_time_ms) ? data.inference_time_ms : null;
        const apiResults = Array.isArray(data.results) ? data.results : [];
        let validIndex = 0;
        predictionResults = rows.map((row, index) => {
            const result = row.sample ? apiResults[validIndex++] : null;
            return {
                line: row.line,
                rowNumber: index + 1,
                sample: row.sample,
                error: row.error,
                hasSpeciesColumn: row.hasSpeciesColumn,
                rawSpecies: row.rawSpecies,
                sepal_length: row.sample?.sepal_length ?? row.displayValues.sepal_length,
                sepal_width: row.sample?.sepal_width ?? row.displayValues.sepal_width,
                petal_length: row.sample?.petal_length ?? row.displayValues.petal_length,
                petal_width: row.sample?.petal_width ?? row.displayValues.petal_width,
                prediction: result?.prediction || result?.main_result || "",
                prediction_time_ms: result?.prediction_time_ms
            };
        });
        if (validIndex !== apiResults.length) throw new Error("Số kết quả API không khớp số dòng hợp lệ.");
        resultOwnerId = getCurrentUserId();

        const validCount = rows.filter(row => row.sample).length;
        const invalidCount = rows.length - validCount;
        document.getElementById("batch-results-summary").textContent =
            `Đã phân loại thành công ${validCount}/${rows.length} mẫu; ${invalidCount} dòng sai dữ liệu.`;
        const invalidDetails = document.getElementById("batch-invalid-details");
        invalidDetails.replaceChildren(...rows.filter(row => row.error).map(row => {
            const item = document.createElement("li");
            item.textContent = `Dòng ${row.line}: ${row.error}`;
            return item;
        }));
        invalidDetails.hidden = invalidCount === 0;
        document.getElementById("batch-count-total").textContent = rows.length;
        ["setosa", "versicolor", "virginica"].forEach(species => {
            const speciesCount = predictionResults.filter(result =>
                !result.error && String(result.prediction).toLowerCase() === species
            ).length;
            document.getElementById(`batch-count-${species}`).textContent = speciesCount;
        });
        activeBatchFilter = "all";
        filteredResults = predictionResults;
        updateBatchFilterButtons();
        renderResultHeaders();
        currentPage = 1;
        renderResultsPage();
        resultsSection.hidden = false;
        resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function restoreBatchState() {
        const userId = getCurrentUserId();
        if (!userId) return;

        removeOtherAccountStates(userId);

        let storedValue;
        try {
            storedValue = sessionStorage.getItem(batchStateKey(userId));
        } catch (error) {
            setStatus("Trình duyệt không cho phép đọc bộ nhớ phiên Batch.", "error");
            return;
        }
        if (!storedValue) return;

        try {
            const state = JSON.parse(storedValue);
            if (state.version !== 1 || state.userId !== userId ||
                typeof state.fileName !== "string" ||
                !SUPPORTED_KERNELS.includes(state.kernel) ||
                !SUPPORTED_FILTERS.includes(state.filter) ||
                !Array.isArray(state.results) || state.results.length === 0 || state.results.length > MAX_ROWS) {
                throw new Error("Trạng thái Batch không hợp lệ.");
            }

            predictionResults = state.results.map((item, index) => {
                if (!item || typeof item !== "object") throw new Error("Dữ liệu mẫu đã lưu không hợp lệ.");
                const error = typeof item.error === "string" ? item.error : "";
                const prediction = typeof item.prediction === "string" ? item.prediction : "";
                if (!error && !["setosa", "versicolor", "virginica"].includes(prediction.toLowerCase())) {
                    throw new Error("Kết quả dự đoán đã lưu không hợp lệ.");
                }
                return {
                    rowNumber: Number.isInteger(item.rowNumber) ? item.rowNumber : index + 1,
                    line: Number.isInteger(item.line) ? item.line : index + 2,
                    sepal_length: item.sepal_length ?? "",
                    sepal_width: item.sepal_width ?? "",
                    petal_length: item.petal_length ?? "",
                    petal_width: item.petal_width ?? "",
                    prediction,
                    error,
                    prediction_time_ms: Number.isFinite(item.prediction_time_ms) ? item.prediction_time_ms : null,
                    hasSpeciesColumn: item.hasSpeciesColumn === true,
                    rawSpecies: typeof item.rawSpecies === "string" ? item.rawSpecies : ""
                };
            });

            const kernelInput = document.querySelector(`input[name="batch-kernel"][value="${state.kernel}"]`);
            if (!kernelInput) throw new Error("Không khôi phục được kernel của lần dự đoán trước.");
            kernelInput.checked = true;

            restoredFileName = state.fileName;
            resultOwnerId = userId;
            batchInferenceTimeMs = Number.isFinite(state.inferenceTimeMs) ? state.inferenceTimeMs : null;
            selectedFile = null;
            parsedRows = null;
            fileInput.value = "";
            fileDetails.hidden = false;
            fileName.textContent = state.fileName;
            const validCount = predictionResults.filter(result => !result.error).length;
            fileRowCount.textContent = `${validCount} mẫu đã dự đoán · file gốc cần chọn lại để chạy mới`;
            runButton.disabled = true;

            document.getElementById("batch-results-summary").textContent =
                `Đã khôi phục ${validCount}/${predictionResults.length} mẫu từ lần chạy trước.`;
            const invalidRows = predictionResults.filter(result => result.error);
            const invalidDetails = document.getElementById("batch-invalid-details");
            invalidDetails.replaceChildren(...invalidRows.map(result => {
                const item = document.createElement("li");
                item.textContent = `Dòng ${result.line}: ${result.error}`;
                return item;
            }));
            invalidDetails.hidden = invalidRows.length === 0;

            const counts = getPredictionCounts(predictionResults);
            document.getElementById("batch-count-total").textContent = counts.total;
            ["setosa", "versicolor", "virginica"].forEach(species => {
                document.getElementById(`batch-count-${species}`).textContent = counts[species];
            });

            activeBatchFilter = state.filter;
            filteredResults = activeBatchFilter === "all"
                ? predictionResults
                : predictionResults.filter(result => !result.error && String(result.prediction).toLowerCase() === activeBatchFilter);
            const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
            currentPage = Number.isInteger(state.page) ? Math.min(Math.max(state.page, 1), totalPages) : 1;
            updateBatchFilterButtons();
            renderResultHeaders();
            renderResultsPage();
            resultsSection.hidden = false;
        } catch (error) {
            removeBatchState(userId);
            setStatus("Không thể khôi phục kết quả Batch đã lưu; hãy chọn lại CSV và chạy dự đoán.", "error");
            console.warn("Unable to restore batch prediction state:", error);
        }
    }

    function csvCell(value) {
        const text = String(value ?? "");
        return `"${text.replaceAll('"', '""')}"`;
    }

    function downloadCsv(filename, rows) {
        const content = `\uFEFF${rows.map(row => row.map(csvCell).join(",")).join("\r\n")}`;
        const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    document.getElementById("batch-download-template").addEventListener("click", () => {
        downloadCsv("iris_batch_template.csv", [
            REQUIRED_COLUMNS,
            [5.1, 3.5, 1.4, 0.2],
            [6.0, 2.9, 4.5, 1.5],
            [6.5, 3.0, 5.2, 2.0]
        ]);
    });

    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInput.click();
        }
    });
    ["dragenter", "dragover"].forEach(type => dropZone.addEventListener(type, event => {
        event.preventDefault();
        dropZone.classList.add("is-dragging");
    }));
    ["dragleave", "drop"].forEach(type => dropZone.addEventListener(type, event => {
        event.preventDefault();
        dropZone.classList.remove("is-dragging");
    }));
    dropZone.addEventListener("drop", event => selectFile(event.dataTransfer?.files?.[0]));
    fileInput.addEventListener("change", () => selectFile(fileInput.files?.[0]));
    document.getElementById("batch-change-file").addEventListener("click", () => fileInput.click());
    document.querySelectorAll("[data-batch-filter]").forEach(button => {
        button.addEventListener("click", () => setBatchFilter(button.dataset.batchFilter));
    });
    document.querySelectorAll('input[name="batch-kernel"]').forEach(input => {
        input.addEventListener("change", () => {
            if (!resultsSection.hidden) {
                clearResults();
                setStatus("Đã đổi kernel. Chạy lại để nhận kết quả từ model vừa chọn.", "loading");
            }
        });
    });

    runButton.addEventListener("click", async () => {
        if (!selectedFile || !parsedRows?.length || isPredicting) return;
        const userId = Number(localStorage.getItem("user_id"));
        if (!Number.isInteger(userId) || userId <= 0) {
            setStatus("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.", "error");
            return;
        }

        runButton.disabled = true;
        isPredicting = true;
        fileInput.disabled = true;
        dropZone.disabled = true;
        document.getElementById("batch-change-file").disabled = true;
        document.querySelectorAll('input[name="batch-kernel"]').forEach(input => { input.disabled = true; });
        runButton.textContent = "ĐANG DỰ ĐOÁN...";
        resultsSection.hidden = true;
        setStatus("Đang xử lý các mẫu CSV...", "loading");
        const selectedKernel = getSelectedKernel();
        const validRows = parsedRows.filter(row => row.sample);

        try {
            let data = { results: [], counts: {}, kernel_used: selectedKernel, inference_time_ms: null };
            if (validRows.length) {
                const response = await fetch(`${API_BASE_URL}/predict/batch`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        user_id: userId,
                        kernel: selectedKernel,
                        samples: validRows.map(row => row.sample)
                    })
                });
                data = await response.json();
                if (!response.ok) throw new Error(getErrorMessage(data, "Không thể chạy dự đoán hàng loạt."));
                if (data.kernel_used !== selectedKernel) throw new Error("Backend trả về model khác với kernel đã chọn.");
            }
            if (validRows.length && getCurrentUserId() !== String(userId)) {
                throw new Error("Tài khoản đã thay đổi trong lúc dự đoán; kết quả không được lưu vào phiên khác.");
            }
            showResults(data, parsedRows);
            if (validRows.length > 0) {
                if (persistBatchState(String(userId))) {
                    setStatus(`Dự đoán thành công ${validRows.length} mẫu. Kết quả được lưu trong phiên này.`, "success");
                }
            } else {
                setStatus("Không có dòng hợp lệ để dự đoán. Dòng lỗi vẫn được hiển thị bên dưới.", "error");
            }
        } catch (error) {
            setStatus(error.message || "Không thể kết nối máy chủ.", "error");
        } finally {
            isPredicting = false;
            runButton.disabled = !parsedRows?.length;
            fileInput.disabled = false;
            dropZone.disabled = false;
            document.getElementById("batch-change-file").disabled = false;
            document.querySelectorAll('input[name="batch-kernel"]').forEach(input => { input.disabled = false; });
            runButton.textContent = "CHẠY DỰ ĐOÁN HÀNG LOẠT";
        }
    });

    previousPageButton.addEventListener("click", () => {
        if (currentPage <= 1) return;
        currentPage -= 1;
        renderResultsPage();
        persistBatchState();
    });
    nextPageButton.addEventListener("click", () => {
        if (currentPage >= Math.ceil(filteredResults.length / PAGE_SIZE)) return;
        currentPage += 1;
        renderResultsPage();
        persistBatchState();
    });

    document.getElementById("batch-clear-results").addEventListener("click", () => {
        const removed = removeBatchState(resultOwnerId || getCurrentUserId());
        selectedFile = null;
        restoredFileName = "";
        parsedRows = null;
        fileInput.value = "";
        fileDetails.hidden = true;
        fileName.textContent = "";
        fileRowCount.textContent = "";
        runButton.disabled = true;
        clearResults();
        setStatus(removed ? "Đã xóa kết quả Batch đã lưu trong phiên." : "Đã xóa kết quả đang hiển thị nhưng không thể xóa cache của trình duyệt.", removed ? "success" : "error");
    });

    document.getElementById("batch-export-results").addEventListener("click", () => {
        const hasSpeciesColumn = predictionResults.some(result => result.hasSpeciesColumn);
        const headers = [...REQUIRED_COLUMNS, ...(hasSpeciesColumn ? ["species"] : []), "prediction", "prediction_time_ms"];
        const rows = predictionResults.map(result => [
            result.sepal_length,
            result.sepal_width,
            result.petal_length,
            result.petal_width,
            ...(hasSpeciesColumn ? [result.rawSpecies] : []),
            result.error ? "Sai dữ liệu" : result.prediction,
            result.error ? "Sai dữ liệu" : result.prediction_time_ms
        ]);
        downloadCsv("iris_batch_results.csv", [headers, ...rows]);
    });

    window.addEventListener("storage", event => {
        if (event.key !== "user_id" || !resultOwnerId || event.newValue === resultOwnerId) return;
        removeBatchState(resultOwnerId);
        selectedFile = null;
        restoredFileName = "";
        parsedRows = null;
        fileInput.value = "";
        fileDetails.hidden = true;
        runButton.disabled = true;
        clearResults();
        setStatus("Tài khoản đã thay đổi; đã xóa kết quả Batch của phiên trước.", "error");
    });

    restoreBatchState();
})();
