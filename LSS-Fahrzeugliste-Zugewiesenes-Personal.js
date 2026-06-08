// ==UserScript==
// @name         LSS Fahrzeugliste: Zugewiesenes Personal
// @namespace    PumpkinHollow
// @version      1.1
// @description  Zeigt in der Fahrzeugliste einer Wache zugewiesenes Personal als "zugewiesen / max" an.
// @match        https://www.leitstellenspiel.de/buildings/*
// @match        https://polizei.leitstellenspiel.de/buildings/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Fahrzeugliste-Zugewiesenes-Personal.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Fahrzeugliste-Zugewiesenes-Personal.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (window.__lssAssignedVehiclePersonnelLoadedV1) return;
    window.__lssAssignedVehiclePersonnelLoadedV1 = true;

    const SCRIPT_PREFIX = '[LSS zugewiesenes Personal]';
    const CACHE_TTL_MS = 5 * 60 * 1000;
    const MAX_PARALLEL_REQUESTS = 4;

    let cache = {};
    let runToken = 0;
    let pendingTimer = null;
    let internalUpdateTimer = null;
    let isInternalUpdate = false;

    function writeCache() {
        // Werte werden absichtlich nur im aktuellen Seitenlauf gehalten.
        // So zeigt ein Reload direkt geaenderte Personalzuweisungen an.
    }

    function markInternalUpdate() {
        isInternalUpdate = true;
        window.clearTimeout(internalUpdateTimer);
        internalUpdateTimer = window.setTimeout(() => {
            isInternalUpdate = false;
        }, 50);
    }

    function getCached(vehicleId) {
        const entry = cache[vehicleId];
        if (!entry || Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
        return entry;
    }

    function setCached(vehicleId, data) {
        cache[vehicleId] = {
            assigned: data.assigned,
            max: data.max,
            timestamp: Date.now()
        };
        writeCache();
    }

    function scheduleEnhancement() {
        window.clearTimeout(pendingTimer);
        pendingTimer = window.setTimeout(enhanceVehicleTable, 150);
    }

    function getVehicleId(row) {
        const links = Array.from(row.querySelectorAll('a[href*="/vehicles/"]'));
        for (const link of links) {
            const match = link.href.match(/\/vehicles\/(\d+)(?:[/?#]|$)/);
            if (match) return match[1];
        }
        return null;
    }

    function findMaxCrewHeader(table) {
        const headers = Array.from(table.querySelectorAll('thead th'));
        return headers.find(header => {
            const label = `${header.textContent || ''} ${header.getAttribute('aria-label') || ''}`.toLowerCase();
            return label.includes('besatzung (maximal)') ||
                label.includes('(max)') ||
                header.dataset.column === '5';
        }) || null;
    }

    function getCellText(cell) {
        return String(cell?.dataset?.lssAssignedOriginalMax || cell?.textContent || '').trim();
    }

    function getNumericText(value) {
        const match = String(value || '').match(/\d+/);
        return match ? Number.parseInt(match[0], 10) : null;
    }

    function setHeader(header) {
        if (header.dataset.lssAssignedHeader === '1') return;
        markInternalUpdate();
        header.dataset.lssAssignedHeader = '1';
        header.title = 'Zugewiesenes Personal / maximale Besatzung';
        header.setAttribute('aria-label', 'Zugewiesenes Personal / maximale Besatzung');
        header.textContent = 'zugew. / max';
    }

    function setLoading(cell) {
        const max = getCellText(cell) || '?';
        if (cell.dataset.lssAssignedState === 'loading' && cell.dataset.lssAssignedOriginalMax === max) return;

        markInternalUpdate();
        cell.dataset.lssAssignedOriginalMax = max;
        cell.dataset.lssAssignedState = 'loading';
        cell.innerHTML = '';

        const wrapper = document.createElement('span');
        wrapper.className = 'lss-assigned-personnel-value lss-assigned-personnel-loading';
        wrapper.title = 'Zugewiesenes Personal wird geladen';
        wrapper.textContent = `... / ${max}`;
        cell.appendChild(wrapper);
    }

    function setError(cell) {
        const max = getCellText(cell) || '?';
        if (cell.dataset.lssAssignedState === 'error' && cell.dataset.lssAssignedOriginalMax === max) return;

        markInternalUpdate();
        cell.dataset.lssAssignedState = 'error';
        cell.innerHTML = '';

        const wrapper = document.createElement('span');
        wrapper.className = 'lss-assigned-personnel-value lss-assigned-personnel-error';
        wrapper.title = 'Zugewiesenes Personal konnte nicht geladen werden';
        wrapper.textContent = `? / ${max}`;
        cell.appendChild(wrapper);
    }

    function setPersonnelValue(cell, data) {
        const originalMax = getCellText(cell);
        const max = Number.isFinite(data.max) ? data.max : getNumericText(originalMax);
        const assigned = Number.isFinite(data.assigned) ? data.assigned : null;
        const assignedText = assigned === null ? '?' : String(assigned);
        const maxText = String(max ?? originalMax ?? '?');

        if (
            cell.dataset.lssAssignedState === 'done' &&
            cell.dataset.lssAssignedAssigned === assignedText &&
            cell.dataset.lssAssignedMax === maxText
        ) {
            return;
        }

        markInternalUpdate();
        cell.dataset.lssAssignedOriginalMax = maxText;
        cell.dataset.lssAssignedProcessed = '1';
        cell.dataset.lssAssignedState = 'done';
        cell.dataset.lssAssignedAssigned = assignedText;
        cell.dataset.lssAssignedMax = maxText;
        cell.setAttribute('data-text', String(assigned ?? -1));
        cell.innerHTML = '';

        const wrapper = document.createElement('span');
        wrapper.className = 'lss-assigned-personnel-value';
        wrapper.title = 'Zugewiesenes Personal / maximale Besatzung';

        const assignedSpan = document.createElement('span');
        assignedSpan.className = 'lss-assigned-personnel-assigned';
        assignedSpan.textContent = assignedText;

        if (assigned !== null && Number.isFinite(max)) {
            assignedSpan.classList.add(assigned >= max ? 'is-full' : 'is-understaffed');
        }

        const separator = document.createElement('span');
        separator.className = 'lss-assigned-personnel-separator';
        separator.textContent = ' / ';

        const maxSpan = document.createElement('span');
        maxSpan.className = 'lss-assigned-personnel-max';
        maxSpan.textContent = maxText;

        wrapper.append(assignedSpan, separator, maxSpan);
        cell.appendChild(wrapper);
    }

    function countAssignedVehicleLinks(doc, vehicleId) {
        if (!vehicleId) return null;

        return Array.from(doc.querySelectorAll('#personal_table tbody tr'))
            .filter(row => {
                const vehicleLink = row.querySelector('td:nth-child(3) a[href*="/vehicles/"]');
                if (!vehicleLink) return false;

                return new URL(vehicleLink.href, window.location.origin).pathname === `/vehicles/${vehicleId}`;
            })
            .length;
    }

    function parsePersonnelPage(html, fallbackMax) {
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const assigned = doc.querySelectorAll('.btn-assigned').length;

        let max = fallbackMax;

        const counterElement = doc.getElementById('count_personal');

        if (counterElement) {
            const navbarText = counterElement.closest('.navbar-text');

            if (navbarText) {
                const labels = navbarText.querySelectorAll('.label');

                if (labels.length > 0) {
                    max = getNumericText(labels[0].textContent) ?? fallbackMax;
                }
            }
        }

        console.log('LSS Personal', {
            assigned,
            max
        });

        return {
            assigned,
            max
        };
    }

    async function fetchPersonnel(vehicleId, fallbackMax) {
        const cached = getCached(vehicleId);
        if (cached) return cached;

        const response = await fetch(`/vehicles/${vehicleId}/zuweisung`, {
            credentials: 'same-origin',
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = parsePersonnelPage(await response.text(), fallbackMax);
        setCached(vehicleId, data);
        return data;
    }

    async function runQueue(items, token) {
        let index = 0;

        async function worker() {
            while (index < items.length && token === runToken) {
                const item = items[index++];
                try {
                    const data = await fetchPersonnel(item.vehicleId, item.fallbackMax);
                    if (token !== runToken) return;
                    setPersonnelValue(item.cell, data);
                } catch (error) {
                    console.warn(`${SCRIPT_PREFIX} Fehler bei Fahrzeug ${item.vehicleId}:`, error);
                    if (token !== runToken) return;
                    setError(item.cell);
                }
            }
        }

        await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_REQUESTS, items.length) }, worker));
    }

    function collectRows(table, maxColumnIndex) {
        return Array.from(table.querySelectorAll('tbody tr'))
            .filter(row => row.offsetParent !== null)
            .map(row => {
                const vehicleId = getVehicleId(row);
                const cell = row.children[maxColumnIndex];
                if (!vehicleId || !cell) return null;

                const fallbackMax = getNumericText(getCellText(cell));
                return { vehicleId, cell, fallbackMax };
            })
            .filter(Boolean);
    }

    async function enhanceVehicleTable() {
        const table = document.getElementById('vehicle_table');
        if (!table) return;

        const maxHeader = findMaxCrewHeader(table);
        if (!maxHeader) return;

        const maxColumnIndex = maxHeader.cellIndex;
        if (maxColumnIndex < 0) return;

        setHeader(maxHeader);
        addStyle();

        const token = ++runToken;
        const items = collectRows(table, maxColumnIndex);
        const uncachedItems = [];

        for (const item of items) {
            if (!item.cell.dataset.lssAssignedOriginalMax) {
                item.cell.dataset.lssAssignedOriginalMax = getCellText(item.cell);
            }

            const cached = getCached(item.vehicleId);
            if (cached) {
                setPersonnelValue(item.cell, cached);
            } else {
                setLoading(item.cell);
                uncachedItems.push(item);
            }
        }

        if (uncachedItems.length > 0) {
            await runQueue(uncachedItems, token);
        }
    }

    function addStyle() {
        if (document.getElementById('lssAssignedVehiclePersonnelStyle')) return;

        markInternalUpdate();
        const style = document.createElement('style');
        style.id = 'lssAssignedVehiclePersonnelStyle';
        style.textContent = `
            #vehicle_table .lss-assigned-personnel-value {
                display: inline-flex;
                align-items: baseline;
                justify-content: center;
                min-width: 4.4em;
                font-weight: 600;
                white-space: nowrap;
            }

            #vehicle_table .lss-assigned-personnel-assigned.is-full {
                color: #3c763d;
            }

            #vehicle_table .lss-assigned-personnel-assigned.is-understaffed,
            #vehicle_table .lss-assigned-personnel-error {
                color: #a94442;
            }

            #vehicle_table .lss-assigned-personnel-loading {
                color: #777;
            }
        `;
        document.head.appendChild(style);
    }

    function observePage() {
        const observer = new MutationObserver(() => {
            if (isInternalUpdate) return;
            scheduleEnhancement();
        });
        observer.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true
        });
    }

    scheduleEnhancement();
    observePage();
})();
