// ==UserScript==
// @name         LSS Buy Extension
// @namespace    PumpkinHollow
// @version      1.0
// @description  Baut Erweiterungen, zeigt Gesamtkosten und lädt die Seite nach Abschluss neu.
// @include      https://www.leitstellenspiel.de/buildings/*
// @include      https://polizei.leitstellenspiel.de/buildings/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Buy-Extension.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Buy-Extension.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    // Preisliste (Credits)
    const prices = {
        extensions: { default: 100000 },
        specialization: 50000,
        storage: 50000
    };

    const extensionsConfigurations = [
        { buildingID: 0, displayName: "FW Standard", ausbauten:[0,16,18,19,25,20,14], spezialisierung:[], lager:[] },
        { buildingID: 0, displayName: "FW WF", ausbauten:[0,16,18,19,25,20,14,13,9,15], spezialisierung:[], lager:[] },
        { buildingID: 0, displayName: "FW FHF", ausbauten:[0,16,18,19,25,20,14,8,9,15], spezialisierung:[], lager:[] },
        { buildingID: 0, displayName: "GW + NEA200", ausbauten:[9,15], spezialisierung:[], lager:[] },
        { buildingID: 9, displayName: "THW", ausbauten:[11,0,1,2,3,4,5,6,7,8,9,10,12,13,14,15], spezialisierung:[], lager:[] },
        { buildingID: 12, displayName: "SEG", ausbauten:[0,1,2,3,4,5,6], spezialisierung:[], lager:[] },
        { buildingID: 25, displayName: "Bergwacht", ausbauten:[3,0,1,2], spezialisierung:[], lager:[] }
    ];

    const buildingId = window.location.pathname.split("/")[2];
    const titleDiv = document.querySelector("h1[building_type]");
    if (!titleDiv || !buildingId) return;

    const buildingTypeID = Number(titleDiv.getAttribute("building_type"));
    const csrfToken = $("meta[name=csrf-token]").attr("content");

    // UI Wrapper
    const wrapperDIV = document.createElement("div");
    wrapperDIV.innerHTML = "<b>Ausbau-Configs:</b><br>";
    wrapperDIV.style.cssText = "padding: 15px 5px; border: 1px solid #ccc; margin: 10px 0; background: rgba(0,0,0,0.05); border-radius: 5px;";
    titleDiv.parentNode.parentNode.insertBefore(wrapperDIV, titleDiv.parentNode.nextSibling);

    const messageText = document.createElement("div");
    messageText.style.cssText = "font-size: large; font-weight: 900; color: #f0ad4e; margin-top: 10px;";
    wrapperDIV.appendChild(messageText);

    // Buttons für passende Konfigurationen
    extensionsConfigurations.forEach((config, index) => {
        if (config.buildingID === buildingTypeID) {
            const btn = document.createElement("a");
            btn.className = "btn btn-success btn-xs";
            btn.innerText = config.displayName;
            btn.style.margin = "2px";
            btn.onclick = () => extendBuilding(index);
            wrapperDIV.appendChild(btn);
        }
    });

    async function extendBuilding(configIndex) {
        const config = extensionsConfigurations[configIndex];
        let totalCredits = 0;
        let currentStep = 0;
        const totalSteps = (config.ausbauten?.length || 0) +
                           (config.spezialisierung?.length || 0) +
                           (config.lager?.length || 0);

        const updateStatus = () => {
            messageText.innerText = `⏳ Verarbeite: ${currentStep} / ${totalSteps} (${totalCredits.toLocaleString()} Credits ausgegeben)`;
        };

        const performPost = async (url, cost, updateUI = null) => {
            await $.post(url, { "_method": "post", "authenticity_token": csrfToken });
            totalCredits += cost;
            currentStep++;
            if (updateUI) updateUI();
            updateStatus();
            await new Promise(r => setTimeout(r, 125));
        };

        updateStatus();

        // 1. Ausbauten
        if (config.ausbauten) {
            for (let id of config.ausbauten) {
                let cost = (buildingTypeID === 9 && id === 11) ? 10000 : prices.extensions.default;
                await performPost(`/buildings/${buildingId}/extension/credits/${id}?redirect_building_id=${buildingId}`, cost, () => {
                    const btn = document.querySelector(`#extension_${id}`);
                    if (btn) btn.classList.add("btn-success");
                });
            }
        }

        // 2. Spezialisierungen
        if (config.spezialisierung) {
            const specMap = { 0: "factory_fire_brigade", 1: "airport", 2: "water_rescue" };
            for (let specId of config.spezialisierung) {
                if (specMap[specId]) {
                    await performPost(`/building_specializations?building_id=${buildingId}&pay_with=credits&type=${specMap[specId]}`, prices.specialization);
                }
            }
        }

        // 3. Lager
        if (config.lager) {
            for (let lId of config.lager) {
                const storageName = lId === 0 ? "initial_containers" : `additional_containers_${lId}`;
                await performPost(`/buildings/${buildingId}/storage_upgrade/credits/${storageName}?redirect_building_id=${buildingId}`, prices.storage);
            }
        }

        messageText.style.color = "#5cb85c";
        messageText.innerText = `✅ Fertig! Gesamt: ${totalCredits.toLocaleString()} Credits gezahlt. Seite lädt neu...`;

        // Kurze Pause, damit man die Meldung sieht, dann Reload
        setTimeout(() => {
            location.reload();
        }, 1000);
    }

})();
