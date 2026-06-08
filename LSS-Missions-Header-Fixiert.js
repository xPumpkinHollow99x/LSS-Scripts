// ==UserScript==
// @name         LSS Missions Header Fixiert
// @namespace    PumpkinHollow
// @version      1.2
// @description  Sticky Missions Header mit zuverlässiger Darkmode-Erkennung (LSS Farb-Basis)
// @match        https://www.leitstellenspiel.de/missions/*
// @match        https://polizei.leitstellenspiel.de/missions/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Missions-Header-Fixiert.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Missions-Header-Fixiert.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const DARK_COLOR = 'rgb(66, 66, 66)'; // #424242

    function detectDarkMode(header) {
        if (!header) return false;

        const bg = window.getComputedStyle(header).backgroundColor;

        return bg === DARK_COLOR;
    }

    function applyHeaderStyle() {
        const header = document.querySelector('.mission_header_info');
        if (!header) return;

        const dark = detectDarkMode(header);

        header.style.position = 'fixed';
        header.style.top = '0';
        header.style.left = '0';
        header.style.right = '0';
        header.style.zIndex = '9999';
        header.style.padding = '10px 15px';

        if (dark) {
            header.style.background = '#424242';   // exakt LSS Darkmode
            header.style.color = '#eaeaea';
            header.style.borderBottom = '1px solid #2f2f2f';
            header.style.boxShadow = '0 2px 8px rgba(0,0,0,0.6)';
        } else {
            header.style.background = '#ffffff';
            header.style.color = '#333';
            header.style.borderBottom = '1px solid #ddd';
            header.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
        }

        document.body.style.paddingTop = header.offsetHeight + 'px';
    }

    function init() {
        applyHeaderStyle();
    }

    const observer = new MutationObserver(() => {
        applyHeaderStyle();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    setInterval(applyHeaderStyle, 2000);

    init();
})();
