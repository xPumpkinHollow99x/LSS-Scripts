// ==UserScript==
// @name         LSS Eigene Freigaben + Credits
// @namespace    PumpkinHollow
// @version      1.2.0
// @description  Zeigt Listenwert, eigene Freigaben, deren Credits-Summe und offene Verbands-Credits ueber der Missionsliste an.
// @match        https://www.leitstellenspiel.de/
// @match        https://polizei.leitstellenspiel.de/
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Eigene-Freigaben+Credits.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Eigene-Freigaben+Credits.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    'use strict';

    if (window.__lssOwnSharedMissionSummaryLoadedV1) return;
    window.__lssOwnSharedMissionSummaryLoadedV1 = true;

    const HOST_ID = 'search_input_field_missions';
    const LIST_ID = 'mission_list';
    const ALLIANCE_LIST_ID = 'mission_list_alliance';
    const OBSERVED_LIST_IDS = [LIST_ID, ALLIANCE_LIST_ID];
    const WRAPPER_ID = 'lssOwnSharedMissionSummary';
    const CACHE_KEY = 'lssOwnSharedMissionSummaryMissionIndexV1';
    const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
    const SHARED_SELECTOR = '.panel-success';
    const formatter = new Intl.NumberFormat('de-DE');
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    let missionIndex = readCache();
    let missionIndexPromise = null;
    let updateQueued = false;
    const missionListObservers = new Map();
    let uiObserverInstalled = false;

    function hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    function debounce(fn, wait = 100) {
        let timeout = 0;
        return (...args) => {
            window.clearTimeout(timeout);
            timeout = window.setTimeout(() => fn(...args), wait);
        };
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
            console.warn('[LSS Eigene Freigaben] Cache konnte nicht gelesen werden.', error);
            return null;
        }
    }

    function writeCache(index) {
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
            console.warn('[LSS Eigene Freigaben] Cache konnte nicht geschrieben werden.', error);
        }
    }

    function buildMissionIndex(missions) {
        const index = Object.create(null);

        for (const mission of missions) {
            index[String(mission.id)] =
                typeof mission.average_credits === 'number' ? mission.average_credits : null;
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

    function ensureUi() {
        const anchor = document.getElementById(HOST_ID);
        if (!anchor) return null;

        let wrapper = document.getElementById(WRAPPER_ID);
        let ownListValue = document.getElementById(`${WRAPPER_ID}-own-list-credits`);
        let countValue = document.getElementById(`${WRAPPER_ID}-count`);
        let creditsValue = document.getElementById(`${WRAPPER_ID}-credits`);
        let allianceCreditsValue = document.getElementById(`${WRAPPER_ID}-alliance-credits`);

        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = WRAPPER_ID;
            Object.assign(wrapper.style, {
                fontSize: '15px',
                fontWeight: '600',
                marginBottom: '6px',
            });
        }

        if (!ownListValue || !countValue || !creditsValue || !allianceCreditsValue) {
            wrapper.textContent = '';

            const ownListLabel = document.createElement('span');
            ownListLabel.textContent = 'Listenwert: ';

            ownListValue = document.createElement('span');
            ownListValue.id = `${WRAPPER_ID}-own-list-credits`;

            const countLabel = document.createElement('span');
            countLabel.textContent = 'Eigene Freigaben: ';

            countValue = document.createElement('span');
            countValue.id = `${WRAPPER_ID}-count`;

            const separator = document.createElement('span');
            separator.textContent = ' | Credits-Summe: ';

            creditsValue = document.createElement('span');
            creditsValue.id = `${WRAPPER_ID}-credits`;

            const secondSeparator = document.createElement('span');
            secondSeparator.textContent = ' | Verband offen: ';

            allianceCreditsValue = document.createElement('span');
            allianceCreditsValue.id = `${WRAPPER_ID}-alliance-credits`;

            wrapper.append(
                ownListLabel,
                ownListValue,
                document.createTextNode(' | '),
                countLabel,
                countValue,
                separator,
                creditsValue,
                secondSeparator,
                allianceCreditsValue
            );
        }

        if (wrapper.parentElement !== anchor.parentElement) {
            anchor.before(wrapper);
        }

        return { wrapper, ownListValue, countValue, creditsValue, allianceCreditsValue };
    }

    function getEntriesByListId(listId) {
        const list = document.getElementById(listId);
        if (!list) return [];

        return Array.from(list.querySelectorAll('.missionSideBarEntry:not(.mission_deleted)'));
    }

    function getOwnSharedEntries() {
        return getEntriesByListId(LIST_ID).filter((entry) =>
            Boolean(entry.querySelector(SHARED_SELECTOR))
        );
    }

    function getAllianceOpenEntries() {
        return getEntriesByListId(ALLIANCE_LIST_ID);
    }

    function getMissionTypeKeys(entry) {
        const candidates = [
            entry.getAttribute('mission_type_id'),
            entry.dataset.missionTypeId,
            entry.dataset.missionType
        ];

        const keys = [];

        for (const candidate of candidates) {
            const raw = String(candidate || '').trim();
            if (raw && !keys.includes(raw)) keys.push(raw);

            const parsed = Number.parseInt(raw, 10);
            if (Number.isFinite(parsed)) {
                const numericKey = String(parsed);
                if (!keys.includes(numericKey)) keys.push(numericKey);
            }
        }

        return keys;
    }

    function getMissionCredits(entry, creditIndex) {

        // 1. Echter Einsatzwert aus der Einsatzliste
        try {
            const sortableRaw = entry.getAttribute('data-sortable-by');

            if (sortableRaw) {

                const sortable = JSON.parse(
                    sortableRaw.replace(/&quot;/g, '"')
                );

                if (Number.isFinite(sortable.average_credits)) {
                    return sortable.average_credits;
                }
            }
        } catch (e) {}

        // 2. Fallback auf /einsaetze.json
        if (!creditIndex) return null;

        for (const key of getMissionTypeKeys(entry)) {
            if (!hasOwn(creditIndex, key)) continue;

            const credits = creditIndex[key];

            if (Number.isFinite(credits)) {
                return credits;
            }
        }

        return null;
    }

    function summarizeEntries(entries, index) {
        let credits = 0;
        let unresolved = 0;

        for (const entry of entries) {
            const missionCredits = getMissionCredits(entry, index);

            if (!Number.isFinite(missionCredits)) {
                unresolved += 1;
                continue;
            }

            credits += missionCredits;
        }

        return {
            count: entries.length,
            credits,
            unresolved,
        };
    }

    function summarize(index) {
        return {
            ownList: summarizeEntries(getEntriesByListId(LIST_ID), index),
            ownShared: summarizeEntries(getOwnSharedEntries(), index),
            allianceOpen: summarizeEntries(getAllianceOpenEntries(), index),
        };
    }

    function render(summary, state) {
        const ui = ensureUi();
        if (!ui) return;

        ui.countValue.textContent = formatter.format(summary.ownShared.count);
        ui.countValue.style.color = '#5cb85c';

        if (state === 'loading') {
            ui.ownListValue.textContent = '...';
            ui.ownListValue.style.color = '#999999';
            ui.ownListValue.title = 'Lade average_credits aus /einsaetze.json';
            ui.creditsValue.textContent = '...';
            ui.creditsValue.style.color = '#999999';
            ui.creditsValue.title = 'Lade average_credits aus /einsaetze.json';
            ui.allianceCreditsValue.textContent = '...';
            ui.allianceCreditsValue.style.color = '#999999';
            ui.allianceCreditsValue.title = 'Lade average_credits aus /einsaetze.json';
            return;
        }

        if (state === 'error') {
            ui.ownListValue.textContent = '!';
            ui.ownListValue.style.color = '#d9534f';
            ui.ownListValue.title = 'Listenwert konnte nicht geladen werden';
            ui.creditsValue.textContent = '!';
            ui.creditsValue.style.color = '#d9534f';
            ui.creditsValue.title = 'Credits konnten nicht geladen werden';
            ui.allianceCreditsValue.textContent = '!';
            ui.allianceCreditsValue.style.color = '#d9534f';
            ui.allianceCreditsValue.title = 'Verbands-Credits konnten nicht geladen werden';
            return;
        }

        ui.ownListValue.textContent = `${formatter.format(summary.ownList.credits)} Cr`;
        ui.ownListValue.style.color = '#337ab7';
        ui.ownListValue.title = summary.ownList.unresolved
            ? `Summe aus bekannten average_credits. ${summary.ownList.unresolved} Einsatztyp(en) konnten nicht aufgeloest werden.`
            : 'Summe der average_credits aller aktuell offenen Einsaetze in deiner Liste';

        ui.creditsValue.textContent = `${formatter.format(summary.ownShared.credits)} Cr`;
        ui.creditsValue.style.color = '#f0ad4e';
        ui.creditsValue.title = summary.ownShared.unresolved
            ? `Summe aus bekannten average_credits. ${summary.ownShared.unresolved} Einsatztyp(en) konnten nicht aufgeloest werden.`
            : 'Summe der average_credits deiner aktuell freigegebenen Einsaetze';

        ui.allianceCreditsValue.textContent = `${formatter.format(summary.allianceOpen.credits)} Cr`;
        ui.allianceCreditsValue.style.color = '#5bc0de';
        ui.allianceCreditsValue.title = summary.allianceOpen.unresolved
            ? `Summe aus bekannten average_credits. ${summary.allianceOpen.unresolved} Verbands-Einsatztyp(en) konnten nicht aufgeloest werden.`
            : 'Summe der average_credits aller aktuell offenen Verbandseinsaetze';
    }

    async function update() {
        const initialSummary = summarize(missionIndex);

        if (!missionIndex) {
            render(initialSummary, 'loading');
        }

        try {
            const index = await loadMissionIndex(false);
            render(summarize(index), 'ready');
        } catch (error) {
            console.warn('[LSS Eigene Freigaben] Credits konnten nicht geladen werden.', error);
            render(initialSummary, missionIndex ? 'ready' : 'error');
        }
    }

    function queueUpdate() {
        if (updateQueued) return;

        updateQueued = true;
        window.requestAnimationFrame(() => {
            updateQueued = false;
            void update();
        });
    }

    const debouncedQueueUpdate = debounce(queueUpdate);

    function installMissionListObservers() {
        let installedAnyObserver = false;

        for (const listId of OBSERVED_LIST_IDS) {
            const missionList = document.getElementById(listId);
            const existingObserverState = missionListObservers.get(listId);

            if (!missionList) {
                if (existingObserverState) {
                    existingObserverState.observer.disconnect();
                    missionListObservers.delete(listId);
                }
                continue;
            }

            if (existingObserverState && existingObserverState.element === missionList) {
                continue;
            }

            if (existingObserverState) {
                existingObserverState.observer.disconnect();
            }

            const observer = new MutationObserver(() => {
                debouncedQueueUpdate();
            });

            observer.observe(missionList, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    'class',
                    'mission_type_id',
                    'data-sortable-by'
                ],
            });

            missionListObservers.set(listId, {
                observer,
                element: missionList,
            });
            installedAnyObserver = true;
        }

        return installedAnyObserver;
    }

    function installUiObserver() {
        if (uiObserverInstalled || !document.body) return;

        const observer = new MutationObserver(() => {
            const hadUi = Boolean(document.getElementById(WRAPPER_ID));

            ensureUi();
            const installedMissionListObserver = installMissionListObservers();

            if (!hadUi || installedMissionListObserver) {
                debouncedQueueUpdate();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        uiObserverInstalled = true;
    }

    function wrapPageFunction(functionName) {
        const original = pageWindow[functionName];
        if (typeof original !== 'function' || original.__lssOwnSharedWrapped) return;

        const wrapped = function (...args) {
            const result = original.apply(this, args);
            debouncedQueueUpdate();
            return result;
        };

        wrapped.__lssOwnSharedWrapped = true;
        pageWindow[functionName] = wrapped;
    }

    function init() {
        ensureUi();
        installMissionListObservers();
        installUiObserver();
        wrapPageFunction('missionMarkerAdd');
        wrapPageFunction('missionDelete');
        queueUpdate();
        void loadMissionIndex(false).catch((error) => {
            console.warn('[LSS Eigene Freigaben] Vorladen fehlgeschlagen.', error);
        });
    }

    init();
})();
