// ==UserScript==
// @name         LSS ThwRenameManager
// @namespace    PumpkinHollow
// @version      1.4
// @description  Benennt alle Fahrzeuge auf der Wache nach BOS-Richtlinien um (THW oder analoges RD)
// @match        https://www.leitstellenspiel.de/buildings/*
// @match        https://polizei.leitstellenspiel.de/buildings/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-ThwRenameManager.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-ThwRenameManager.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        none
// ==/UserScript==

async function renameVehicle(vID, vName) {
    return $.post("/vehicles/" + vID, {
        vehicle: { caption: vName },
        authenticity_token: $("meta[name=csrf-token]").attr("content"),
        _method: "put"
    });
}

(async function () {
    'use strict';

    // --- LZString laden ---
    await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });

    const now = Date.now();

    // --- Buildings Cache ---
    if (!sessionStorage.cBuildings ||
        JSON.parse(sessionStorage.cBuildings).lastUpdate < now - 5 * 60 * 1000) {

        const data = await $.getJSON('/api/buildings');
        sessionStorage.setItem('cBuildings', JSON.stringify({
            lastUpdate: now,
            value: LZString.compressToUTF16(JSON.stringify(data))
        }));
    }

    const cBuildings = JSON.parse(
        LZString.decompressFromUTF16(
            JSON.parse(sessionStorage.cBuildings).value
        )
    );

    // --- Vehicles Cache ---
    if (!sessionStorage.cVehicles ||
        JSON.parse(sessionStorage.cVehicles).lastUpdate < now - 5 * 60 * 1000) {

        const data = await $.getJSON('/api/vehicles');
        sessionStorage.setItem('cVehicles', JSON.stringify({
            lastUpdate: now,
            value: LZString.compressToUTF16(JSON.stringify(data))
        }));
    }

    const cVehicles = JSON.parse(
        LZString.decompressFromUTF16(
            JSON.parse(sessionStorage.cVehicles).value
        )
    );

    const buildingID = window.location.href.split("/")[4]?.replace("#", "");
    const building = cBuildings.find(b => b.id == buildingID);

    if (!building || building.building_type != 9) return;

    $('dl.dl-horizontal').append(`
        <dt><strong>Fahrzeuge umbenennen:</strong></dt>
        <dd>
            <input type="text" id="initialName" placeholder="Heros XY...">
            <button id="btnRename" class="btn btn-xs btn-default">Umbenennen</button>
            <label><input id="withType" type="checkbox"> Typ hinzufügen</label>
        </dd>
    `);

    $('#btnRename').on('click', async function () {

        const rows = $('#vehicle_table > tbody > tr').toArray();

        let firstGKW = true;
        let firstMzGW = true;
        let firstMtwTz = true;
        let firstMtwO = true;
        let firstMtwOV = true;

        for (const row of rows) {

            const vehicleLink = $(row).find("a[href*='/vehicles/']").attr("href");
            if (!vehicleLink) continue;

            const vehicleID = vehicleLink.split("/")[2];
            const vehicleType = cVehicles.find(v => v.id == vehicleID)?.vehicle_type;

            if (!vehicleType) continue;

            let org = "";
            let type = "";
            let typeName = "";

            switch (vehicleType) {

                case 39:
                    if (firstGKW) {
                        org = "22";
                        firstGKW = false;
                    } else {
                        org = "27";
                    }
                    type = "/52";
                    typeName = "(GKW)";
                    break;

                case 41:
                    if (firstMzGW) {
                        org = "24";
                        firstMzGW = false;
                    } else {
                        org = "28";
                    }
                    type = "/55";
                    typeName = "(MzGW (FGr N))";
                    break;

                case 40:
                    if (firstMtwTz) {
                        org = "21";
                        firstMtwTz = false;
                    } else {
                        org = "26";
                    }
                    type = "/10";
                    typeName = "(MTW-TZ)";
                    break;

                case 93:
                    org = "44";
                    type = firstMtwO ? "/25" : "/26";
                    firstMtwO = false;
                    typeName = "(MTW-O)";
                    break;

                case 92:
                    org = "";
                    type = "Anh-Hund";
                    break;

                case 44:
                    org = "";
                    type = "Anh-DLE";
                    break;

                case 45:
                    org = "41";
                    type = "/35";
                    typeName = "(MLW 5)";
                    break;

                case 43:
                    org = "41";
                    type = "/72";
                    typeName = "(BRmG R)";
                    break;

                case 42:
                    org = "41";
                    type = "/62";
                    typeName = "(LKW K 9)";
                    break;

                case 69:
                    org = "36";
                    type = "/56";
                    typeName = "(Tauchkraftwagen)";
                    break;

                case 65:
                    org = "36";
                    type = "/64";
                    typeName = "(LKW 7 Lkr 19 tm)";
                    break;

                case 66:
                    org = "";
                    type = "Anh-MzB";
                    break;

                case 67:
                    org = "";
                    type = "Anh-SchlB";
                    break;

                case 68:
                    org = "";
                    type = "Anh-MzAB";
                    break;

                case 102:
                    org = "";
                    type = "Anh-7";
                    break;

                case 101:
                    org = "";
                    type = "Anh-SwPu";
                    break;

                case 123:
                    org = "47";
                    type = "/43";
                    typeName = "(LKW 7 Lbw (FGr WP))";
                    break;

                case 100:
                    org = "47";
                    type = "/34";
                    typeName = "(MLW 4)";
                    break;

                case 122:
                    org = "32";
                    type = "/43";
                    typeName = "(LKW 7 Lbw (FGr E))";
                    break;

                case 112:
                    org = "";
                    type = "Anh-NEA200";
                    break;

                case 110:
                    org = "";
                    type = "Anh-NEA50";
                    break;

                case 124:
                    org = "86";
                    type = firstMtwOV ? "/25" : "/26";
                    firstMtwOV = false;
                    typeName = "(MTW-OV)";
                    break;

                case 125:
                    org = "76";
                    type = "/25";
                    typeName = "(MTW-Tr UL)";
                    break;

                case 109:
                    org = "38";
                    type = "/55";
                    typeName = "(MzGW SB)";
                    break;

                case 144:
                    org = "18";
                    type = "/11";
                    typeName = "(FüKW (THW))";
                    break;

                case 145:
                    org = "18";
                    type = "/12";
                    typeName = "(FüKomKW)";
                    break;

                case 146:
                    org = "";
                    type = "Anh-FüLa";
                    break;

                case 147:
                    org = "18";
                    type = "/13";
                    typeName = "(FmKW)";
                    break;

                case 148:
                    org = "18";
                    type = "/25";
                    typeName = "(MTW-FGr K)";
                    break;

                case 176:
                    org = "64";
                    type = "/42";
                    typeName = "(LKW 7 Lbw (FGr Log-V))";
                    break;

                case 177:
                    org = "64";
                    type = "/25";
                    typeName = "(MTW-FGr Log-V)";
                    break;

                case 178:
                    org = "";
                    type = "Anh-12-Lbw (FGr Log-V)";
                    break;

                case 181:
                    org = "54";
                    type = "/55";
                    typeName = "(MzGW (FGr BrB))";
                    break;

                case 182:
                    org = "54";
                    type = "/47";
                    typeName = "(Mobilkran)";
                    break;

                case 183:
                    org = "";
                    type = "Anh-Plattform (FGr BrB)";
                    break;
            }

            const base = $('#initialName').val() || "";

            const vName = $('#withType').is(':checked')
                ? `${base} ${org}${type} ${typeName || ""}`
                : `${base} ${org}${type}`;

            await renameVehicle(vehicleID, vName);
            await new Promise(r => setTimeout(r, 120));
        }

        location.reload();
    });

})();
