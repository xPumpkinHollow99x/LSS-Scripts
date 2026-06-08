// ==UserScript==
// @name         LSS AAO Einsätze ausgrauen
// @namespace    PumpkinHollow
// @version      1.7
// @description  Sauberes Matching mit optionaler Klammerlogik
// @match        https://www.leitstellenspiel.de/missions/*
// @match        https://polizei.leitstellenspiel.de/missions/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-AAO-Einsätze-ausgrauen.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-AAO-Einsätze-ausgrauen.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function normalize(text) {
        return text
            .toLowerCase()
            .replace(/\[.*?\]/g, '')
            .replace(/[^a-zäöüß0-9() ]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function extractMission(text) {
        text = text.toLowerCase();

        // ID entfernen (491/a, 612/AB etc.)
        text = text.replace(/^\d+\/?[a-z]+?\s*/i, '');

        // Klammer extrahieren
        const bracketMatch = text.match(/\((.*?)\)/);
        const bracket = bracketMatch ? normalize(bracketMatch[1]) : null;

        // Klammer entfernen für Basis
        const base = normalize(text.replace(/\(.*?\)/g, ''));

        return { base, bracket };
    }

    function extractAAO(text) {
        const raw = text.toLowerCase();

        const bracketMatch = raw.match(/\((.*?)\)/);
        const bracket = bracketMatch ? normalize(bracketMatch[1]) : null;

        const base = normalize(raw.replace(/\(.*?\)/g, ''));

        return { base, bracket };
    }

    function applyFilter() {
        const missionH1 = document.querySelector('#missionH1');
        if (!missionH1) return;

        const mission = extractMission(missionH1.textContent);

        const aaoButtons = document.querySelectorAll('.aao_btn');

        aaoButtons.forEach(btn => {
            const attr = btn.getAttribute('search_attribute') || '';
            const spanText = btn.querySelector('span:last-child')?.textContent || '';

            const aao = extractAAO(attr + ' ' + spanText);

            // ✅ Basis muss enthalten sein (nicht exakt!)
            const baseMatch =
                aao.base.includes(mission.base) ||
                mission.base.includes(aao.base);

            // ✅ Klammer-Logik (nur wenn vorhanden!)
            let bracketMatch = true;

            if (mission.bracket && aao.bracket) {
                bracketMatch = aao.bracket.includes(mission.bracket);
            }

            const isMatch = baseMatch && bracketMatch;

            if (!isMatch) {
                btn.style.opacity = '0.3';
                btn.style.filter = 'grayscale(100%)';
                btn.style.cursor = 'pointer';
            } else {
                btn.style.opacity = '1';
                btn.style.filter = '';
            }
        });
    }

    setTimeout(applyFilter, 500);

    const observer = new MutationObserver(() => {
        applyFilter();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
