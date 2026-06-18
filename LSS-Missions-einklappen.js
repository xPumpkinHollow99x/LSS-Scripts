// ==UserScript==
// @name         LSS Missions einklappen (⇅ Toggle)
// @namespace    PumpkinHollow
// @version      2.1
// @description  Missionsliste einklappen inkl. neuer Einsätze + UI Button im Filterbereich
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Missions-einklappen.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Missions-einklappen.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'lss_mission_collapse';

    function getState() {
        return localStorage.getItem(STORAGE_KEY) === '1';
    }

    function setState(state) {
        localStorage.setItem(STORAGE_KEY, state ? '1' : '0');
    }

    function applyToMission(panel, state) {
    if (!panel) return;
    if (!panel.id?.startsWith('mission_panel_')) return;

    const body = panel.querySelector('.panel-body');
    const heading = panel.querySelector('.panel-heading');

    if (!body || !heading) return;

    let badge = heading.querySelector('.lss-patient-badge');

    function getPatientCount(panel) {

        let total = 0;

        // 1. BEST CASE: Summary
        const summary = panel.querySelector('[id^="mission_patient_summary_"]');

        if (summary) {
            const match = summary.textContent.match(/(\d+)\s*Patienten/i);
            if (match) total = parseInt(match[1], 10);
        }

        // 2. FALLBACK: echte Patienten zählen
        if (!total) {
            const container = panel.querySelector('[id^="mission_patients_"]');

            if (container) {
                const patients = container.querySelectorAll(':scope > div[id^="patient_"]');
                total = patients.length;
            }
        }

        // 3. LETZTER FALLBACK: Button Text
        if (!total) {
            const btn = panel.querySelector('#patient_button_text');
            if (btn) {
                const match = btn.textContent.match(/(\d+)/);
                if (match) total = parseInt(match[1], 10);
            }
        }

        return total;
    }

    if (state) {

        const total = getPatientCount(panel);

        if (total > 0) {

            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'lss-patient-badge';

                Object.assign(badge.style, {
                    marginLeft: '8px',
                    background: '#d9534f',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'inline-block',
                    verticalAlign: 'middle'
                });

                heading.appendChild(badge);
            }

            badge.textContent = `🩺 ${total} Pat.`;
        }

        body.style.display = 'none';
        panel.classList.add('lss-mission-collapsed');

    } else {

        if (badge) badge.remove();

        body.style.display = '';
        panel.classList.remove('lss-mission-collapsed');
    }
}

    function applyAll(state) {
        document
            .querySelectorAll('[id^="mission_panel_"]')
            .forEach(panel => applyToMission(panel, state));
    }

    function observeNewMissions(state) {

        const missionList =
              document.querySelector('#mission_list') ||
              document.querySelector('#mission_list_outer') ||
              document.body;

        const observer = new MutationObserver(mutations => {

            for (const mutation of mutations) {

                for (const node of mutation.addedNodes) {

                    if (!(node instanceof HTMLElement)) continue;

                    // Neuer Einsatz direkt eingefügt
                    if (node.id?.startsWith('mission_panel_')) {
                        applyToMission(node, state);
                        continue;
                    }

                    // Manchmal kommt der Einsatz in einem Wrapper
                    const panel = node.querySelector?.('[id^="mission_panel_"]');

                    if (panel) {
                        applyToMission(panel, state);
                    }
                }
            }
        });

        observer.observe(missionList, {
            childList: true
        });
    }

    function createButton() {
        const container = document.querySelector('#missions-panel-main');
        if (!container) return;

        const btn = document.createElement('a');
        btn.href = "javascript:void(0)";
        btn.id = "mission_toggle_collapse_btn";

        btn.textContent = "⇅";

        Object.assign(btn.style, {
            marginLeft: "6px",
            padding: "4px 10px",
            borderRadius: "4px",
            background: "#f8f8f8",
            border: "1px solid #ccc",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            color: "#333",
            fontWeight: "700",
            fontSize: "14px",
            lineHeight: "1"
        });

        function updateStyle() {
            const collapsed = getState();

            if (collapsed) {
                btn.style.background = "#5cb85c"; // grün
                btn.style.border = "1px solid #4cae4c";
                btn.style.color = "#fff";
                btn.style.opacity = "1";
            } else {
                btn.style.background = "#d9534f"; // rot
                btn.style.border = "1px solid #d43f3a";
                btn.style.color = "#fff";
                btn.style.opacity = "1";
            }
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();

            const newState = !getState();
            setState(newState);

            applyAll(newState);
            updateStyle();
        });

        container.appendChild(btn);

        updateStyle();
    }

    function init() {
        const state = getState();

        applyAll(state);
        observeNewMissions(state);
        createButton();
    }

    window.addEventListener('load', init);

})();
