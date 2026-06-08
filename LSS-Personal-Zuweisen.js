// ==UserScript==
// @name         LSS Personal Zuweisen
// @namespace    PumpkinHollow
// @version      0.9
// @description  Weist von der Gebäude-Seite aus Personal allen Fahrzeugen zu
// @match        https://www.leitstellenspiel.de/buildings/*
// @match        https://polizei.leitstellenspiel.de/buildings/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Personal-Zuweisen.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Personal-Zuweisen.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const settings = {
        autoStart: false,
        vehicleDelayMs: 120,
        clickDelayMs: 80,
        rowClickDelayMs: 10,
        iframeTimeoutMs: 12000,
        reloadAfterFinish: true,
        reloadDelayMs: 800,
    };

    const list = [
        ["0","",1],// LF 20
        ["30","",1],// HLF 20
        ["14","",1],// SW 2000
        ["2","",1],// DLK 23/12
        ["3","",1],// ELW 1
        ["4","",1],// RW
        ["5","",1],// GW-A
        ["10","",1],// GW-Öl
        ["12","Messtechnik",3],// GW-Mess
        ["27","GW-Gefahrgut",3],// GW-G
        ["33","Höhenrettung",9],// GW-H
        ["34","ELW 2",6],// ELW 2
        ["36","",1],// MTW
        ["53","Dekon-P",6],// Dekon-P
        ["57","Feuerwehrkran",2],// FwK
        ["114","",1],//GW-Lüfter
        ["128","Drohnen-Schulung",5],// ELW Drohne
        ["87","",1],// TLF 4000
        ["75","Flugfeldlöschfahrzeug-Ausbildung",3],// FLF
        ["76","Rettungstreppen-Ausbildung",2],// Rettungstreppe
        ["83","Werkfeuerwehr",9],// GW-Werk
        ["84","Werkfeuerwehr",3],// ULF mit Löscharm
        ["85","Werkfeuerwehr",3],// TM 50
        ["86","Werkfeuerwehr",3],// Turbolöscher
        ["105","",5],// GW-L2
        ["105","NEA200 Fortbildung",1],// GW-L2
        ["163","Bahnrettung",9],// HLF Schiene
        ["139","Verpflegungshelfer",2],// GW-Küche
        ["139","Feuerwehr-Verpflegungseinheit",1],// GW-Küche
        ["105","",1],// SLF

        ["35","Zugführer",3],["50","",1],["51","Hundertschaftsführer",3],["52","",1],
        ["72","Wasserwerfer",5],["165","Lautsprecheroperator",5],

        ["32","",1],["95","Motorradstaffel",1],["98","Kriminalpolizist",2],["103","Dienstgruppenleitung",2],
        ["156","Polizeihubschrauber",1],["79","SEK",4],["80","SEK",9],["81","MEK",4],["82","MEK",9],
        ["94","Hundeführer",2],["137","Reiterstaffel",6],

        ["28","",1],["29","Notarzt",1],["55","LNA",1],["56","Org",1],["73","",1],["74","Notarzt",1],
        ["157","Notarzt",1],["58","",1],["59","Einsatzleitung",2],["60","GW-San",6],
        ["91","Rettungshundeführer",5],["127","Drohnenoperator",4],["131","Betreuungshelfer",9],["133","Betreuungshelfer",1],["133","Verpflegungshelfer",2],
        ["63","GW-Wasserrettung",2],["64","GW-Wasserrettung",6],
        ["171","Technik und Sicherheit",5],["172","Technik und Sicherheit",6],["173","Technik und Sicherheit",7],

        ["39","",1],["41","",1],["40","Zugtrupp",4],["42","Fachgruppe Räumen",3],["45","Fachgruppe Räumen",6],
        ["93","Rettungshundeführer",5],["100","Fachgruppe Wasserschaden/Pumpen",7],
        ["123","Fachgruppe Wasserschaden/Pumpen",3],["109","FGr SB",9],["122","FGr E",3],["124","",1],
        ["125","Tr UL",4],["144","Fachzug Führung und Kommunikation",4],
        ["145","Fachzug Führung und Kommunikation",7],["147","Fachzug Führung und Kommunikation",7],
        ["148","Fachzug Führung und Kommunikation",4],["65","GW-Wasserrettung",2],["69","GW-Wasserrettung",2],["176","Verpflegungshelfer",2],["176","Logistik-Verpflegung",1],["177","Logistik-Verpflegung",5],
        ["181","Fachgruppe Brückenbau",9],["182","Kranführer",1],
    ];

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    function getBuildingId() {
        const match = window.location.pathname.match(/\/buildings\/(\d+)/);
        return match ? match[1] : null;
    }

    function getVehicleIdsFromPage() {
        const ids = new Set();

        $$('a[href*="/vehicles/"]').forEach(link => {
            const href = link.getAttribute('href') || '';
            const match = href.match(/\/vehicles\/(\d+)(?:[/?#]|$)/);
            if (match) ids.add(match[1]);
        });

        return [...ids];
    }

    function setStatus(text, color = '#fff') {
        const status = $('#turbo-building-status');
        if (status) {
            status.textContent = text;
            status.style.color = color;
        }
    }

    function setProgress(done, total) {
        const bar = $('#turbo-building-bar');
        if (!bar) return;

        const percent = total ? Math.round((done / total) * 100) : 0;
        bar.style.width = `${percent}%`;
        bar.textContent = `${percent}%`;
    }

    function addLog(text, type = 'info') {
        console.log(`[Building Turbo] ${text}`);

        const logBox = $('#turbo-building-log');
        if (!logBox) return;

        const line = document.createElement('div');
        line.textContent = text;

        if (type === 'error') line.style.color = '#d9534f';
        if (type === 'success') line.style.color = '#5cb85c';
        if (type === 'warn') line.style.color = '#f0ad4e';

        logBox.appendChild(line);
        logBox.scrollTop = logBox.scrollHeight;
    }

    async function fetchVehicle(vehicleId) {
        const response = await fetch(`/api/v2/vehicles/${vehicleId}`, {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`API-Fehler ${response.status}`);
        }

        const data = await response.json();
        return data.result || data;
    }

    function loadIframe(src) {
        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:absolute;left:-99999px;top:-99999px;width:1px;height:1px;border:0;';

            const timer = setTimeout(() => {
                iframe.remove();
                reject(new Error('Timeout beim Laden der Zuweisungsseite'));
            }, settings.iframeTimeoutMs);

            iframe.addEventListener('load', () => {
                clearTimeout(timer);
                resolve(iframe);
            }, { once: true });

            iframe.src = src;
            document.body.appendChild(iframe);
        });
    }

    async function waitFor(condition, timeoutMs = 8000) {
        const start = Date.now();

        while (Date.now() - start < timeoutMs) {
            const result = condition();
            if (result) return result;
            await sleep(50);
        }

        throw new Error('Timeout beim Warten auf die Personal-Tabelle');
    }

    async function processVehicle(vehicleId, buildingId) {
        const vehicle = await fetchVehicle(vehicleId);
        const vehicleName = vehicle.caption || vehicle.name || `Fahrzeug ${vehicleId}`;

        if (buildingId && vehicle.building_id && String(vehicle.building_id) !== String(buildingId)) {
            return { status: 'skipped', message: `${vehicleName}: anderes Gebäude` };
        }

        const personGoal = list.filter(goal => String(goal[0]) === String(vehicle.vehicle_type));

        if (!personGoal.length) {
            return { status: 'skipped', message: `${vehicleName}: Fahrzeugtyp ${vehicle.vehicle_type} nicht in Liste` };
        }

        const iframe = await loadIframe(`/vehicles/${vehicleId}/zuweisung`);

        try {
            const doc = iframe.contentDocument;
            await waitFor(() => $('#personal_table tbody', doc));
            await sleep(250);

            const rows = $$('#personal_table tbody tr', doc);
            const curSelected = new Array(personGoal.length).fill(0);
            const maxNeeded = personGoal.map(goal => goal[2]);

            const getGoalIndex = row => {
                const trainText = row.cells[1] ? row.cells[1].textContent.trim() : '';

                return personGoal.findIndex(goal =>
                    (goal[1] !== '' && trainText.includes(goal[1])) ||
                    (goal[1] === '' && trainText === '')
                );
            };

            let added = 0;
            let removed = 0;

            for (const row of rows) {
                const goalIdx = getGoalIndex(row);
                const assignedBtn = $('.btn-assigned', row);

                if (assignedBtn) {
                    if (goalIdx !== -1) {
                        curSelected[goalIdx]++;
                    } else {
                        assignedBtn.click();
                        removed++;
                        await sleep(settings.rowClickDelayMs);
                    }
                }
            }

            await sleep(settings.clickDelayMs);

            for (const row of rows) {
                const goalIdx = getGoalIndex(row);
                const alreadyAssigned = $('.btn-assigned', row);
                const assignBtn = $('.btn-success', row);
                const rowText = row.textContent;
                const isBusy =
                      rowText.includes('Im Unterricht') ||
                      rowText.includes('Abwesend') ||
                      rowText.includes('Nicht verfügbar') ||
                      rowText.includes('Wird verschoben');

                if (
                    goalIdx !== -1 &&
                    curSelected[goalIdx] < maxNeeded[goalIdx] &&
                    assignBtn &&
                    !alreadyAssigned &&
                    !isBusy
                ) {
                    assignBtn.click();

                    try {
                        await waitFor(() => $('.btn-assigned', row), 1500);

                        curSelected[goalIdx]++;
                        added++;
                    } catch {
                        addLog(`Klick nicht übernommen bei ${vehicleName}`, 'warn');
                    }

                    await sleep(settings.rowClickDelayMs);
                }
            }

            await sleep(settings.clickDelayMs);

            const missing = personGoal
                .map((goal, index) => ({
                    training: goal[1] || 'ohne Ausbildung',
                    count: maxNeeded[index] - curSelected[index],
                }))
                .filter(item => item.count > 0);

            if (missing.length) {
                const text = missing.map(item => `${item.count}x ${item.training}`).join(', ');
                return { status: 'insufficient', message: `${vehicleName}: nicht genug Personal (${text})` };
            }

            if (added === 0 && removed === 0) {
                return {
                    status: 'alreadyCorrect',
                    message: `${vehicleName}: bereits korrekt besetzt`,
                };
            }

            return {
                status: 'assigned',
                message: `${vehicleName}: ${added} hinzugefügt, ${removed} entfernt`,
            };
        } finally {
            iframe.remove();
        }
    }

    async function runBuildingAssignment() {
        const button = $('#btnAssignBuildingTurbo');
        const logBox = $('#turbo-building-log');
        const buildingId = getBuildingId();
        const vehicleIds = getVehicleIdsFromPage();

        if (logBox) logBox.innerHTML = '';

        if (!vehicleIds.length) {
            setStatus('Keine Fahrzeuge auf der Seite gefunden.', '#d9534f');
            return;
        }

        button.disabled = true;
        button.classList.add('disabled');
        button.textContent = 'Arbeite...';

        const stats = {
            assigned: 0,
            alreadyCorrect: 0,
            skipped: 0,
            insufficient: 0,
            failed: 0,
        };

        setProgress(0, vehicleIds.length);
        setStatus(`${vehicleIds.length} Fahrzeuge gefunden. Starte...`);

        for (let i = 0; i < vehicleIds.length; i++) {
            const vehicleId = vehicleIds[i];

            setStatus(`Bearbeite Fahrzeug ${i + 1}/${vehicleIds.length}: ${vehicleId}`);

            try {
                const result = await processVehicle(vehicleId, buildingId);
                stats[result.status] = (stats[result.status] || 0) + 1;

                const type =
                    result.status === 'assigned' ? 'success' :
                    result.status === 'alreadyCorrect' ? 'success' :
                    result.status === 'insufficient' ? 'warn' :
                    'info';

                addLog(result.message, type);
            } catch (error) {
                stats.failed++;
                addLog(`Fahrzeug ${vehicleId}: Fehler - ${error.message}`, 'error');
            }

            setProgress(i + 1, vehicleIds.length);
            await sleep(settings.vehicleDelayMs);
        }

        setStatus(
            `Fertig: ${stats.assigned} bearbeitet, ${stats.alreadyCorrect} bereits korrekt, ${stats.skipped} übersprungen, ${stats.insufficient} unvollständig, ${stats.failed} Fehler`,
            stats.failed || stats.insufficient ? '#f0ad4e' : '#5cb85c'
        );

        button.disabled = false;
        button.classList.remove('disabled');
        button.textContent = 'Personal für alle Fahrzeuge zuweisen';

        if (settings.reloadAfterFinish) {
            addLog(`Seite wird in ${Math.round(settings.reloadDelayMs / 1000)} Sek. neu geladen...`, 'info');
            setTimeout(() => window.location.reload(), settings.reloadDelayMs);
        }
    }

    function createUi() {
        if ($('#turbo-building-ui')) return;

        const container = document.createElement('div');
        container.id = 'turbo-building-ui';
        container.style.cssText = 'background:#333;padding:10px;border-radius:5px;margin:10px 0;border:1px solid #444;';

        container.innerHTML = `
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <button id="btnAssignBuildingTurbo" class="btn btn-success">Personal für alle Fahrzeuge zuweisen</button>
                <button id="btnAssignBuildingRefresh" class="btn btn-default">Fahrzeuge neu suchen</button>
                <span id="turbo-building-status" style="margin-left:8px;color:#fff;font-weight:bold;">Bereit</span>
            </div>
            <div style="margin-top:8px;height:18px;background:#222;border-radius:4px;overflow:hidden;">
                <div id="turbo-building-bar" style="height:100%;width:0%;background:#5cb85c;color:#fff;text-align:center;font-size:12px;line-height:18px;">0%</div>
            </div>
            <div id="turbo-building-log" style="margin-top:8px;max-height:220px;overflow:auto;background:#222;color:#eee;padding:6px;font-size:12px;font-family:monospace;"></div>
        `;

        const target = document.querySelector('h1') || document.body.firstElementChild || document.body;
        target.after(container);

        $('#btnAssignBuildingTurbo').addEventListener('click', event => {
            event.preventDefault();
            runBuildingAssignment();
        });

        $('#btnAssignBuildingRefresh').addEventListener('click', event => {
            event.preventDefault();
            const count = getVehicleIdsFromPage().length;
            setStatus(`${count} Fahrzeuge auf der Seite gefunden.`);
        });

        setStatus(`${getVehicleIdsFromPage().length} Fahrzeuge auf der Seite gefunden.`);

        if (settings.autoStart) {
            setTimeout(runBuildingAssignment, 800);
        }
    }

    createUi();
})();
