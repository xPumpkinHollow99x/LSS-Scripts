// ==UserScript==
// @name         Change Vehicle max personal
// @namespace    PumpkinHollow
// @version      1.0
// @description  Ändert die Personenanzahl
// @include      https://www.leitstellenspiel.de/buildings/*
// @include      https://polizei.leitstellenspiel.de/buildings/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/Change-Vehicle-max-personal.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/Change-Vehicle-max-personal.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    // --- Konfiguration: [VehicleTypeID, PersonenAnzahl]
    const vehicleConfig = new Map([
        [0, 1], [2, 1], [3, 1], [4, 1], [5, 1], [10, 1], [14, 1],
        [30, 1], [36, 1], [87, 1], [32, 1], [50, 1], [52, 1], [39, 1], [41, 1], [124, 1],
    ]);

    // Button einfügen
    function injectButton() {
        if ($("#changeMaxPerson").length > 0) return;

        const btn = $(`
            <button id="changeMaxPerson"
                    class="btn btn-warning"
                    style="margin-left:8px;">
                <i class="glyphicon glyphicon-flash"></i>
                Personen anpassen
            </button>
        `);

        if ($("#btnAssignBuildingRefresh").length) {
            $("#btnAssignBuildingRefresh").after(btn);
        } else if ($("#turbo-building-ui").length) {
            $("#turbo-building-ui").append(btn);
        } else {
            $(".building-title").append(btn);
        }
    }

    injectButton();

    // Klick-Event ohne Nachfrage
    $(document).on("click", "#changeMaxPerson", function(e) {
        e.preventDefault();
        processVehicles();
    });

    async function processVehicles() {
        const rows = $("#vehicle_table tbody tr");
        const csrfToken = $("meta[name=csrf-token]").attr("content");
        let count = 0;

        $("#changeMaxPerson").removeClass("btn-success").addClass("btn-warning").prop("disabled", true);

        for (let i = 0; i < rows.length; i++) {
            const row = $(rows[i]);
            const img = row.find("img[vehicle_type_id]");

            if (img.length > 0) {
                const typeId = parseInt(img.attr("vehicle_type_id"));
                if (vehicleConfig.has(typeId)) {
                    const targetMax = vehicleConfig.get(typeId);
                    const vehicleLink = row.find("a[href^='/vehicles/']").first().attr("href");
                    if (!vehicleLink) continue;

                    const vehicleId = vehicleLink.match(/\d+/)[0];
                    const currentMax = parseInt(row.find("td:nth-last-child(2)").text().trim()) ||
                                       parseInt(row.find("td").eq(5).text().trim());

                    if (currentMax !== targetMax) {
                        count++;
                        $("#changeMaxPerson").text(`Blitzeinsatz... (${count})`);

                        await $.post(`/vehicles/${vehicleId}`, {
                            "vehicle": { "personal_max": targetMax },
                            "_method": "put",
                            "authenticity_token": csrfToken
                        });

                        // Tabelle sofort anpassen, kein Reload nötig
                        row.find("td:nth-last-child(2)").text(targetMax);

                        await new Promise(r => setTimeout(r, 50));
                    }
                }
            }
        }

        $("#changeMaxPerson").text(`Erfolgreich angepasst (${count})`).removeClass("btn-warning").addClass("btn-success").prop("disabled", false);
    }
})();
