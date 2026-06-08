// ==UserScript==
// @name         LSS Kreisgrenzen
// @namespace    PumpkinHollow
// @version      2.5
// @description  Fügt Kreisgrenzen auf der Karte ein.
// @match        https://www.leitstellenspiel.de/
// @match        https://www.leitstellenspiel.de/profile/*
// @match        https://polizei.leitstellenspiel.de/
// @match        https://polizei.leitstellenspiel.de/profile/*
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Kreisgrenzen.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Kreisgrenzen.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    'use strict';

    const pageWindow = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;

    if (pageWindow.__lssKreisgrenzenLoadedV232) return;
    pageWindow.__lssKreisgrenzenLoadedV232 = true;

    const STORAGE_KEY = 'LSS_KREISGRENZEN';
    const STYLE_ID = 'lss-kreisgrenzen-style';
    const CSS_ID = 'lss-kreisgrenzen-tree-css';
    const SCRIPT_ID = 'lss-kreisgrenzen-tree-js';
    const MODAL_ID = 'kreise-modal';
    const SELECT_ID = 'kreise-selection';
    const STATUS_ID = 'kreise-status';

    const GEOJSON_URL = 'https://cdn.jsdelivr.net/gh/jalibu/LSHeat@master/kreise.json';
    const ICON_URL = 'https://cdn.jsdelivr.net/gh/jalibu/LSHeat@master/icons8-germany-map-50.png';
    const TREE_CSS_URL = 'https://cdn.jsdelivr.net/gh/patosai/tree-multiselect.js@v2.6.3/dist/jquery.tree-multiselect.min.css';
    const TREE_JS_URL = 'https://cdn.jsdelivr.net/npm/tree-multiselect@2.6.3/dist/jquery.tree-multiselect.min.js';

    const BORDER_STYLE = Object.freeze({
        weight: 2,
        fillOpacity: 0.05
    });

    const GERMAN_COLLATOR = new Intl.Collator('de', {
        numeric: true,
        sensitivity: 'base'
    });

    const STATE_ORDER = Object.freeze([
        'Baden-Württemberg',
        'Bayern',
        'Berlin',
        'Brandenburg',
        'Bremen',
        'Hamburg',
        'Hessen',
        'Mecklenburg-Vorpommern',
        'Niedersachsen',
        'Nordrhein-Westfalen',
        'Rheinland-Pfalz',
        'Saarland',
        'Sachsen',
        'Sachsen-Anhalt',
        'Schleswig-Holstein',
        'Thüringen'
    ]);

    const STATE_ORDER_INDEX = new Map(STATE_ORDER.map((state, index) => [state, index]));

    const DISPLAY_NAME_OVERRIDES = Object.freeze({
        'Baden-Wuerttemberg': 'Baden-Württemberg',
        'Baden-Wurttemberg': 'Baden-Württemberg',
        'Baden Wuerttemberg': 'Baden-Württemberg',
        'Baden Wurttemberg': 'Baden-Württemberg',
        'Baden Württemberg': 'Baden-Württemberg',
        Bavaria: 'Bayern',
        'Free State of Bavaria': 'Bayern',
        Hesse: 'Hessen',
        'Lower-Saxony': 'Niedersachsen',
        'Lower Saxony': 'Niedersachsen',
        'Mecklenburg-Western-Pomerania': 'Mecklenburg-Vorpommern',
        'Mecklenburg-Western Pomerania': 'Mecklenburg-Vorpommern',
        'Mecklenburg Western Pomerania': 'Mecklenburg-Vorpommern',
        'Mecklenburg Western-Pomerania': 'Mecklenburg-Vorpommern',
        'Mecklenburg-West Pomerania': 'Mecklenburg-Vorpommern',
        'Mecklenburg West Pomerania': 'Mecklenburg-Vorpommern',
        'North-Rhine-Westphalia': 'Nordrhein-Westfalen',
        'North Rhine-Westphalia': 'Nordrhein-Westfalen',
        'North Rhine Westphalia': 'Nordrhein-Westfalen',
        'Nordrhein Westfalen': 'Nordrhein-Westfalen',
        'Rhineland-Palatinate': 'Rheinland-Pfalz',
        'Rhineland Palatinate': 'Rheinland-Pfalz',
        'Rheinland Pfalz': 'Rheinland-Pfalz',
        Saxony: 'Sachsen',
        'Free State of Saxony': 'Sachsen',
        'Saxony-Anhalt': 'Sachsen-Anhalt',
        'Saxony Anhalt': 'Sachsen-Anhalt',
        'Sachsen Anhalt': 'Sachsen-Anhalt',
        'Schleswig Holstein': 'Schleswig-Holstein',
        Thueringen: 'Thüringen',
        Thuringia: 'Thüringen',
        'Free State of Thuringia': 'Thüringen'
    });

    const DISPLAY_NAME_REPLACEMENTS = Object.freeze([
        [/\bHeilbronn city\b/g, 'Heilbronn'],
        [/\bFrankfurt am Oder\b/g, 'Frankfurt (Oder)'],
        [/\bKoblenz Coblenz\b/g, 'Koblenz'],
        [/\bCologne\b/g, 'Köln'],
        [/\bMunich\b/g, 'München'],
        [/\bMunster\b/g, 'Münster'],
        [/\bNuremberg\b/g, 'Nürnberg'],
        [/\bHanover\b/g, 'Hannover'],
        [/\bDusseldorf\b/g, 'Düsseldorf'],
        [/\bDuesseldorf\b/g, 'Düsseldorf']
    ]);

    let $;
    let leafletMap;
    let boundaryLayer;
    let selectedIds = readSelectedIds();
    const featuresById = new Map();

    waitForGameMap()
        .then(init)
        .catch(error => console.warn('[LSS Kreisgrenzen] Initialisierung abgebrochen.', error));

    async function init(context) {
        $ = context.jQuery;
        leafletMap = context.map;
        boundaryLayer = pageWindow.L.layerGroup().addTo(leafletMap);

        injectStyles();
        loadCssOnce(CSS_ID, TREE_CSS_URL);
        createModal();
        addMapButton();

        try {
            setModalState('Kreisgrenzen werden geladen ...');
            const data = await loadGeoJson();
            buildSelection(data);
            renderSelectedLayers();
            await enhanceSelection();
            updateSelectionStatus();
        } catch (error) {
            console.error('[LSS Kreisgrenzen] Kreisgrenzen konnten nicht geladen werden.', error);
            setModalState('Kreisgrenzen konnten nicht geladen werden. Bitte später erneut versuchen.', true);
        }
    }

    function waitForGameMap() {
        return new Promise((resolve, reject) => {
            const startedAt = Date.now();
            const timer = window.setInterval(() => {
                const hasJQuery = Boolean(pageWindow.jQuery);
                const hasLeaflet = Boolean(pageWindow.L && pageWindow.L.Control && pageWindow.L.layerGroup);
                const hasMap = Boolean(pageWindow.map && typeof pageWindow.map.addControl === 'function');

                if (hasJQuery && hasLeaflet && hasMap && document.body && document.head) {
                    window.clearInterval(timer);
                    resolve({
                        jQuery: pageWindow.jQuery,
                        map: pageWindow.map
                    });
                    return;
                }

                if (Date.now() - startedAt > 15000) {
                    window.clearInterval(timer);
                    reject(new Error('Leaflet-Karte nicht gefunden.'));
                }
            }, 250);
        });
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${MODAL_ID} {
                display: none;
                position: absolute;
                z-index: 99999;
                top: 20px;
                left: 50%;
                width: min(980px, calc(100vw - 40px));
                max-height: calc(100vh - 40px);
                transform: translateX(-50%);
                background: #fff;
                border: 1px solid #bbb;
                box-shadow: 0 12px 34px rgba(0, 0, 0, 0.28);
                color: #333;
            }

            #${MODAL_ID} .modal-body {
                max-height: calc(100vh - 205px);
                overflow: auto;
            }

            #${STATUS_ID} {
                margin: 0 0 10px;
                color: #555;
            }

            #${STATUS_ID}.is-error {
                color: #a94442;
            }

            #${SELECT_ID} {
                width: 100%;
                min-height: 360px;
            }

            #kreise-openBtn {
                width: 26px;
                height: 26px;
                background-color: #fff;
                background-image: url("${ICON_URL}");
                background-position: center;
                background-repeat: no-repeat;
                background-size: 20px 20px;
                cursor: pointer;
            }

            #kreise-openBtn:hover {
                background-color: #f4f4f4;
            }

            div.tree-multiselect {
                background: #fff;
                border: 1px solid #ddd;
                box-sizing: border-box;
                display: table;
                width: 100%;
            }

            div.tree-multiselect > div.selections,
            div.tree-multiselect > div.selected {
                box-sizing: border-box;
                display: table-cell;
                padding: 8px;
                vertical-align: top;
                width: 50%;
            }

            div.tree-multiselect input[type="text"].search {
                box-sizing: border-box;
                margin-bottom: 8px;
                width: 100%;
            }

            div.tree-multiselect div.section,
            div.tree-multiselect div.item {
                line-height: 1.35;
                margin: 2px 0;
            }

            div.tree-multiselect > div.selected > div.item {
                background: #777;
                color: #fff;
            }

            div.tree-multiselect div.section > div.item {
                background: #fff;
                color: #777;
            }
        `;
        document.head.appendChild(style);
    }

    function createModal() {
        if (document.getElementById(MODAL_ID)) return;

        const modal = $('<div>', {
            id: MODAL_ID,
            tabindex: '-1',
            role: 'dialog',
            'aria-labelledby': 'kreise-modal-title',
            'aria-hidden': 'true'
        });

        const header = $('<div>', { class: 'modal-header' });
        const closeTop = $('<button>', {
            type: 'button',
            class: 'close kreise-close',
            'aria-hidden': 'true',
            text: 'x'
        });
        const title = $('<h3>', {
            id: 'kreise-modal-title',
            text: 'Angezeigte Kreise'
        }).css('color', '#333');

        const body = $('<div>', {
            class: 'modal-body',
            id: 'kreise-modal-body'
        });

        const footer = $('<div>', { class: 'modal-footer' });
        const closeBottom = $('<button>', {
            type: 'button',
            class: 'btn kreise-close',
            text: 'Schließen'
        });
        const saveButton = $('<button>', {
            type: 'button',
            id: 'kreise-btn-save',
            class: 'btn btn-primary',
            text: 'Speichern'
        }).prop('disabled', true);

        header.append(closeTop, title);
        footer.append(closeBottom, saveButton);
        modal.append(header, body, footer);
        $('body').append(modal);

        $('.kreise-close').on('click', closeModal);
        saveButton.on('click', saveSelection);
        $(document).on('keydown.lssKreisgrenzen', event => {
            if (event.key === 'Escape') closeModal();
        });
    }

    function addMapButton() {
        if (document.getElementById('kreise-openBtn')) return;

        const KreisControl = pageWindow.L.Control.extend({
            options: {
                position: 'bottomleft'
            },
            onAdd: function () {
                const button = pageWindow.L.DomUtil.create(
                    'div',
                    'leaflet-bar leaflet-control leaflet-control-custom map-expand-button'
                );

                button.id = 'kreise-openBtn';
                button.title = 'Kreisgrenzen anzeigen';
                button.setAttribute('role', 'button');
                button.setAttribute('aria-label', 'Kreisgrenzen anzeigen');
                button.tabIndex = 0;

                pageWindow.L.DomEvent.disableClickPropagation(button);
                pageWindow.L.DomEvent.disableScrollPropagation(button);
                pageWindow.L.DomEvent.on(button, 'click', event => {
                    pageWindow.L.DomEvent.stop(event);
                    openModal();
                });
                pageWindow.L.DomEvent.on(button, 'keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        pageWindow.L.DomEvent.stop(event);
                        openModal();
                    }
                });

                return button;
            }
        });

        leafletMap.addControl(new KreisControl());
    }

    async function loadGeoJson() {
        const response = await fetch(GEOJSON_URL, {
            cache: 'force-cache',
            credentials: 'omit'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.features)) {
            throw new Error('Ungültiges GeoJSON.');
        }

        return data;
    }

    function buildSelection(data) {
        const select = $('<select>', {
            id: SELECT_ID,
            multiple: 'multiple'
        });

        featuresById.clear();

        const entries = data.features
            .filter(feature => feature && feature.id !== undefined && feature.id !== null)
            .map(feature => {
                const id = String(feature.id);
                const properties = feature.properties || {};

                return {
                    id,
                    feature,
                    state: getDisplayName(properties.NAME_1, 'Unbekannt'),
                    district: getDisplayName(properties.NAME_2, 'Ohne Bezirk'),
                    county: getDisplayName(properties.NAME_3, id)
                };
            })
            .sort(compareBoundaryEntries);

        for (const entry of entries) {
            featuresById.set(entry.id, entry.feature);

            const option = $('<option>', {
                value: entry.id,
                text: entry.county
            }).attr('data-section', `${entry.state}/${entry.district}`);

            if (selectedIds.has(entry.id)) {
                option.attr('selected', 'selected').prop('selected', true);
            }

            option.appendTo(select);
        }

        $('#kreise-modal-body').empty().append(
            $('<p>', { id: STATUS_ID }),
            select
        );

        select.on('change', () => {
            selectedIds = getCurrentSelectedIds();
            updateSelectionStatus();
        });

        $('#kreise-btn-save').prop('disabled', false);
    }

    async function enhanceSelection() {
        await loadScriptOnce(SCRIPT_ID, TREE_JS_URL, () => Boolean($.fn && $.fn.treeMultiselect));

        if (!$.fn || !$.fn.treeMultiselect) {
            throw new Error('treeMultiselect wurde nicht geladen.');
        }

        $(`#${SELECT_ID}`).treeMultiselect({
            searchable: true,
            startCollapsed: true,
            searchParams: ['section', 'text'],
            onChange: function () {
                selectedIds = getCurrentSelectedIds();
                updateSelectionStatus();
            }
        });

        $('.tree-multiselect').css('background', '#fff');
    }

    function saveSelection() {
        selectedIds = getCurrentSelectedIds();

        try {
            writeSelectedIds(selectedIds);
            const verifiedIds = readSelectedIds();

            if (!sameSet(selectedIds, verifiedIds)) {
                throw new Error('Gespeicherte Auswahl konnte nicht bestätigt werden.');
            }

            renderSelectedLayers();
            updateSelectionStatus();
            closeModal();
        } catch (error) {
            console.warn('[LSS Kreisgrenzen] Auswahl konnte nicht gespeichert werden.', error);
            setModalState('Auswahl konnte nicht gespeichert werden. Bitte Browser-Speicher prüfen.', true);
        }
    }

    function getCurrentSelectedIds() {
        const ids = new Set();
        const select = $(`#${SELECT_ID}`);

        for (const value of select.val() || []) {
            ids.add(String(value));
        }

        select.find('option:selected').each(function () {
            ids.add(String(this.value));
        });

        $(`#${MODAL_ID} div.tree-multiselect > div.selected div.item[data-value]`).each(function () {
            const value = $(this).attr('data-value');
            if (value !== undefined && value !== null && value !== '') {
                ids.add(String(value));
            }
        });

        $(`#${MODAL_ID} div.tree-multiselect input.option[type="checkbox"]:checked`).each(function () {
            const value = $(this).closest('div.item[data-value]').attr('data-value');
            if (value !== undefined && value !== null && value !== '') {
                ids.add(String(value));
            }
        });

        return ids;
    }

    function renderSelectedLayers() {
        if (!boundaryLayer) return;

        boundaryLayer.clearLayers();
        for (const id of selectedIds) {
            const feature = featuresById.get(id);
            if (feature) {
                pageWindow.L.geoJSON(feature, { style: BORDER_STYLE }).addTo(boundaryLayer);
            }
        }
    }

    function readSelectedIds() {
        const gmIds = readIdsFromTampermonkeyStorage();
        if (gmIds) return gmIds;

        const localIds = readIdsFromLocalStorage();
        if (localIds && localIds.size) {
            writeSelectedIds(localIds);
            return localIds;
        }

        return new Set();
    }

    function readIdsFromTampermonkeyStorage() {
        if (typeof GM_getValue !== 'function') return null;

        try {
            return parseStoredIds(GM_getValue(STORAGE_KEY, null));
        } catch (error) {
            console.warn('[LSS Kreisgrenzen] Tampermonkey-Speicher konnte nicht gelesen werden.', error);
            return null;
        }
    }

    function readIdsFromLocalStorage() {
        try {
            return parseStoredIds(localStorage.getItem(STORAGE_KEY));
        } catch (error) {
            console.warn('[LSS Kreisgrenzen] Gespeicherte Auswahl konnte nicht gelesen werden.', error);
            return null;
        }
    }

    function writeSelectedIds(ids) {
        const serializedIds = JSON.stringify(Array.from(ids));

        if (typeof GM_setValue === 'function') {
            GM_setValue(STORAGE_KEY, serializedIds);
        }

        try {
            localStorage.setItem(STORAGE_KEY, serializedIds);
        } catch (error) {
            console.warn('[LSS Kreisgrenzen] localStorage-Fallback konnte nicht geschrieben werden.', error);
        }
    }

    function parseStoredIds(value) {
        if (!value) return null;

        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (!Array.isArray(parsed)) return null;

        return new Set(parsed.map(String));
    }

    function getDisplayName(value, fallback) {
        let name = String(value || fallback || '').replace(/\s+/g, ' ').trim();
        name = name.replace(/^(.+)\s+\1$/u, '$1');
        name = applyDisplayNameOverride(name);

        for (const [pattern, replacement] of DISPLAY_NAME_REPLACEMENTS) {
            name = name.replace(pattern, replacement);
        }

        return applyDisplayNameOverride(name);
    }

    function applyDisplayNameOverride(name) {
        return Object.prototype.hasOwnProperty.call(DISPLAY_NAME_OVERRIDES, name)
            ? DISPLAY_NAME_OVERRIDES[name]
            : name;
    }

    function compareBoundaryEntries(a, b) {
        return compareStates(a.state, b.state)
            || GERMAN_COLLATOR.compare(a.district, b.district)
            || GERMAN_COLLATOR.compare(a.county, b.county);
    }

    function compareStates(a, b) {
        const stateA = STATE_ORDER_INDEX.has(a) ? STATE_ORDER_INDEX.get(a) : Number.MAX_SAFE_INTEGER;
        const stateB = STATE_ORDER_INDEX.has(b) ? STATE_ORDER_INDEX.get(b) : Number.MAX_SAFE_INTEGER;

        return stateA - stateB || GERMAN_COLLATOR.compare(a, b);
    }

    function updateSelectionStatus() {
        const count = selectedIds.size;
        setModalState(count === 1 ? '1 Kreis ausgewählt.' : `${count} Kreise ausgewählt.`);
    }

    function sameSet(a, b) {
        if (!a || !b || a.size !== b.size) return false;
        for (const value of a) {
            if (!b.has(value)) return false;
        }
        return true;
    }

    function openModal() {
        $(`#${MODAL_ID}`).show().attr('aria-hidden', 'false');
    }

    function closeModal() {
        $(`#${MODAL_ID}`).hide().attr('aria-hidden', 'true');
    }

    function setModalState(message, isError = false) {
        let status = $(`#${STATUS_ID}`);
        if (!status.length) {
            const body = $('#kreise-modal-body');
            if (!body.length) return;
            status = $('<p>', { id: STATUS_ID }).prependTo(body);
        }

        status
            .toggleClass('is-error', Boolean(isError))
            .text(message || '');
    }

    function loadCssOnce(id, url) {
        if (document.getElementById(id)) return;

        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = url;
        document.head.appendChild(link);
    }

    function loadScriptOnce(id, url, isLoaded) {
        if (isLoaded()) return Promise.resolve();

        const existing = document.getElementById(id);
        if (existing) {
            return waitForCondition(isLoaded, 10000);
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = id;
            script.src = url;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Script konnte nicht geladen werden: ${url}`));
            document.head.appendChild(script);
        });
    }

    function waitForCondition(condition, timeoutMs) {
        return new Promise((resolve, reject) => {
            const startedAt = Date.now();
            const timer = window.setInterval(() => {
                if (condition()) {
                    window.clearInterval(timer);
                    resolve();
                    return;
                }

                if (Date.now() - startedAt > timeoutMs) {
                    window.clearInterval(timer);
                    reject(new Error('Zeitüberschreitung beim Laden.'));
                }
            }, 100);
        });
    }
})();
