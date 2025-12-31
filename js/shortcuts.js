// shortcuts.js
export function initShortcuts(context) {
    let isFpsInputMode = false;
    let fpsBuffer = "";

    const {
        showNext,
        showPrevious,
        toggleAuto,
        reset,
        toggleTimeSheet,
        dougaViewToggle,
        gengaViewToggle,
        filterCheckbox,
        layerToggles,
        layerCheckboxes,
        startAuto,
        stopAuto,
        autoScroll
    } = context;

    /* =========================
        FPS表示
    ========================= */
    const fpsInputDisplay = document.createElement("div");
    Object.assign(fpsInputDisplay.style, {
        position: "fixed",
        bottom: "10px",
        right: "10px",
        padding: "5px 10px",
        background: "rgba(0,0,0,0.6)",
        color: "white",
        borderRadius: "4px",
        fontSize: "14px",
        display: "none"
    });
    document.body.appendChild(fpsInputDisplay);

    /* =========================
        レイヤー番号ツールチップ
    ========================= */
    const layerNumberTooltips = [];

    function setupLayerNumberTooltips() {
        layerNumberTooltips.length = 0;

        const headers = document.querySelectorAll(".timeline-header-controls");
        headers.forEach((header, i) => {
        const labelSpan = header.querySelector("span");
        if (!labelSpan) return;

        const tooltip = document.createElement("span");
        tooltip.className = "layer-number-tooltip";
        tooltip.textContent = String(i+1);
        Object.assign(tooltip.style, {
            marginLeft: "6px",
            padding: "2px 6px",
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            fontSize: "11px",
            borderRadius: "4px",
            display: "none",
            userSelect: "none",
            pointerEvents: "none"
        });

        labelSpan.after(tooltip);
        layerNumberTooltips.push(tooltip);
        });
    }

    function showLayerNumberTooltips(show) {
        layerNumberTooltips.forEach(t => {
        t.style.display = show ? "inline-block" : "none";
        });
    }

    /* =========================
        キーボード処理
    ========================= */
    document.addEventListener("keydown", (e) => {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;

        // Shift 押下 → tooltip 表示
        if (e.key === "Shift") {
        showLayerNumberTooltips(true);
        return;
        }

        /* --- FPS入力モード --- */
        if (isFpsInputMode) {
        if (e.key >= "0" && e.key <= "9") {
            fpsBuffer += e.key;
            fpsInputDisplay.textContent = `FPS: ${fpsBuffer}`;
            fpsInputDisplay.style.display = "block";
            return;
        }

        if (e.key === "Backspace") {
            fpsBuffer = fpsBuffer.slice(0, -1);
            fpsInputDisplay.textContent = `FPS: ${fpsBuffer}`;
            return;
        }

        if (e.key === "Enter") {
            if (fpsBuffer.length) {
            document.getElementById("fps").value = parseInt(fpsBuffer, 10);
            }
            fpsBuffer = "";
            isFpsInputMode = false;
            fpsInputDisplay.style.display = "none";

            if (autoScroll) stopAuto();
            setTimeout(() => startAuto(), 100);
            return;
        }

        if (e.key === "Escape") {
            fpsBuffer = "";
            isFpsInputMode = false;
            fpsInputDisplay.style.display = "none";
            return;
        }

        return;
        }

        if (e.key === "s" || e.key === "S") {
        isFpsInputMode = true;
        fpsBuffer = "";
        fpsInputDisplay.textContent = "FPS入力:";
        fpsInputDisplay.style.display = "block";
        return;
        }

        /* --- Shift + 数字でレイヤー --- */
        if (e.shiftKey && e.code.startsWith("Digit")) {
            e.preventDefault();

            const num = Number(e.code.replace("Digit", ""));
            if (!Number.isInteger(num)) return;

            const index = layerCheckboxes.length - num;
            console.log(index)
            const cb = layerCheckboxes[index];

            if (cb) {
                cb.checked = !cb.checked;
                cb.dispatchEvent(new Event("change"));
            }
            return;
        }

        switch (e.key) {
            case "ArrowRight": showNext(); break;
            case "ArrowLeft": showPrevious(); break;
            case " ": toggleAuto(); break;
            case "r":
            case "R": reset(); break;
            case "f":
            case "F":
                filterCheckbox.checked = !filterCheckbox.checked;
                filterCheckbox.dispatchEvent(new Event("change"));
                break;
            case "t":
            case "T": toggleTimeSheet(); break;
            case "1":
                if (!e.shiftKey && dougaViewToggle) {
                    e.preventDefault();
                    dougaViewToggle.checked = !dougaViewToggle.checked;
                    dougaViewToggle.dispatchEvent(new Event("change"));
                }
                break;
            case "2":
                if (!e.shiftKey && gengaViewToggle) {
                    e.preventDefault();
                    gengaViewToggle.checked = !gengaViewToggle.checked;
                    gengaViewToggle.dispatchEvent(new Event("change"));
                }
            break;
        }
    });

    document.addEventListener("keyup", (e) => {
        if (e.key === "Shift") {
        showLayerNumberTooltips(false);
        }
    });

    return {
        setupLayerNumberTooltips
    };
}
