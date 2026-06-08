// ==UserScript==
// @name         LSS Credits im Einsatzfenster (API)
// @namespace    PumpkinHollow
// @version      15.0
// @description  Zeigt durchschnittliche Einsatz-Credits im Einsatzfenster ueber /einsaetze.json an.
// @match        *://*.leitstellenspiel.de/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Credits-im-Einsatzfenster-(API).js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Credits-im-Einsatzfenster-(API).js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (window.__lssCreditsApiLoadedV15) return;
    window.__lssCreditsApiLoadedV15 = true;

    const DISPLAY_ID = 'lssCreditsDisplay';
    const CACHE_KEY = 'lssCreditsMissionIndexV15';
    const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
    const formatter = new Intl.NumberFormat('de-DE');

    let missionIndex = readCache();
    let missionIndexPromise = null;
    let updateQueued = false;
    let lastRenderKey = '';

    function hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    function readCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;

            const parsed = JSON.parse(raw);
            if (!parsed || parsed.host !== location.host || !parsed.index) return null;
            if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;

            return parsed.index;
        } catch (error) {
            console.warn('[LSS Credits API] Cache konnte nicht gelesen werden.', error);
            return null;
        }
    }

    function writeCache(index) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                ts: Date.now(),
                host: location.host,
                index
            }));
        } catch (error) {
            console.warn('[LSS Credits API] Cache konnte nicht geschrieben werden.', error);
        }
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

    function buildMissionIndex(missions) {
        const index = Object.create(null);

        for (const mission of missions) {
            const key = String(mission.id);
            index[key] = typeof mission.average_credits === 'number'
                ? mission.average_credits
                : null;
        }

        return index;
    }

    async function loadMissionIndex(forceRefresh = false) {
        if (!forceRefresh && missionIndex) return missionIndex;
        if (!forceRefresh && missionIndexPromise) return missionIndexPromise;

        missionIndexPromise = fetch('/einsaetze.json', {
            credentials: 'same-origin',
            cache: 'no-store'
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return response.json();
            })
            .then((missions) => {
                if (!Array.isArray(missions)) {
                    throw new Error('Unerwartete Antwort von /einsaetze.json');
                }

                missionIndex = buildMissionIndex(missions);
                writeCache(missionIndex);
                return missionIndex;
            })
            .catch((error) => {
                missionIndexPromise = null;
                throw error;
            });

        return missionIndexPromise;
    }

    function ensureDisplay(host) {
        let element = document.getElementById(DISPLAY_ID);

        if (!element) {
            element = document.createElement('span');
            element.id = DISPLAY_ID;
            Object.assign(element.style, {
                fontSize: '18px',
                fontWeight: 'bold',
                marginRight: '10px'
            });
        }

        if (element.parentElement !== host) {
            host.prepend(element);
        }

        return element;
    }

    function getColor(credits) {
        if (!Number.isFinite(credits)) return '#999999';
        if (credits === 0) return '#FFD700';
        if (credits <= 4999) return '#FF4C4C';
        if (credits <= 7999) return '#5BC0DE';
        return '#4CAF50';
    }

    function render(host, signature, text, color, title) {
        const renderKey = `${signature}|${text}|${color}|${title}`;
        const existingElement = document.getElementById(DISPLAY_ID);

        if (renderKey === lastRenderKey && existingElement && existingElement.parentElement === host) {
            return;
        }

        lastRenderKey = renderKey;

        const element = ensureDisplay(host);
        element.style.color = color;
        element.textContent = text;
        element.title = title;
    }

    function getMissionContext() {
        const info = document.getElementById('mission_general_info');
        const host = document.getElementById('missionH1');

        if (!info || !host) return null;

        const type = String(info.dataset.missionType || '').trim();
        const overlayRaw = sanitizeOverlay(info.dataset.additiveOverlays);
        const overlayNormalized = normalizeOverlay(overlayRaw);

        if (!type) return null;

        const keys = [];

        if (type.includes('/')) {
            keys.push(type);
        }

        if (overlayRaw) {
            keys.push(`${type}/${overlayRaw}`);
        }

        if (overlayNormalized && overlayNormalized !== overlayRaw) {
            keys.push(`${type}/${overlayNormalized}`);
        }

        keys.push(type);

        return {
            host,
            type,
            signature: `${type}|${overlayRaw}|${overlayNormalized}`,
            keys: Array.from(new Set(keys))
        };
    }

    function resolveCredits(index, context) {
        for (const key of context.keys) {
            if (hasOwn(index, key)) {
                return {
                    key,
                    credits: index[key]
                };
            }
        }

        return {
            key: context.keys[0] || context.type,
            credits: null
        };
    }

    function renderLoading(context) {
        render(
            context.host,
            context.signature,
            'Cr: ...',
            '#999999',
            'Lade Einsatzdaten'
        );
    }

    function renderCredits(context, resolved) {
        const credits = resolved.credits;
        const text = Number.isFinite(credits)
        ? `Cr: ${formatter.format(credits)} | Id: ${resolved.key}`
        : `Cr: ? | ${resolved.key}`;
        const title = Number.isFinite(credits)
            ? `Durchschnittliche Credits (${resolved.key})`
            : `Keine Credit-Daten fuer ${resolved.key} gefunden`;

        render(context.host, context.signature, text, getColor(credits), title);
    }

    function renderError(context) {
        render(
            context.host,
            context.signature,
            'Cr: !',
            '#999999',
            'Fehler beim Laden von /einsaetze.json'
        );
    }

    async function update() {
        const initialContext = getMissionContext();
        if (!initialContext) return;

        if (!missionIndex) {
            renderLoading(initialContext);
        }

        try {
            const index = await loadMissionIndex(false);
            const currentContext = getMissionContext();
            if (!currentContext) return;

            renderCredits(currentContext, resolveCredits(index, currentContext));
        } catch (error) {
            console.warn('[LSS Credits API] Einsatzdaten konnten nicht geladen werden.', error);

            const currentContext = getMissionContext();
            if (!currentContext) return;

            renderError(currentContext);
        }
    }

    function queueUpdate() {
        if (updateQueued) return;

        updateQueued = true;
        requestAnimationFrame(() => {
            updateQueued = false;
            void update();
        });
    }

    function installObserver() {
        if (!document.body) return;

        const observer = new MutationObserver(() => {
            queueUpdate();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-mission-type', 'data-additive-overlays']
        });
    }

    installObserver();
    queueUpdate();
    void loadMissionIndex(false).catch((error) => {
        console.warn('[LSS Credits API] Vorladen fehlgeschlagen.', error);
    });
})();
