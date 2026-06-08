// ==UserScript==
// @name        LSS Sicherheitswachenwecker
// @namespace    PumpkinHollow
// @description Stable overlay + clean NEW/WARN split + same tab open
// @include     https://www.leitstellenspiel.de/
// @include     https://polizei.leitstellenspiel.de/
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Sicherheitswachenwecker.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Sicherheitswachenwecker.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @version     10.0
// @grant       none
// ==/UserScript==

(function () {

    const vorlauf_minuten = 45;

    const INIT_KEY = "lss_initialized_v1";

    const STORAGE_NEW = "lss_seen_new_v1";
    const STORAGE_WARNED = "lss_seen_warned_v1";
    const TIME_KEY = "lss_time_cache_v1";

    let seenNew = new Set(JSON.parse(localStorage.getItem(STORAGE_NEW) || "[]"));
    let seenWarned = new Set(JSON.parse(localStorage.getItem(STORAGE_WARNED) || "[]"));
    let timeCache = JSON.parse(localStorage.getItem(TIME_KEY) || "{}");

    let audioCtx = null;
    let audioUnlocked = false;

    let sirenOsc1 = null;
    let sirenOsc2 = null;
    let sirenGain = null;
    let sirenInterval = null;
    let sirenTimeout = null;

    // =========================
    // STORAGE HELPERS
    // =========================
    function saveNew() {
        localStorage.setItem(STORAGE_NEW, JSON.stringify([...seenNew]));
    }

    function saveWarned() {
        localStorage.setItem(STORAGE_WARNED, JSON.stringify([...seenWarned]));
    }

    function saveTimeCache() {
        localStorage.setItem(TIME_KEY, JSON.stringify(timeCache));
    }

    // =========================
    // AUDIO UNLOCK
    // =========================
    function unlockAudio() {

        if (audioUnlocked) return;

        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtx.resume();

        const buffer = audioCtx.createBuffer(1, 1, 22050);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(0);

        audioUnlocked = true;

        const btn = document.getElementById("lss-sound-btn");
        if (btn) {
            btn.innerText = "🔊 Sound aktiv";
            btn.style.background = "#2ecc71";
        }
    }

    // =========================
    // SIREN
    // =========================
    function playSiren() {

        if (!audioUnlocked) return;

        stopSiren();

        const volume = parseFloat(localStorage.getItem("lss_volume") || "0.05");

        sirenGain = audioCtx.createGain();
        sirenGain.gain.value = volume;
        sirenGain.connect(audioCtx.destination);

        sirenOsc1 = audioCtx.createOscillator();
        sirenOsc2 = audioCtx.createOscillator();

        sirenOsc1.type = "sawtooth";
        sirenOsc2.type = "sawtooth";

        sirenOsc1.frequency.value = 500;
        sirenOsc2.frequency.value = 650;

        sirenOsc1.connect(sirenGain);
        sirenOsc2.connect(sirenGain);

        sirenOsc1.start();
        sirenOsc2.start();

        let up = true;

        sirenInterval = setInterval(() => {

            sirenOsc1.frequency.setValueAtTime(up ? 500 : 800, audioCtx.currentTime);
            sirenOsc2.frequency.setValueAtTime(up ? 650 : 950, audioCtx.currentTime);

            up = !up;

        }, 350);

        sirenTimeout = setTimeout(() => {
            stopSiren();
        }, 5000);
    }

    function stopSiren() {

        if (sirenInterval) clearInterval(sirenInterval);
        if (sirenTimeout) clearTimeout(sirenTimeout);

        sirenInterval = null;
        sirenTimeout = null;

        if (sirenOsc1) {
            sirenOsc1.stop();
            sirenOsc1.disconnect();
            sirenOsc1 = null;
        }

        if (sirenOsc2) {
            sirenOsc2.stop();
            sirenOsc2.disconnect();
            sirenOsc2 = null;
        }

        if (sirenGain) {
            sirenGain.disconnect();
            sirenGain = null;
        }
    }

    // =========================
    // NOTIFICATION
    // =========================
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    function notify(title, text) {
        if (Notification.permission !== "granted") return;

        new Notification(title, {
            body: text,
            icon: "https://www.leitstellenspiel.de/favicon.ico"
        });
    }

    // =========================
    // OVERLAY
    // =========================
    function createOverlay() {

        if (document.getElementById("lss-overlay")) return;

        const box = document.createElement("div");

        box.id = "lss-overlay";

        box.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            width: 320px;
            z-index: 999999;
            font-family: Arial;
            background: rgba(20,20,20,0.85);
            color: white;
            padding: 10px;
            border-radius: 8px;
        `;

        box.innerHTML = `
            <div id="drag-handle"
                style="
                    font-weight:bold;
                    margin-bottom:8px;
                    cursor:move;
                    background:rgba(255,255,255,0.08);
                    padding:6px;
                    border-radius:5px;
                ">
                🚨 LSS Alarm
            </div>

            <button id="lss-sound-btn"
                style="width:100%;padding:8px;margin-bottom:8px;background:#e74c3c;border:none;color:white;border-radius:6px;font-weight:bold;">
                🔊 Sound aktivieren
            </button>

            <div style="font-size:12px;margin-bottom:4px;">Lautstärke</div>
            <input id="lss-volume" type="range" min="0" max="1" step="0.05" style="width:100%;">
        `;

        document.body.appendChild(box);

        document.getElementById("lss-sound-btn")
            .addEventListener("click", unlockAudio);

        const slider = document.getElementById("lss-volume");
        slider.value = localStorage.getItem("lss_volume") || 0.12;

        slider.addEventListener("input", () => {
            localStorage.setItem("lss_volume", slider.value);

            if (sirenGain) {
                sirenGain.gain.value = parseFloat(slider.value);
            }
        });

        makeDraggable(box, document.getElementById("drag-handle"));
    }

    // =========================
    // DRAG
    // =========================
    function makeDraggable(box, handle) {

        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;

        handle.addEventListener("mousedown", (e) => {

            dragging = true;

            const rect = box.getBoundingClientRect();

            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            box.style.left = rect.left + "px";
            box.style.top = rect.top + "px";
            box.style.right = "auto";

            document.body.style.userSelect = "none";
        });

        document.addEventListener("mousemove", (e) => {

            if (!dragging) return;

            box.style.left = (e.clientX - offsetX) + "px";
            box.style.top = (e.clientY - offsetY) + "px";
        });

        document.addEventListener("mouseup", () => {
            dragging = false;
            document.body.style.userSelect = "auto";
        });
    }

    // =========================
    // OPEN MISSION SAME TAB
    // =========================
    function openMission($el) {

        const link = $el.find("a.map_position_mover").attr("href");

        if (link) {
            window.location.href = link;
        }
    }

    // =========================
    // MESSAGE
    // =========================
    function pushMessage(text, color, missionId = null) {

        const box = document.getElementById("lss-overlay");

        const el = document.createElement("div");

        el.style.cssText = `
            margin-top:6px;
            padding:8px;
            background:rgba(30,30,30,0.9);
            border-left:4px solid ${color};
            border-radius:6px;
            cursor:pointer;
            font-size:13px;
        `;

        el.innerText = text;

        el.onclick = () => {

            el.remove();

            if (missionId) {
                const dom = document.querySelector(`[mission_id="${missionId}"]`);
                if (dom) openMission($(dom));
            }
        };

        box.appendChild(el);
    }

    // =========================
    // HELPERS
    // =========================
    function getName($el) {
        return $el.find("a.map_position_mover").text().trim() || "Unbekannter Einsatz";
    }

    function isGreen($el) {
        return $el.find("div.mission_panel_green").length > 0;
    }

    // =========================
    // BASELINE INIT
    // =========================
    function initBaseline() {

        if (localStorage.getItem(INIT_KEY)) return;

        document.querySelectorAll(".missionSideBarEntry").forEach(el => {

            const id = $(el).attr("mission_id");
            if (id) seenNew.add(id);
        });

        saveNew();
        localStorage.setItem(INIT_KEY, "1");
    }

    // =========================
    // TIME PARSER SAFE
    // =========================
    function getTimeLeft($el, id) {

        const raw = $el.find("div.mission_overview_countdown").attr("timeleft");

        let time = parseInt(raw, 10);

        if (isNaN(time)) {
            time = timeCache[id];
        }

        return Math.floor(time / 60000);
    }

    // =========================
    // CORE
    // =========================
    function check(el) {

        const $el = $(el);

        const id = $el.attr("mission_id");
        if (!id) return;

        if (isGreen($el)) return;

        const name = getName($el);

        const timeleft = getTimeLeft($el, id);

        if (!isNaN(timeleft)) {
            timeCache[id] = timeleft;
            saveTimeCache();
        }

        // NEW (ONLY ONCE EVER)
        if (!seenNew.has(id)) {

            seenNew.add(id);
            saveNew();

            notify("🆕 Neuer geplanter Einsatz", name);
            pushMessage("🆕 " + name, "#3498db", id);
        }

        // 45 MIN (RELOAD SAFE)
        if (timeleft > 0 && timeleft <= vorlauf_minuten) {

            if (!seenWarned.has(id)) {

                seenWarned.add(id);
                saveWarned();

                notify("🚨 Einsatz in 45 Minuten", name);
                pushMessage("🚨 " + name + " (45 min)", "#e74c3c", id);

                playSiren();
            }
        }
    }

    function scan() {

        $("div#mission_list_sicherheitswache .missionSideBarEntry")
            .each(function () {
                check(this);
            });
    }

    const target = document.querySelector("#mission_list_sicherheitswache");

    if (target) {
        new MutationObserver(scan).observe(target, {
            childList: true,
            subtree: true
        });
    }

    createOverlay();
    initBaseline();

    setTimeout(scan, 3000);

})();
