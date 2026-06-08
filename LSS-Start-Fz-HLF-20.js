// ==UserScript==
// @name         LSS Start Fz HLF 20
// @namespace    PumpkinHollow
// @version      4.0
// @description  Setzt HLF 20 exakt nach Auswahl der Feuerwache
// @match        https://www.leitstellenspiel.de/buildings/new*
// @match        https://polizei.leitstellenspiel.de/buildings/new*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Start-Fz-HLF-20.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Start-Fz-HLF-20.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const BUILDING_TYPE_ID = '#building_building_type';
    const VEHICLE_SELECT_ID = '#building_start_vehicle_feuerwache';

    function setHLF() {
        const select = document.querySelector(VEHICLE_SELECT_ID);
        if (!select) return;

        select.value = "30";
        select.dispatchEvent(new Event('change', { bubbles: true }));

        console.log("HLF 20 gesetzt ✅");
    }

    function waitForVehicleAndSet() {
        let tries = 0;

        const interval = setInterval(() => {
            const select = document.querySelector(VEHICLE_SELECT_ID);

            if (select && select.options.length > 1) {
                clearInterval(interval);

                // WICHTIG: warten bis alles fertig ist
                setTimeout(setHLF, 150);
            }

            if (tries++ > 30) {
                clearInterval(interval);
                console.log("HLF Script abgebrochen (Timeout)");
            }
        }, 50);
    }

    function init() {
        const buildingType = document.querySelector(BUILDING_TYPE_ID);
        if (!buildingType) return;

        buildingType.addEventListener('change', () => {
            if (buildingType.value === "0") {
                console.log("Feuerwache gewählt 🔥");

                // Reset + warten auf neues UI
                setTimeout(waitForVehicleAndSet, 50);
            }
        });
    }

    // Warten bis Auswahl existiert
    const observer = new MutationObserver(() => {
        const el = document.querySelector(BUILDING_TYPE_ID);

        if (el) {
            observer.disconnect();
            init();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
