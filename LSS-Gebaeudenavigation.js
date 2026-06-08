// ==UserScript==
// @name         LSS Gebaeudenavigation (S/D)
// @namespace    PumpkinHollow
// @version      2.0.0
// @description  Nutzt echte Buttons für Navigation (keine ID-Tricks)
// @match        https://www.leitstellenspiel.de/buildings/*
// @match        https://polizei.leitstellenspiel.de/buildings/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Gebaeudenavigation.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Gebaeudenavigation.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    function findButton(text) {
        return Array.from(document.querySelectorAll("a.btn"))
            .find(el => el.textContent.trim().toLowerCase().includes(text));
    }

    document.addEventListener("keydown", (e) => {
        const tag = document.activeElement.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;

        const key = e.key.toLowerCase();

        // S = vorheriges Gebäude
        if (key === "a") {
            e.preventDefault();
            const prevBtn = findButton("vorher");
            if (prevBtn) {
                prevBtn.click();
            } else {
                console.log("[LSS] Kein 'Vorheriges Gebäude' Button gefunden");
            }
        }

        // D = nächstes Gebäude
        if (key === "d") {
            e.preventDefault();
            const nextBtn = findButton("nächst");
            if (nextBtn) {
                nextBtn.click();
            } else {
                console.log("[LSS] Kein 'Nächstes Gebäude' Button gefunden");
            }
        }
    });

})();
