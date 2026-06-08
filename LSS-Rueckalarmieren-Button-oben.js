// ==UserScript==
// @name         LSS Rueckalarmieren-Button oben
// @namespace    PumpkinHollow
// @version      4.0
// @description  Platziert einen modernen Rückalarmieren-Button oben beim Einsatznamen
// @match        https://www.leitstellenspiel.de/missions/*
// @match        https://polizei.leitstellenspiel.de/missions/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Rueckalarmieren-Button-oben.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Rueckalarmieren-Button-oben.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function createStyledButton(originalBtn) {
        const btn = originalBtn.cloneNode(true);

        btn.style.background = "#d9534f"; // Modernes Rot
        btn.style.border = "none";
        btn.style.color = "white";
        btn.style.padding = "8px 14px";
        btn.style.borderRadius = "6px";
        btn.style.fontSize = "14px";
        btn.style.fontWeight = "600";
        btn.style.marginRight = "8px";
        btn.style.cursor = "pointer";
        btn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
        btn.style.transition = "0.2s";

        btn.onmouseover = () => btn.style.opacity = "0.85";
        btn.onmouseout  = () => btn.style.opacity = "1";

        return btn;
    }

    function moveButton() {
        const allButtons = [...document.querySelectorAll("a.btn, button.btn")];

        // Feuerwehr + Polizei Rückalarm-Button (egal welcher existiert)
        const btn = allButtons.find(el =>
            el.textContent.includes("rückalarmieren")
        );

        if (!btn) return;

        const header = document.querySelector(".mission_header_info, .mission_header, #mission_general_info");
        if (!header) return;

        let container = document.getElementById("modernBackalarmContainer");
        if (!container) {
            container = document.createElement("div");
            container.id = "modernBackalarmContainer";
            container.style.marginTop = "10px";
            container.style.marginBottom = "10px";
            header.appendChild(container);
        }

        const newBtn = createStyledButton(btn);
        container.appendChild(newBtn);

        console.log("[LSS Script] EIN moderner Rückalarmieren-Button oben platziert.");
    }

    const interval = setInterval(() => {
        const header = document.querySelector(".mission_header_info, .mission_header, #mission_general_info");
        const text = document.body.innerText;

        if (header && text.includes("rückalarmieren")) {
            clearInterval(interval);
            moveButton();
        }
    }, 200);

    setTimeout(() => clearInterval(interval), 8000);
})();
