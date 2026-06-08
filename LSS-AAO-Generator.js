// ==UserScript==
// @name         LSS AAO Generator
// @namespace    PumpkinHollow
// @version      2.0
// @description  Fügt einen Button ein, um einen neuen AAO Eintrag zu erzeugen
// @match        https://www.leitstellenspiel.de/einsaetze/*
// @match        https://www.leitstellenspiel.de/aaos/new
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-AAO-Generator.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-AAO-Generator.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant        GM_openInTab
// ==/UserScript==

(function () {
    'use strict';

    // Simuliert echte Benutzereingabe, damit das Framework die Werte registriert
    function setNativeInputValue(element, value) {
        const lastValue = element.value;
        element.value = value;

        const tracker = element._valueTracker;
        if (tracker) {
            tracker.setValue(lastValue);
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function addButton() {
        const button = document.createElement("button");
        button.className = "btn btn-default";
        button.innerHTML = "AAO Eintrag erzeugen";
        button.style.position = "absolute";
        button.style.top = "60px";
        button.style.right = "15px";
        document.body.appendChild(button);

        button.addEventListener("click", function () {
            const missionNameElement = document.querySelector("h1");
            const missionName = missionNameElement ? missionNameElement.childNodes[missionNameElement.childNodes.length - 1].textContent.trim() : null;

            //console.log("[AAO Generator] Einsatzname gefunden:", missionName);

            if (!missionName) {
                alert("Einsatzname nicht gefunden");
                console.warn("[AAO Generator] Kein Einsatzname gefunden");
                return;
            }

            const tables = document.querySelectorAll("table.table-striped");
            const relevantTables = [];

            tables.forEach(function (tbl) {
                const header = tbl.querySelector("thead th");
                if (header && (header.textContent.includes("Benötigte Fahrzeuge und Personal") || header.textContent.includes("Weitere Informationen"))) {
                    relevantTables.push(tbl);
                }
            });

            if (relevantTables.length === 0) {
                alert("Keine relevanten Tabellen gefunden");
                console.warn("[AAO Generator] Keine relevanten Tabellen gefunden");
                return;
            }

            const values = { missionName: missionName };

            relevantTables.forEach(function (table) {
                const rows = table.querySelectorAll("tbody tr");
                rows.forEach(function (row) {
                    const cells = row.querySelectorAll("td");
                    if (cells.length >= 2) {
                        const key = cells[0].textContent.trim();
                        const value = cells[1].textContent.trim();
                        values[key] = value;
                        //console.log(`[AAO Generator] Eingelesen: ${key} = ${value}`);
                    }
                });
            });

            //console.log("[AAO Generator] Gespeicherte Werte:", values);
            localStorage.setItem("aaoValues", JSON.stringify(values));
            GM_openInTab("https://www.leitstellenspiel.de/aaos/new", true);
        });
    }

    function fillAAOValues() {
        const aaoValues = JSON.parse(localStorage.getItem("aaoValues"));
        if (!aaoValues) {
            console.warn("[AAO Generator] Keine gespeicherten Werte gefunden");
            return;
        }

        console.log("[AAO Generator] Geladene Werte:", aaoValues);

        const inputMap = {
            //Feuerwehr
            "Benötigte Löschfahrzeuge": "aao[fire]", // Beliebiges LF oder TLF
            //"Benötigte Löschfahrzeuge": "aao[lf_only]", // Beliebiges LF
            //"Benötigte Löschfahrzeuge": "aao[tlf_only]", // Beliebiges TLF
            "Wasserbedarf": "aao[wasser_amount]", // Liter Wasser
            //"Wasserbedarf": "aao[wasser_amount_tlf]", // Liter Wasser - Nur TLF
            //"Wasserbedarf": "aao[wasser_amount_carrier]", // Liter Wasser - Nur Großtankfahrzeuge
            //"Wasserbedarf": "aao[wasser_amount_tlf_water_carrier]", // Liter Wasser - Nur TLF oder Großtankfarhzeuge
            "Sonderlöschmittelbedarf": "aao[foam_amount]", // Sonderlöschmittelmenge
            //"Sonderlöschmittelbedarf": "aao[foam_amount_only_foam_vehicles]", // Sonderlöschmittelmenge - Nur Sonderlöschmittelfahrzeuge
            "Min. Pumpenleistung": "aao[water_damage_pump_value]", // Pumpenleistung
            //"Min. Pumpenleistung": "aao[water_damage_pump_value_only_pumps]", // Pumpenleistung - Nur Schmutzwasserpumpen
            //"Min. Pumpenleistung": "aao[pump]", // Schmutzwasserpumpen
            "Benötigte Feuerlöschpumpen (z. B. LF)": "aao[water_damage_pump]", // Feuerlöschpumpen
            //"Benötigte ELW 1": "aao[elw]", // ELW 1
            //"Benötigte ELW 1": "aao[elw1_or_elw2]", // ELW 1, ELW 2 oder AB-Einsatzleitung
            "Benötigte ELW 1": "aao[elw1_or_elw_drone]", // ELW 1 oder ELW Drohne
            //"Benötigte ELW 2": "aao[elw2]", // ELW 2
            //"Benötigte ELW 2": "aao[elw2_or_ab_elw]", // ELW 2 oder AB-Einsatzleitung
            "Benötigte ELW 2": "aao[elw2_or_elw2_drone]", // ELW 2 oder ELW 2 Drohne
            "Benötigte Drehleitern": "aao[dlk]", // DLK 23
            //"Benötigte Drehleitern": "aao[dlk_or_tm50]", // DLK 23 oder TM 50
            //"Benötigte Rüstwagen": "aao[hlf_only]", // HLF 10 oder HLF 20
            //"Benötigte Rüstwagen": "aao[hlf_or_rw_and_lf]", // HLF oder RW und LF
            //"Benötigte Rüstwagen": "aao[rw]", // Beliebiges HLF oder RW
            //"Benötigte Rüstwagen": "aao[rw_only]", // RW
            //"Benötigte Rüstwagen": "aao[ab_ruest]", // AB-Rüst
            "Benötigte Rüstwagen": "aao[ab_ruest_rw]", // Beliebiges HLF, RW oder AB Rüst
            "Benötigte GW-A": "aao[gwa]", // GW-A oder AB-Atemschutz
            //"Benötigte GW-A": "aao[ab_atemschutz_only]", // AB-Atemschutz
            //"Benötigte GW-A": "aao[gw_atemschutz_only]", // GW-Atemschutz
            "Benötigte GW-Öl": "aao[gwoel]", // GW-Öl oder AB-Öl
            //"Benötigte GW-Öl": "aao[ab_oel_only]", // AB-Öl
            //"Benötigte GW-Öl": "aao[gw_oel_only]", // GW-Öl
            //"Benötigte Schlauchwagen (GW-L2 Wasser, SW 1000, SW 2000 oder Ähnliches)": "aao[gwl2wasser]", // schlauchwagen oder AB-Schlauch
            //"Benötigte Schlauchwagen (GW-L2 Wasser, SW 1000, SW 2000 oder Ähnliches)": "aao[gwl2wasser_only]", // Nur Schlauchwagen
            //"Benötigte Schlauchwagen (GW-L2 Wasser, SW 1000, SW 2000 oder Ähnliches)": "aao[abl2wasser_only]", // AB-Schlauch
            //"Benötigte Schlauchwagen (GW-L2 Wasser, SW 1000, SW 2000 oder Ähnliches)": "vehicle_type_ids[143]", // Anh Schlauch
            "Benötigte Schlauchwagen (GW-L2 Wasser, SW 1000, SW 2000 oder Ähnliches)": "aao[gwl2wasser_all]", // Beliebiges Schlauchfahrzeug
            "Benötigte GW-Mess": "aao[gwmesstechnik]", // GW-Messtechnik
            "Benötigte GW-Gefahrgut": "aao[gwgefahrgut]", // GW-Gefahrgut oder AB-Gefahrgut
            //"Benötigte GW-Gefahrgut": "aao[gw_gefahrgut_only]", // GW-Gefahrgut
            //"Benötigte GW-Gefahrgut": "aao[ab_gefahrgut_only]", // AB-Gefahrgut
            "Benötigte GW-Höhenrettung": "aao[gwhoehenrettung]", // GW-Höhenrettung
            "Benötigte Dekon-P": "aao[dekon_p]", // Dekon-p oder AB-Dekon-P
            //"Benötigte Dekon-P ": "aao[only_dekon_p]", // Dekon-P
            //"Benötigte Dekon-P ": "aao[only_ab_dekon_p]", // AB-Dekon-P
            //"Benötigte Feuerwehrkräne (FwK)": "aao[fwk]", // FwK
            "Benötigte Feuerwehrkräne (FwK)": "vehicle_type_ids[[57, 182]]", // Kran von beliebiger Organisation
            "Benötigte Turbolöscher": "aao[turboloescher]", // Turbolöscher
            "Benötigte Teleskopmasten": "aao[tm50]", // TM 50
            "Benötigte ULF mit Löscharm": "aao[ulf]", // ULF mit Löscharm
            "Benötigte GW-Werkfeuerwehr": "aao[gw_werkfeuerwehr]", // GW-Werkfeuerwehr
            "Benötigte Lüfter": "aao[ventilation]", // Lüfter
            //"Benötigte Drohneneinheiten": "vehicle_type_ids[126]", // MTF Drohne
            //"Benötigte Drohneneinheiten": "vehicle_type_ids[128]", // ELW Drohne
            //"Benötigte Drohneneinheiten": "vehicle_type_ids[129]", // ELW 2 Drohne
            "Benötigte Bahnrettungsfahrzeuge": "aao[railway_fire]", // Beliebiges Bahnrettungsfahrzeug
            //"Benötigte Bahnrettungsfahrzeuge": "vehicle_type_ids[162]", // RW-Schiene
            //"Benötigte Bahnrettungsfahrzeuge": "vehicle_type_ids[163]", // HLF-Schiene
            //"Benötigte Bahnrettungsfahrzeuge": "vehicle_type_ids[164]", // AB-Schiene
            //Rettungsdienst
            "Benötigte LNA": "aao[kdow_lna]", //KdoW-LNA
            "Benötigte OrgL": "aao[kdow_orgl]", //KdoW-OrgL
            //Polizei
            "Benötigte Funkstreifenwagen": "aao[fustw]", // FuStW
            //"Benötigte Funkstreifenwagen": "aao[police_car_or_service_group_leader]", // FuStW oder FuStW (DGL)
            "Benötigte Polizeihubschrauber": "vehicle_type_ids[[61, 156]]", // Beliebiger Polizeihubschrauber
            //"Benötigte Polizeihubschrauber": "aao[polizeihubschrauber]", // Polizeihubschrauber
            //"Benötigte Polizeihubschrauer": "vehicle_type_ids[156]", // Polizeihubschrauber mit verbauter Winde
            "Benötigte Funkstreifenwagen oder Polizeimotorräder": "aao[fustw_or_police_motorcycle]", // FuStW oder Polizeimotorrad
            "Benötigte Funkstreifenwagen (Dienstgruppenleitung)": "vehicle_type_ids[103]", // FuStW (DGL)
            //THW
            "Benötigte GKW": "aao[gkw]", // GKW
            "Benötigte MTW-TZ": "aao[thw_mtw]", // MTW-TZ
            "Benötigte (MzGW FGr N)": "aao[thw_mzkw]", // MzGW (FGr N)
            //"LKW K 9": "aao[thw_lkw]", // LKW K 9
            "BRmG R": "aao[thw_brmg_r]", // BRmG R
            "Anhänger Drucklufterzeugung": "aao[thw_dle]", // Anh DLE
            "Benötigte MzGW SB": "vehicle_type_ids[109]", // MzGW SB
            "Benötigte Drohneneinheiten": "aao[drone]", // Beliebige Drohneneinheit
            //"Benötigte Drohneneinheiten": "vehicle_type_ids[125]", // MTW-Tr UL
            //"Benötigte FüKomKW": "vehicle_type_ids[145]", // FüKomKW
            "Benötigte Anh FüLa": "vehicle_type_ids[146]", // Anh FüLa
            //SEG
            //"Benötigte Drohneneinheiten": "vehicle_type_ids[127]", // GW-UAS
            //"Benötigte Betreuungs- und Verpflegungsausstattung": "aao[care_service_equipment]", // Betreuungs- und Verpflegungsausstattung
            "Benötigte GW-TeSi": "vehicle_type_ids[171]", // GW-TeSi
            "Benötigte MTW-TeSi": "vehicle_type_ids[173]", // MTW-TeSi
            "Benötigte Anh TeSi": "vehicle_type_ids[174]", // Anh TeSi
            "Benötigte ": "aao[]", //
            //Wasserrettung
            //Rettungshundestaffel
            //Seenotrettung
            //"Maximale Patientenanzahl": "aao[rtw]",
        };


        const missionNameInput = document.querySelector("input[name='aao[caption]']");
        if (missionNameInput) {
            setNativeInputValue(missionNameInput, aaoValues.missionName);
            //console.log(`[AAO Generator] Einsatzname gesetzt: ${aaoValues.missionName}`);
        } else {
            console.warn("[AAO Generator] Einsatzname-Input nicht gefunden");
        }

        for (let key in aaoValues) {
            if (aaoValues.hasOwnProperty(key) && key !== "missionName") {
                const inputName = inputMap[key];
                if (inputName) {
                    const inputElement = document.querySelector(`input[name='${inputName}']`);
                    if (inputElement) {
                        setNativeInputValue(inputElement, aaoValues[key]);
                        console.log(`[AAO Generator] Feld gesetzt: ${key} (${inputName}) = ${aaoValues[key]}`);
                    } else {
                        console.warn(`[AAO Generator] Kein Input-Feld gefunden für: ${key} (${inputName})`);
                    }
                } else {
                    console.warn(`[AAO Generator] Keine Zuordnung für Schlüssel: ${key}`);
                }
            }
        }

        const patienten = parseInt(aaoValues["Maximale Patientenanzahl"]) || 0;

        // Defaults
        let rtw = 0;
        let nef = 0;
        let rth = 0;
        let gwSan = 0;
        let ktwB = 0;

        // =======================
        // STUFENLOGIK
        // =======================

        if (patienten === 1) {
            rtw = 1;
            nef = 1;
            rth = 1;

        } else if (patienten === 2) {
            rtw = 2;
            nef = 1;
            rth = 1;

        } else if (patienten === 3) {
            rtw = 3;
            nef = 1;
            rth = 1;

        } else if (patienten === 4) {
            rtw = 4;
            nef = 1;
            rth = 1;

        } else if (patienten === 5) {
            rtw = 5;
            nef = 2;
            rth = 1;

        } else if (patienten >= 6 && patienten <= 10) {
            rtw = 6;
            nef = 2;
            rth = 1;

        } else if (patienten >= 11 && patienten <= 15) {
            rtw = 8;
            nef = 3;
            rth = 1;
            gwSan = 1;
            ktwB = 3;

        } else if (patienten >= 16 && patienten <= 25) {
            rtw = 10;
            nef = 4;
            rth = 1;
            gwSan = 2;
            ktwB = 6;

        } else if (patienten >= 26 && patienten <= 50) {
            rtw = 22;
            nef = 6;
            rth = 1;
            gwSan = 4;
            ktwB = 12;

        } else if (patienten >= 51 && patienten <= 100) {
            rtw = 30;
            nef = 8;
            rth = 2;
            gwSan = 6;
            ktwB = 18;

        } else if (patienten >= 101 && patienten <= 200) {
            rtw = 38;
            nef = 12;
            rth = 2;
            gwSan = 8;
            ktwB = 24;

        } else if (patienten >= 201 && patienten <= 250) {
            rtw = 50;
            nef = 12;
            rth = 3;
            gwSan = 12;
            ktwB = 36;
        }

        // RTW Reduktion durch NEF (NEF ersetzt RTW teilweise)
        if (nef > 0) {
            rtw = Math.max(0, rtw - nef);
        }

        // =======================
        // EINTRÄGE INS FORMULAR
        // =======================

        // RTW
        const rtwInput = document.querySelector("input[name='aao[rtw]']");
        if (rtwInput) setNativeInputValue(rtwInput, rtw);

        // NEF
        if (aaoValues["NEF Anforderungswahrscheinlichkeit"]) {
            const nefInput = document.querySelector("input[name='aao[naw_or_rtw_and_nef]']");
            if (nefInput) setNativeInputValue(nefInput, nef);
        }

        // RTH
        if (aaoValues["RTH Anforderungswahrscheinlichkeit"]) {
            const rthInput = document.querySelector("input[name='aao[rth_only]']");
            if (rthInput) setNativeInputValue(rthInput, rth);
        }

        // GW-SAN
        if (gwSan > 0) {
            const gwSanInput = document.querySelector("input[name='aao[gw_san]']");
            if (gwSanInput) setNativeInputValue(gwSanInput, gwSan);
        }

        // KTW B
        if (ktwB > 0) {
            const ktwInput = document.querySelector("input[name='aao[ktw_b]']");
            if (ktwInput) setNativeInputValue(ktwInput, ktwB);
        }
        // LNA / OrgL / SEG-ELW

        if (patienten >= 1) {
            const segElw = document.querySelector("input[name='aao[seg_elw]']");
            if (segElw) setNativeInputValue(segElw, 1);
        }

        if (patienten >= 5) {
            const lnaInput = document.querySelector("input[name='aao[kdow_lna]']");
            if (lnaInput) setNativeInputValue(lnaInput, 1);
        }

        if (patienten >= 10) {
            const orglInput = document.querySelector("input[name='aao[kdow_orgl]']");
            if (orglInput) setNativeInputValue(orglInput, 1);
        }

        // Betreuungs- und Verpflegungsausstattung (Wird nur noch eingetragen, wenn in Tabelle explizit gefordert)
        if (aaoValues["Benötigte Betreuungs- und Verpflegungsausstattung"]) {
            const careService = parseInt(aaoValues["Benötigte Betreuungs- und Verpflegungsausstattung"]) || 0;
            if (careService > 0) {
                const careInput = document.querySelector("input[name='aao[care_service_equipment]']");
                if (careInput) {
                    setNativeInputValue(careInput, careService);
                }

                // Trägt jeweils 2 Bt-Kombi pro Ausstattung ein
                const btKombiCount = careService * 2;
                const btKombiInput = document.querySelector("input[name='vehicle_type_ids[131]']");
                if (btKombiInput) {
                    setNativeInputValue(btKombiInput, btKombiCount);
                }
            }
        }

        localStorage.removeItem("aaoValues");
        //console.log("[AAO Generator] Lokale Werte gelöscht nach Übertragung");
    }

    if (window.location.href.includes("https://www.leitstellenspiel.de/einsaetze/")) {
        //console.log("[AAO Generator] Einsatzseite erkannt");
        addButton();
    } else if (window.location.href === "https://www.leitstellenspiel.de/aaos/new") {
        //console.log("[AAO Generator] AAO-Erstellungsseite erkannt");
        fillAAOValues();
    }
})();
