// ==UserScript==
// @name         LSS Einsaetze ab Creditwert freigeben
// @namespace    PumpkinHollow
// @version      1.2
// @description  Gibt eigene Einsaetze ab einem Mindest-Creditwert mit einem Klick fuer den Verband frei.
// @match        https://www.leitstellenspiel.de/*
// @match        https://polizei.leitstellenspiel.de/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Einsaetze-ab-Creditwert-freigeben.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Einsaetze-ab-Creditwert-freigeben.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (window.__lssCreditShareToolLoadedV1) return;
    window.__lssCreditShareToolLoadedV1 = true;

    const UI_ID = 'lssCreditShareTool';
    const SETTINGS_KEY = 'lssCreditShareToolSettingsV1';
    const CACHE_KEY = 'lssCreditShareToolMissionIndexV2';
    const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
    const DEFAULT_MIN_CREDITS = 7000;
    const SHARE_DELAY_MS = 450;
    const OWN_LIST_IDS = ['mission_list'];

    const formatter = new Intl.NumberFormat('de-DE');

    let missionIndex = readMissionCache();
    let missionIndexPromise = null;
    let isRunning = false;
    let stopRequested = false;
    let previewQueued = false;
    let previewRequestId = 0;

    function hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    function wait(ms) {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    function sanitizeOverlay(raw) {
        return String(raw || '')
            .toLowerCase()
            .replace(/[^a-z]/g, '');
    }

    function normalizeOverlay(raw) {
        return Array.from(new Set(sanitizeOverlay(raw).split('')))
            .sort()
            .join('');
    }

    function addUniqueKey(keys, value) {
        const key = String(value || '').trim();
        if (!key) return;
        if (!keys.includes(key)) keys.push(key);
    }

    function firstNonEmpty(values) {
        for (const value of values) {
            const text = String(value || '').trim();
            if (text) return text;
        }

        return '';
    }

    function parseRgbColor(value) {
        const match = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
        if (!match) return null;

        const alpha = match[4] === undefined ? 1 : Number.parseFloat(match[4]);
        if (!Number.isFinite(alpha) || alpha < 0.05) return null;

        return {
            r: Number.parseInt(match[1], 10),
            g: Number.parseInt(match[2], 10),
            b: Number.parseInt(match[3], 10),
        };
    }

    function getLuminance(color) {
        const channel = (value) => {
            const normalized = value / 255;
            return normalized <= 0.03928
                ? normalized / 12.92
                : ((normalized + 0.055) / 1.055) ** 2.4;
        };

        return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
    }

    function pageHasDarkMarker() {
        const darkPattern = /\b(dark|darkmode|dark-mode|theme-dark|night)\b/i;
        const lightPattern = /\b(light|lightmode|light-mode|theme-light)\b/i;
        const roots = [document.documentElement, document.body].filter(Boolean);

        for (const root of roots) {
            const marker = [
                root.className,
                root.getAttribute('data-theme'),
                root.getAttribute('data-color-scheme'),
                root.getAttribute('data-bs-theme'),
            ].join(' ');

            if (darkPattern.test(marker)) return true;
            if (lightPattern.test(marker)) return false;
        }

        return null;
    }

    function pageLooksDarkByBackground() {
        const anchor =
            document.getElementById('search_input_field_missions') ||
            document.getElementById('mission_list') ||
            document.getElementById('missions-panel-body');
        const candidates = [
            anchor && anchor.parentElement,
            anchor,
            document.getElementById('missions-panel-body'),
            document.getElementById('missions'),
            document.body,
            document.documentElement,
        ].filter(Boolean);

        for (const element of candidates) {
            const color = parseRgbColor(window.getComputedStyle(element).backgroundColor);
            if (!color) continue;

            return getLuminance(color) < 0.36;
        }

        return null;
    }

    function isDarkMode() {
        const markedMode = pageHasDarkMarker();
        if (markedMode !== null) return markedMode;

        const backgroundMode = pageLooksDarkByBackground();
        if (backgroundMode !== null) return backgroundMode;

        return window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function syncTheme() {
        const wrapper = document.getElementById(UI_ID);
        if (!wrapper) return;

        const darkMode = isDarkMode();
        wrapper.classList.toggle('lss-credit-share-dark', darkMode);
        wrapper.classList.toggle('lss-credit-share-light', !darkMode);
        wrapper.dataset.theme = darkMode ? 'dark' : 'light';
    }

    function readSettings() {
        try {
            const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
            const minCredits = Number.parseInt(parsed.minCredits, 10);

            return {
                minCredits: Number.isFinite(minCredits) && minCredits >= 0
                    ? minCredits
                    : DEFAULT_MIN_CREDITS,
            };
        } catch (error) {
            return { minCredits: DEFAULT_MIN_CREDITS };
        }
    }

    function writeSettings(settings) {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.warn('[LSS Credit-Freigabe] Einstellungen konnten nicht gespeichert werden.', error);
        }
    }

    function readMissionCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;

            const parsed = JSON.parse(raw);
            if (!parsed || parsed.host !== location.host || !parsed.index) return null;
            if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;

            return parsed.index;
        } catch (error) {
            console.warn('[LSS Credit-Freigabe] Credit-Cache konnte nicht gelesen werden.', error);
            return null;
        }
    }

    function writeMissionCache(index) {
        try {
            localStorage.setItem(
                CACHE_KEY,
                JSON.stringify({
                    ts: Date.now(),
                    host: location.host,
                    index,
                })
            );
        } catch (error) {
            console.warn('[LSS Credit-Freigabe] Credit-Cache konnte nicht geschrieben werden.', error);
        }
    }

    function buildMissionIndex(missions) {
        const index = Object.create(null);

        for (const mission of missions) {
            const missionId = String(mission.id || '').trim();
            if (!missionId) continue;

            const credits =
                typeof mission.average_credits === 'number' ? mission.average_credits : null;
            const keys = [missionId];
            const missionIdLower = missionId.toLowerCase();
            if (missionIdLower !== missionId) keys.push(missionIdLower);

            const match = /^(\d+)(?:-(\d+))?(?:\/([a-z]+))?$/i.exec(missionIdLower);
            if (match) {
                const base = match[1];
                const additive = sanitizeOverlay(match[3] || '');
                const additiveNormalized = normalizeOverlay(additive);
                const hasOverlayIndex = match[2] !== undefined;

                if (additive) {
                    addUniqueKey(keys, `${base}/${additive}`);
                    if (additiveNormalized && additiveNormalized !== additive) {
                        addUniqueKey(keys, `${base}/${additiveNormalized}`);
                    }
                    if (hasOverlayIndex) {
                        addUniqueKey(keys, `${base}-${match[2]}/${additive}`);
                        if (additiveNormalized && additiveNormalized !== additive) {
                            addUniqueKey(keys, `${base}-${match[2]}/${additiveNormalized}`);
                        }
                    }
                }
            }

            for (const key of keys) {
                if (!hasOwn(index, key)) index[key] = credits;
            }
        }

        return index;
    }

    async function loadMissionIndex(forceRefresh = false) {
        if (!forceRefresh && missionIndex) return missionIndex;
        if (!forceRefresh && missionIndexPromise) return missionIndexPromise;

        missionIndexPromise = fetch('/einsaetze.json', {
            credentials: 'same-origin',
            cache: 'no-store',
        })
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((missions) => {
                if (!Array.isArray(missions)) {
                    throw new Error('Unerwartete Antwort von /einsaetze.json');
                }

                missionIndex = buildMissionIndex(missions);
                writeMissionCache(missionIndex);
                missionIndexPromise = null;
                return missionIndex;
            })
            .catch((error) => {
                missionIndexPromise = null;
                throw error;
            });

        return missionIndexPromise;
    }

    function ensureStyle() {
        if (document.getElementById(`${UI_ID}-style`)) return;

        const style = document.createElement('style');
        style.id = `${UI_ID}-style`;
        style.textContent = `
            #${UI_ID} {
                --lss-credit-share-bg: #fafafa;
                --lss-credit-share-border: #d8d8d8;
                --lss-credit-share-text: #222;
                --lss-credit-share-input-bg: #fff;
                --lss-credit-share-input-text: #222;
                --lss-credit-share-input-border: #c8c8c8;
                --lss-credit-share-status-default: #555;
                --lss-credit-share-status-ok: #3c763d;
                --lss-credit-share-status-warn: #8a6d3b;
                --lss-credit-share-status-error: #a94442;
                --lss-credit-share-status-busy: #31708f;
                margin: 0 0 6px 0;
                padding: 6px;
                border: 1px solid var(--lss-credit-share-border);
                border-radius: 4px;
                background: var(--lss-credit-share-bg);
                color: var(--lss-credit-share-text);
                box-sizing: border-box;
                width: 100%;
                font-size: 12px;
                line-height: 1.4;
            }

            #${UI_ID}.lss-credit-share-dark {
                --lss-credit-share-bg: #202428;
                --lss-credit-share-border: #3c444c;
                --lss-credit-share-text: #e7eaee;
                --lss-credit-share-input-bg: #15191d;
                --lss-credit-share-input-text: #f0f2f5;
                --lss-credit-share-input-border: #4a535d;
                --lss-credit-share-status-default: #c7ccd1;
                --lss-credit-share-status-ok: #8dd68d;
                --lss-credit-share-status-warn: #f0c36d;
                --lss-credit-share-status-error: #f28b82;
                --lss-credit-share-status-busy: #8bc7f5;
            }

            #${UI_ID} .lss-credit-share-row {
                display: flex;
                align-items: center;
                gap: 5px;
                flex-wrap: wrap;
                width: 100%;
                margin: 0;
            }

            #${UI_ID} label {
                display: inline-flex;
                align-items: center;
                min-height: 24px;
                margin: 0;
                font-weight: 600;
            }

            #${UI_ID}-min {
                width: 88px;
                height: 24px;
                padding: 2px 5px;
                background: var(--lss-credit-share-input-bg);
                border-color: var(--lss-credit-share-input-border);
                color: var(--lss-credit-share-input-text);
            }

            #${UI_ID}-status {
                display: block;
                margin-top: 4px;
                color: var(--lss-credit-share-status-default);
            }

            #${UI_ID}[data-tone="ok"] #${UI_ID}-status {
                color: var(--lss-credit-share-status-ok);
            }

            #${UI_ID}[data-tone="warn"] #${UI_ID}-status {
                color: var(--lss-credit-share-status-warn);
            }

            #${UI_ID}[data-tone="error"] #${UI_ID}-status {
                color: var(--lss-credit-share-status-error);
            }

            #${UI_ID}[data-tone="busy"] #${UI_ID}-status {
                color: var(--lss-credit-share-status-busy);
            }

            #${UI_ID}.lss-credit-share-dark .btn-default {
                background: #2d3339;
                border-color: #59636e;
                color: #f0f2f5;
            }

            #${UI_ID}.lss-credit-share-dark .btn-default:hover,
            #${UI_ID}.lss-credit-share-dark .btn-default:focus {
                background: #38414a;
                border-color: #72808e;
                color: #fff;
            }

            .lss-credit-share-done {
                box-shadow: inset 3px 0 0 #5cb85c;
            }

            .lss-credit-share-failed {
                box-shadow: inset 3px 0 0 #d9534f;
            }
        `;
        document.head.append(style);
    }

    function ensureUi() {
        ensureStyle();

        const existing = document.getElementById(UI_ID);
        if (existing) return existing;

        const anchor =
            document.getElementById('search_input_field_missions') ||
            document.getElementById('mission_list') ||
            document.getElementById('missions-panel-body');
        if (!anchor || !anchor.parentElement) return null;

        const settings = readSettings();
        const wrapper = document.createElement('div');
        wrapper.id = UI_ID;
        wrapper.innerHTML = `
            <div class="lss-credit-share-row">
                <label for="${UI_ID}-min">Freigabe ab</label>
                <input id="${UI_ID}-min" class="form-control input-sm" type="number" min="0" step="500" value="${settings.minCredits}">
                <span>Cr</span>
                <button id="${UI_ID}-start" class="btn btn-success btn-xs" type="button">
                    <span class="glyphicon glyphicon-share-alt" aria-hidden="true"></span>
                    Freigeben
                </button>
                <button id="${UI_ID}-stop" class="btn btn-warning btn-xs" type="button" style="display:none;">
                    <span class="glyphicon glyphicon-stop" aria-hidden="true"></span>
                    Stop
                </button>
                <button id="${UI_ID}-refresh" class="btn btn-default btn-xs" type="button" title="Liste neu pruefen">
                    <span class="glyphicon glyphicon-refresh" aria-hidden="true"></span>
                </button>
            </div>
            <span id="${UI_ID}-status">Bereit.</span>
        `;

        anchor.before(wrapper);
        syncTheme();
        return wrapper;
    }

    function getUiElements() {
        const wrapper = ensureUi();
        if (!wrapper) return null;

        return {
            wrapper,
            minInput: document.getElementById(`${UI_ID}-min`),
            startButton: document.getElementById(`${UI_ID}-start`),
            stopButton: document.getElementById(`${UI_ID}-stop`),
            refreshButton: document.getElementById(`${UI_ID}-refresh`),
            status: document.getElementById(`${UI_ID}-status`),
        };
    }

    function readMinCreditsFromUi() {
        const ui = getUiElements();
        if (!ui || !ui.minInput) return readSettings().minCredits;

        const raw = ui && ui.minInput ? ui.minInput.value : '';
        const minCredits = Number.parseInt(String(raw).replace(/\D/g, ''), 10);
        const effective = Number.isFinite(minCredits) && minCredits >= 0
            ? minCredits
            : DEFAULT_MIN_CREDITS;

        writeSettings({ minCredits: effective });
        ui.minInput.value = String(effective);
        return effective;
    }

    function setStatus(text, tone = 'default') {
        const ui = getUiElements();
        if (!ui || !ui.status) return;

        ui.status.textContent = text;
        ui.wrapper.dataset.tone = tone;
    }

    function setRunningUi(running) {
        const ui = getUiElements();
        if (!ui) return;

        isRunning = running;
        if (ui.startButton) {
            ui.startButton.disabled = running;
            ui.startButton.classList.toggle('disabled', running);
        }
        if (ui.refreshButton) {
            ui.refreshButton.disabled = running;
            ui.refreshButton.classList.toggle('disabled', running);
        }
        if (ui.minInput) {
            ui.minInput.disabled = running;
        }
        if (ui.stopButton) {
            ui.stopButton.style.display = running ? '' : 'none';
        }
    }

    function getOwnMissionEntries() {
        const entries = [];

        for (const listId of OWN_LIST_IDS) {
            const list = document.getElementById(listId);
            if (!list) continue;

            for (const child of Array.from(list.children)) {
                if (!child.classList || !child.classList.contains('missionSideBarEntry')) continue;
                if (child.classList.contains('mission_deleted')) continue;
                entries.push(child);
            }
        }

        return entries;
    }

    function getMissionId(entry) {
        const direct = entry.getAttribute('mission_id');
        if (direct && /^\d+$/.test(direct)) return direct;

        const idMatch = String(entry.id || '').match(/mission_sidebar_entry_(\d+)/);
        return idMatch ? idMatch[1] : null;
    }

    function getMissionTypeKeys(entry) {
        const overlayFromEntry = sanitizeOverlay(firstNonEmpty([
            entry.getAttribute('data-additive-overlays'),
            entry.dataset.additiveOverlays,
            entry.dataset.additiveOverlay,
            entry.getAttribute('additive_overlays'),
            entry.getAttribute('data-additive_overlay'),
        ]));
        const overlayFromHref = (() => {
            const link = entry.querySelector("a[href*='additive_overlays=']");
            if (!link) return '';

            const href = link.getAttribute('href');
            if (!href) return '';

            try {
                const url = new URL(href, location.origin);
                return sanitizeOverlay(url.searchParams.get('additive_overlays'));
            } catch (error) {
                return '';
            }
        })();
        const overlayRaw = overlayFromEntry || overlayFromHref;
        const overlayNormalized = normalizeOverlay(overlayRaw);

        const candidates = [
            entry.getAttribute('mission_type_id'),
            entry.dataset.missionTypeId,
            entry.dataset.missionType,
            entry.getAttribute('data-mission-type'),
        ];
        const keys = [];

        for (const candidate of candidates) {
            const raw = String(candidate || '').trim();
            if (!raw) continue;

            const rawLower = raw.toLowerCase();
            const hasExplicitAdditiveInType = rawLower.includes('/');
            const [basePartRaw, additivePartRaw = ''] = rawLower.split('/', 2);
            const basePart = basePartRaw.split('-', 1)[0];
            const parsed = Number.parseInt(basePart, 10);
            const additiveFromType = sanitizeOverlay(additivePartRaw);
            const additiveFromTypeNormalized = normalizeOverlay(additiveFromType);

            if (hasExplicitAdditiveInType) {
                addUniqueKey(keys, raw);
                addUniqueKey(keys, rawLower);
            }

            if (!Number.isFinite(parsed)) {
                if (!hasExplicitAdditiveInType) {
                    addUniqueKey(keys, raw);
                    addUniqueKey(keys, rawLower);
                }
                continue;
            }

            const baseKey = String(parsed);

            if (additiveFromType) {
                addUniqueKey(keys, `${baseKey}/${additiveFromType}`);
                if (additiveFromTypeNormalized && additiveFromTypeNormalized !== additiveFromType) {
                    addUniqueKey(keys, `${baseKey}/${additiveFromTypeNormalized}`);
                }
            }

            if (overlayRaw) {
                addUniqueKey(keys, `${baseKey}/${overlayRaw}`);
                if (overlayNormalized && overlayNormalized !== overlayRaw) {
                    addUniqueKey(keys, `${baseKey}/${overlayNormalized}`);
                }
                addUniqueKey(keys, `${baseKey}-0/${overlayRaw}`);
                if (overlayNormalized && overlayNormalized !== overlayRaw) {
                    addUniqueKey(keys, `${baseKey}-0/${overlayNormalized}`);
                }
            }

            if (!hasExplicitAdditiveInType) {
                addUniqueKey(keys, raw);
                addUniqueKey(keys, rawLower);
            }

            addUniqueKey(keys, baseKey);
        }

        return keys;
    }

    function getMissionCredits(entry, index) {
        if (!index) return null;

        for (const key of getMissionTypeKeys(entry)) {
            if (!hasOwn(index, key)) continue;

            const credits = index[key];
            if (Number.isFinite(credits)) return credits;
        }

        return null;
    }

    function isAlreadyShared(entry) {
        if (entry.dataset.lssCreditShareDone === 'true') return true;
        if (entry.classList.contains('panel-success')) return true;
        return Boolean(entry.querySelector('.panel-success'));
    }

    function getMissionTitle(entry, missionId) {
        const caption =
            entry.querySelector(`#mission_caption_${missionId}`) ||
            entry.querySelector('.mission_caption') ||
            entry.querySelector('.map_position_mover');

        const text = caption ? caption.textContent : entry.textContent;
        return String(text || 'Unbekannter Einsatz')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async function collectShareableMissions(minCredits) {
        const index = await loadMissionIndex(false);
        const entries = getOwnMissionEntries();
        const candidates = [];
        const summary = {
            total: entries.length,
            alreadyShared: 0,
            below: 0,
            unresolved: 0,
            missingId: 0,
        };

        for (const entry of entries) {
            if (isAlreadyShared(entry)) {
                summary.alreadyShared += 1;
                continue;
            }

            const id = getMissionId(entry);
            if (!id) {
                summary.missingId += 1;
                continue;
            }

            const credits = getMissionCredits(entry, index);
            if (!Number.isFinite(credits)) {
                summary.unresolved += 1;
                continue;
            }

            if (credits < minCredits) {
                summary.below += 1;
                continue;
            }

            candidates.push({
                id,
                credits,
                title: getMissionTitle(entry, id),
                entry,
            });
        }

        // Reihenfolge wie in der Missionsliste im DOM: von oben nach unten.
        candidates.sort((a, b) => {
            if (a.entry === b.entry) return 0;

            const position = a.entry.compareDocumentPosition(b.entry);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;

            return 0;
        });

        return { candidates, summary };
    }

    function formatCredits(credits) {
        return `${formatter.format(credits)} Cr`;
    }

    function markMission(entry, success) {
        entry.classList.toggle('lss-credit-share-done', success);
        entry.classList.toggle('lss-credit-share-failed', !success);
        if (success) entry.dataset.lssCreditShareDone = 'true';
    }

    async function shareMission(mission) {
        const response = await fetch(`/missions/${encodeURIComponent(mission.id)}/alliance`, {
            credentials: 'same-origin',
            cache: 'no-store',
            redirect: 'follow',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
    }

    async function refreshPreview(forceRefresh = false) {
        if (isRunning) return;

        const requestId = ++previewRequestId;
        const minCredits = readMinCreditsFromUi();
        setStatus('Pruefe Einsaetze ...', 'busy');

        try {
            if (forceRefresh) {
                missionIndex = null;
                localStorage.removeItem(CACHE_KEY);
                await loadMissionIndex(true);
            }

            const { candidates, summary } = await collectShareableMissions(minCredits);
            if (requestId !== previewRequestId || isRunning) return;

            const extra = [];
            if (summary.alreadyShared) extra.push(`${formatter.format(summary.alreadyShared)} schon frei`);
            if (summary.unresolved) extra.push(`${formatter.format(summary.unresolved)} ohne Creditwert`);

            const suffix = extra.length ? ` (${extra.join(', ')})` : '';
            setStatus(
                `${formatter.format(candidates.length)} von ${formatter.format(summary.total)} Einsaetzen ab ${formatCredits(minCredits)} freigebbar${suffix}.`,
                candidates.length ? 'ok' : 'warn'
            );
        } catch (error) {
            setStatus(`Creditdaten konnten nicht geladen werden: ${error.message}`, 'error');
            console.warn('[LSS Credit-Freigabe] Vorschau fehlgeschlagen.', error);
        }
    }

    function queuePreview(forceRefresh = false) {
        if (previewQueued || isRunning) return;
        previewQueued = true;

        window.setTimeout(() => {
            previewQueued = false;
            void refreshPreview(forceRefresh);
        }, 150);
    }

    async function startSharing() {
        if (isRunning) return;

        const minCredits = readMinCreditsFromUi();
        stopRequested = false;
        setRunningUi(true);
        setStatus(`Suche Einsaetze ab ${formatCredits(minCredits)} ...`, 'busy');

        let shared = 0;
        let failed = 0;

        try {
            const { candidates, summary } = await collectShareableMissions(minCredits);

            if (!candidates.length) {
                const unresolvedText = summary.unresolved
                    ? ` ${formatter.format(summary.unresolved)} Einsatztyp(en) hatten keinen Creditwert.`
                    : '';
                setStatus(`Keine passenden Einsaetze gefunden.${unresolvedText}`, 'warn');
                return;
            }

            for (let index = 0; index < candidates.length; index += 1) {
                if (stopRequested) break;

                const mission = candidates[index];
                setStatus(
                    `${index + 1}/${candidates.length}: ${mission.title} (${formatCredits(mission.credits)}) wird freigegeben ...`,
                    'busy'
                );

                try {
                    await shareMission(mission);
                    shared += 1;
                    markMission(mission.entry, true);
                } catch (error) {
                    failed += 1;
                    markMission(mission.entry, false);
                    console.warn(`[LSS Credit-Freigabe] Einsatz ${mission.id} konnte nicht freigegeben werden.`, error);
                }

                if (index < candidates.length - 1) {
                    await wait(SHARE_DELAY_MS);
                }
            }

            if (stopRequested) {
                setStatus(
                    `Gestoppt. ${formatter.format(shared)} freigegeben, ${formatter.format(failed)} Fehler.`,
                    failed ? 'warn' : 'ok'
                );
            } else {
                setStatus(
                    `Fertig. ${formatter.format(shared)} Einsatz/Einsaetze freigegeben, ${formatter.format(failed)} Fehler.`,
                    failed ? 'warn' : 'ok'
                );
            }
        } catch (error) {
            setStatus(`Freigabe abgebrochen: ${error.message}`, 'error');
            console.warn('[LSS Credit-Freigabe] Lauf fehlgeschlagen.', error);
        } finally {
            setRunningUi(false);
            stopRequested = false;
            queuePreview(false);
        }
    }

    function installEvents() {
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            if (target.closest(`#${UI_ID}-start`)) {
                event.preventDefault();
                void startSharing();
                return;
            }

            if (target.closest(`#${UI_ID}-stop`)) {
                event.preventDefault();
                stopRequested = true;
                setStatus('Stoppe nach dem aktuellen Einsatz ...', 'warn');
                return;
            }

            if (target.closest(`#${UI_ID}-refresh`)) {
                event.preventDefault();
                void refreshPreview(true);
            }
        });

        document.addEventListener('input', (event) => {
            if (!(event.target instanceof HTMLInputElement)) return;
            if (event.target.id !== `${UI_ID}-min`) return;

            readMinCreditsFromUi();
            queuePreview(false);
        });

        document.addEventListener('keydown', (event) => {
            if (!(event.target instanceof HTMLInputElement)) return;
            if (event.target.id !== `${UI_ID}-min`) return;
            if (event.key !== 'Enter') return;

            event.preventDefault();
            void startSharing();
        });
    }

    function installMissionObserver() {
        const observer = new MutationObserver((mutations) => {
            const ui = document.getElementById(UI_ID);
            if (ui && mutations.every((mutation) => ui.contains(mutation.target))) return;

            ensureUi();
            syncTheme();
            queuePreview(false);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function installThemeObserver() {
        const update = () => {
            syncTheme();
        };

        const observer = new MutationObserver(update);
        const themeAttributes = ['class', 'style', 'data-theme', 'data-color-scheme', 'data-bs-theme'];

        if (document.documentElement) {
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: themeAttributes,
            });
        }

        if (document.body) {
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: themeAttributes,
            });
        }

        if (!window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', update);
        } else if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(update);
        }
    }

    function boot() {
        installEvents();
        ensureUi();
        syncTheme();
        installMissionObserver();
        installThemeObserver();
        queuePreview(false);
        void loadMissionIndex(false).catch((error) => {
            console.warn('[LSS Credit-Freigabe] Creditdaten konnten nicht vorgeladen werden.', error);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
