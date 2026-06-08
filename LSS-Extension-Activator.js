// ==UserScript==
// @name          LSS Extension-Activator
// @namespace    PumpkinHollow
// @version       9.0
// @description   Aktiviert Erweiterungen + erzwingt Einsatzbereitschaft (5s Countdown)
// @match         https://www.leitstellenspiel.de/buildings/*
// @match         https://polizei.leitstellenspiel.de/buildings/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Extension-Activator.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Extension-Activator.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant         none
// ==/UserScript==

(function() {
    'use strict';

    const ignoreList = ["Großgewahrsam", "Zelle", "Rettungsdienst"];
    let isLocked = true;
    let countdownValue = 5;

    async function activateAll() {
        if (isLocked) return;

        const btnMain = $('#multi-activate-btn');

        const extTab = $('a[href="#extensions"], a[aria-controls="extensions"], .nav-tabs a:contains("Erweiterungen")').first();

        if (extTab.length > 0) {
            btnMain.text("Tab wechseln...").css("background-color", "orange");
            extTab.click();
            await new Promise(r => setTimeout(r, 600));
        }

        const allReadyLinks = $('a[href*="extension_ready"]').filter(function() {
            return $(this).text().trim() === "Einsatzbereit";
        });

        let toClick = [];
        allReadyLinks.each(function() {
            const link = $(this);
            const rowText = link.closest('tr').text() || "";
            const isIgnored = ignoreList.some(word =>
                rowText.toLowerCase().includes(word.toLowerCase())
            );
            if (!isIgnored) toClick.push(link);
        });

        for (let i = 0; i < toClick.length; i++) {
            btnMain.text(`Aktiviere: ${i + 1} / ${toClick.length}`);
            toClick[i][0].click();
            await new Promise(r => setTimeout(r, 700));
        }

        const readinessLabel = $('.label-danger').filter(function() {
            return $(this).text().includes("Nicht Einsatzbereit");
        });

        if (readinessLabel.length > 0) {
            const toggleBtn = readinessLabel.parent().find('a:contains("Umschalten")');

            if (toggleBtn.length > 0) {
                btnMain.text("Gebäude -> Einsatzbereit").css("background-color", "darkgreen");
                toggleBtn[0].click();
                await new Promise(r => setTimeout(r, 600));
            }
        }

        btnMain.text("Erfolg! Lade neu...").css("background-color", "blue");
        setTimeout(() => location.reload(), 400);
    }

    function resetButton() {
        const btn = $('#multi-activate-btn');
        if (!btn.length) return;

        btn.html('<i class="glyphicon glyphicon-flash"></i> Extension enabled')
            .css({
                "background-color": "#5cb85c",
                "opacity": "1",
                "cursor": "pointer",
                "border": "2px solid white",
                "font-weight": "700",
                "line-height": "1.42857143",
                "font-size": "14px",
                "margin-top": "10px"
            });

        isLocked = false;
    }

    function startCountdown() {
        const btn = $('#multi-activate-btn');
        if (!btn.length || !isLocked) return;

        const timer = setInterval(() => {
            countdownValue--;
            if (countdownValue > 0) {
                btn.text(`Sperre: ${countdownValue}s`);
            } else {
                clearInterval(timer);
                resetButton();
            }
        }, 1000);
    }

    function injectButton() {
    const target = $('dt:contains("Generiert")').next('dd');

    if (target.length > 0 && !$('#multi-activate-btn').length) {

        const newBtn = $(`
            <a id="multi-activate-btn"
               style="
                  display:inline-block;
                  margin-top:6px;
                  padding:4px 10px;
                  cursor:wait;
                  background-color:gray;
                  opacity:0.6;
                  font-size:14px !important;
                  font-weight:700 !important;
                  line-height:1.42857143 !important;
                  border-radius:3px;
               ">
               <i class="glyphicon glyphicon-flash"></i> Warten... (5s)
            </a>
        `);

        newBtn.on('click', function(e) {
            e.preventDefault();
            if (!isLocked) activateAll();
        });

        // 👉 WICHTIG: erzwingt neue Zeile im dd
        target.append('<br>').append(newBtn);

        startCountdown();
    }
}

    injectButton();
    setInterval(injectButton, 1500);
})();
