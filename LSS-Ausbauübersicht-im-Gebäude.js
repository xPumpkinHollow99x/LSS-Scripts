// ==UserScript==
// @name         LSS Ausbauübersicht im Gebäude
// @namespace    PumpkinHollow
// @version      4.4
// @description  Ausbauten werden wie im LSSM v4 abgebildet
// @match        https://www.leitstellenspiel.de/buildings/*
// @match        https://polizei.leitstellenspiel.de/buildings/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Ausbauübersicht-im-Gebäude.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Ausbauübersicht-im-Gebäude.js
// @icon          https://github.com/xPumpkinHollow99x/Bilder/blob/main/pumpkin_hollow_lane_centered.png
// ==/UserScript==

(function () {
    'use strict';

    const statusEntries = [];

    // -----------------------------
    // GLOBAL STYLE SYSTEM
    // -----------------------------
    const style = document.createElement('style');
    style.textContent = `
        /* NAME STYLE */
        .ph-name {
            font-size: 14px !important;
            font-weight: 700 !important;
            line-height: 1.42857143 !important;
        }

        .ph-subname {
            font-size: 14px !important;
            font-weight: 700 !important;
            line-height: 1.42857143 !important;
            color: #cfd3dc;
        }

        /* STATUS STYLE */
        .ph-status {
            font-size: 75% !important;
            font-weight: 700 !important;
            line-height: 1 !important;
        }
    `;
    document.head.appendChild(style);

    // -----------------------------
    // TIMER FORMAT (LSS STYLE)
    // -----------------------------
    function formatRemaining(ms) {

        if (ms <= 0) return 'Fertig';

        const totalSec = Math.floor(ms / 1000);

        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;

        const time =
            `${hours.toString().padStart(2, '0')}:` +
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}`;

        if (days === 1) return `1 Tag - ${time}`;
        if (days > 1) return `${days} Tage - ${time}`;

        return time;
    }

    // -----------------------------
    // STATUS
    // -----------------------------
    function getStatus(row) {

        const timer = row.querySelector('.extension-timer');

        if (timer) {
            const end = timer.dataset.endTime;
            if (end) return Number(end);
            return timer.textContent.trim();
        }

        if (row.querySelector('.label-success')) return 'Einsatzbereit';
        if (row.querySelector('.label-danger')) return 'Nicht einsatzbereit';

        return 'Nicht gebaut';
    }

    // -----------------------------
    // LABEL
    // -----------------------------
    function createLabel(text) {

        const span = document.createElement('span');

        span.classList.add('label', 'ph-status');

        span.style.cssText = `
            display:inline-flex;
            align-items:center;
            justify-content:center;
            height:20px;
            padding:0 6px;
            white-space:nowrap;
        `;

        span.textContent = text;

        if (text === 'Einsatzbereit') span.classList.add('label-success');
        else if (text === 'Nicht einsatzbereit') span.classList.add('label-danger');
        else if (text === 'Nicht gebaut') span.classList.add('label-default');
        else span.classList.add('label-warning');

        return span;
    }

    // -----------------------------
    // NAME SPLIT
    // -----------------------------
    function getNameParts(row) {

        const bold = row.querySelector('td:first-child b');
        if (!bold) return { line1: '', line2: '' };

        const text = bold.textContent.trim();

        if (text.includes(':')) {

            const parts = text.split(':');

            return {
                line1: (parts[0] || '').trim() + ':',
                line2: (parts.slice(1).join(':') || '').trim()
            };
        }

        return {
            line1: text.endsWith(':') ? text : text + ':',
            line2: ''
        };
    }

    // -----------------------------
    // ITEM BUILDER
    // -----------------------------
    function buildItem(row) {

        const status = getStatus(row);
        const { line1, line2 } = getNameParts(row);

        const item = document.createElement('div');

        item.style.cssText = `
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            padding:2px 0;
            min-height:20px;
        `;

        const nameSpan = document.createElement('span');

        nameSpan.innerHTML = `
            <div class="ph-name">${line1}</div>
            ${line2 ? `<div class="ph-subname">${line2}</div>` : ''}
        `;

        nameSpan.style.cssText = `
            flex:1;
            text-align:right;
            color:#e6e6e6;
            min-width:0;
        `;

        const statusWrap = document.createElement('div');

        statusWrap.style.cssText = `
            min-width:140px;
            display:flex;
            justify-content:flex-end;
            align-items:center;
            height:20px;
        `;

        const label = createLabel(
            typeof status === 'number'
                ? formatRemaining(status - Date.now())
                : status
        );

        statusWrap.appendChild(label);

        item.appendChild(nameSpan);
        item.appendChild(statusWrap);

        statusEntries.push({
            row,
            label,
            status
        });

        return item;
    }

    // -----------------------------
    // LIVE TIMER UPDATE
    // -----------------------------
    function updateTimers() {

        const now = Date.now();

        for (const entry of statusEntries) {

            if (typeof entry.status === 'number') {

                const diff = entry.status - now;

                entry.label.textContent = formatRemaining(diff);

                if (diff <= 0) {
                    entry.label.className = 'label ph-status label-success';
                    entry.label.textContent = 'Einsatzbereit';
                } else {
                    entry.label.className = 'label ph-status label-warning';
                }
            }
        }
    }

    // -----------------------------
    // INIT
    // -----------------------------
    function init() {

        const dl = document.querySelector('dl.dl-horizontal');
        const table = document.querySelector('#ausbauten table');

        if (!dl || !table) return false;
        if (document.getElementById('ph-final-v43')) return true;

        const rows = [...table.querySelectorAll('tbody tr')]
            .filter(r => r.querySelector('td:first-child'));

        if (!rows.length) return false;

        const wrapper = document.createElement('div');
        wrapper.id = 'ph-final-v43';

        wrapper.style.cssText = `
            display:flex;
            gap:18px;
            align-items:flex-start;
        `;

        dl.parentNode.insertBefore(wrapper, dl);
        wrapper.appendChild(dl);

        const right = document.createElement('div');

        right.style.cssText = `
            min-width:520px;
            font-size:14px;
        `;

        const header = document.createElement('div');

        header.textContent = 'Ausbauten:';

        header.style.cssText = `
            width:160px;
            height:20px;
            display:flex;
            justify-content:flex-end;
            align-items:center;
            font-weight:700;
            color:#e6e6e6;
        `;

        right.appendChild(header);

        const cols = rows.length > 18 ? 3 : 2;
        const perCol = Math.ceil(rows.length / cols);

        const columns = Array.from({ length: cols }, () => []);

        rows.forEach((row, index) => {
            const colIndex = Math.floor(index / perCol);
            columns[Math.min(colIndex, cols - 1)].push(row);
        });

        const grid = document.createElement('div');

        grid.style.cssText = `
            display:grid;
            grid-template-columns: repeat(${cols}, 1fr);
            gap:0 40px;
            align-items:start;
        `;

        columns.forEach(colRows => {

            const col = document.createElement('div');

            col.style.cssText = `
                display:flex;
                flex-direction:column;
                gap:0;
            `;

            colRows.forEach(row => {
                col.appendChild(buildItem(row));
            });

            grid.appendChild(col);
        });

        right.appendChild(grid);
        wrapper.appendChild(right);

        setInterval(updateTimers, 1000);

        return true;
    }

    const starter = setInterval(() => {
        if (init()) clearInterval(starter);
    }, 500);

})();
