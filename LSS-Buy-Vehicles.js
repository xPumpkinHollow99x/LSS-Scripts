// ==UserScript==
// @name          LSS Buy Vehicles
// @namespace    PumpkinHollow
// @version       1.0
// @description   Fahrzeugkauf mit sicherem Einzelkauf, damit Ausbauten korrekt beachtet werden
// @author        Silberfighter / angepasst
// @include       https://polizei.leitstellenspiel.de/buildings/*
// @include       https://www.leitstellenspiel.de/buildings/*
// @updateURL    https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Buy-Vehicles.js
// @downloadURL  https://raw.githubusercontent.com/xPumpkinHollow99x/LSS-Scripts/main/LSS-Buy-Vehicles.js
// @icon         https://github.com/xPumpkinHollow99x/Bilder/raw/main/pumpkinhollow.png
// @grant         none
// ==/UserScript==

(async function() {
    'use strict';

    const placeButtonOnTop = 1; // 1 = oben, 0 = unter Fahrzeugtabelle
    const buyDelay = 120; // Pause zwischen einzelnen Käufen in ms

    const vehicleConfigurations = [
        {
            buildingID: 0,
            displayName: "1. 10 Fz.",
            vehicles:[
                [0,1], // LF 20
                [87,1], // TLF 4000
                [30,1], // HLF 20
                [2,1], // DLK 23
                [3,1], // ELW 1
                [4,1], // RW
                [5,1], // GW-A
                [10,1], // GW-Öl
                [14,1], // SW 2000
                [36,1], // MTW
            ]
        },
        {
            buildingID: 0,
            displayName: "Normale FW",
            vehicles:[
                [0,2], // LF 20
                [2,1], // DLK 23/12
                [3,1], // ELW 1
                [4,1], // RW
                [5,1], // GW-A
                [10,1], // GW-Öl
                [12,1], // GW-Mess
                [14,1], // SW 2000
                [27,1], // GW-G
                [30,2], // HLF 20
                [33,1], // GW-Höhe
                [34,1], // ELW 2
                [36,1], // MTW
                [53,1], // Dekon-P
                [57,1], // FwK
                [87,1], // TLF 4000
                [114,1], // GW-Lüfter
                [167,1], // SLF
                [128,1], // ELW Drohne
                [139,2], // GW-Küche
                [163,1], // HLF-Schiene
                [111,1] // NEA50
            ]
        },
        {
            buildingID: 0,
            displayName: "Normale FW ohne Ausbauten",
            vehicles:[
                [0,2], // LF 20
                [2,1], // DLK 23/12
                [3,1], // ELW 1
                [4,1], // RW
                [5,1], // GW-A
                [10,1], // GW-Öl
                [12,1], // GW-Mess
                [14,1], // SW 2000
                [27,1], // GW-G
                [30,2], // HLF 20
                [33,1], // GW-Höhe
                [34,1], // ELW 2
                [36,1], // MTW
                [53,1], // Dekon-P
                [57,1], // FwK
                [87,1], // TLF 4000
                [114,1], // GW-Lüfter
                [167,1], // SLF
            ]
        },
        {
            buildingID: 0,
            displayName: "Große FW",
            vehicles:[
                [0,4], // LF 20
                [2,2], // DLK 23/12
                [3,2], // ELW 1
                [4,1], // RW
                [5,1], // GW-A
                [10,1], // GW-Öl
                [12,1], // GW-Mess
                [14,1], // SW 2000
                [27,1], // GW-G
                [30,4], // HLF 20
                [33,1], // GW-Höhe
                [34,1], // ELW 2
                [36,2], // MTW
                [53,1], // Dekon-P
                [57,1], // FwK
                [87,2], // TLF 4000
                [105,1], // GW-L2
                [114,1], // GW-Lüfter
                [167,2], // SLF
                [128,1], // ELW Drohne
                [139,2], // GW-Küche
                [163,1], // HLF-Schiene
                [111,1], // NEA50
                [113,1] // NEA200
            ]
        },
        {
            buildingID: 0,
            displayName: "FHF",
            vehicles:[
                [0,2], // LF 20
                [2,1], // DLK 23/12
                [3,1], // ELW 1
                [4,1], // RW
                [5,1], // GW-A
                [10,1], // GW-Öl
                [12,1], // GW-Mess
                [14,1], // SW 2000
                [27,1], // GW-G
                [30,2], // HLF 20
                [33,1], // GW-Höhe
                [34,1], // ELW 2
                [36,1], // MTW
                [53,1], // Dekon-P
                [57,1], // FwK
                [87,1], // TLF 4000
                [105,1], // GW-L2
                [114,1], // GW-Lüfter
                [128,1], // ELW Drohne
                [139,2], // GW-Küche
                [163,1], // HLF-Schiene
                [111,1], // NEA50
                [113,1], // NEA200
                [75,8], // FLF
                [76,2] // Rettungstreppe
            ]
        },
        {
            buildingID: 0,
            displayName: "WF",
            vehicles:[
                [0,2], // LF 20
                [2,1], // DLK 23/12
                [3,2], // ELW 1
                [4,1], // RW
                [5,1], // GW-A
                [10,1], // GW-Öl
                [12,1], // GW-Mess
                [14,1], // SW 2000
                [27,1], // GW-G
                [30,2], // HLF 20
                [33,1], // GW-Höhe
                [34,1], // ELW 2
                [36,1], // MTW
                [53,1], // Dekon-P
                [57,1], // FwK
                [87,1], // TLF 4000
                [105,1], // GW-L2
                [114,1], // GW-Lüfter
                [167,1], // SLF
                [128,1], // ELW Drohne
                [139,2], // GW-Küche
                [163,1], // HLF-Schiene
                [111,1], // NEA50
                [113,1], // NEA200
                [83,2], // GW-Werkfeuerwehr
                [84,2], // ULF mit Löscharm
                [85,2], // TM 50
                [86,2] // Turbolöscher
            ]
        },
        {
            buildingID: 2,
            displayName: "RD Normal",
            vehicles:[
                [28,8], // RTW
                [29,4], // NEF
                [55,1], // LNA
                [56,1], // OrgL
                [74,1] // NAW
            ]
        },
        {
            buildingID: 2,
            displayName: "RD Groß",
            vehicles:[
                [28,14], // RTW
                [29,7], // NEF
                [55,1], // LNA
                [56,1], // OrgL
                [74,2] // NAW
            ]
        },
        {
            buildingID: 5,
            displayName: "RTH",
            vehicles:[ [157,7] ] // RTH Winde
        },
        {
            buildingID: 6,
            displayName: "Pol Normal",
            vehicles:[
                [32,13], // FuStW
                [103,1], // DGL
                [95,2], // Polizeimotorrad
                [98,2], // ZPKW
                [94,1] // DHuFüKW
            ]
        },
        {
            buildingID: 6,
            displayName: "Pol Groß",
            vehicles:[
                [32,23], // FuStW
                [103,1], // DGL
                [95,2], // Polizeimotorrad
                [98,2], // ZPKW
                [94,1], // DHuFüKW
                [52,1] // GefKw
            ]
        },
        {
            buildingID: 9,
            displayName: "THW",
            vehicles:[
                [39,2], // GKW
                [41,2], // MzGW (FGr N)
                [110,2], // NEA50
                [40,2], // Zugtrupp
                [44,1], // Anh DLE
                [43,1], // BRmG R
                [42,1], // LKW K 9
                [45,1], // MLW 5
                [69,1], // Tauchkraftwagen
                [65,1], // LKW 7Lkr 19 tm
                [66,1], // Anh MzB
                [92,2], // Anh Hund
                [93,2], // MTW-O
                [102,1], // Anh 7
                [101,1], // Anh SwPu
                [123,1], // LKW 7 Lbw (FGr WP)
                [100,1], // MLW 4
                [109,1], // zGW SB
                [122,1], // LKW 7 Lbw (FGr E)
                [112,1], // NEA200
                [124,2], // MTW-OV
                [125,1], // MTW-Tr UL
                [144,1], // FüKW
                [145,1], // FüKomKW
                [146,1], // Anh FüLa
                [147,1], // FmKW
                [148,1], // MTW-FGr K
                [176,1], // LKW 7 Lbw (FGr Log-V)
                [177,1], // MTW-FGr Log-V
                [178,1], // Anh 12 Lbw (FGr Log-V)
                [181,1], // MzGW (FGr BrB)
                [182,1], // Mobilkran
                [183,1] // Anh Plattform (FGr BrB)
            ]
        },
        {
            buildingID: 9,
            displayName: "Zug 1",
            vehicles:[
                [39,1], // GKW
                [40,1], // MTW-TZ
                [41,1], // MzGW (FGr N)
                [110,1] // NEA50
            ]
        },
        {
            buildingID: 9,
            displayName: "Zug 2",
            vehicles:[
                [39,2], // GKW
                [40,2], // MTW-TZ
                [41,2], // MzGW (FGr N)
                [110,2] // NEA50
            ]
        },
        {
            buildingID: 9,
            displayName: "FGr Räumen",
            vehicles:[
                [42,1], // LKW K 9
                [43,1], // BRmG R
                [44,1], // Anh DLE
                [45,1] // MLW 5
            ]
        },
        {
            buildingID: 9,
            displayName: "FGr WR",
            vehicles:[
                [69,1], // Tauchkraftwagen
                [65,1], // LKW 7 LKr 19 tm
                [66,1] // Anh MzB
            ]
        },
        {
            buildingID: 9,
            displayName: "FGr Ortung",
            vehicles:[
                [93,2], // MTW-O
                [92,2] // Anh Hund
            ]
        },
        {
            buildingID: 9,
            displayName: "FGr WP",
            vehicles:[
                [100,1], // MLW 4
                [101,1], // Anh SwPu
                [123,1], // LKW 7 Lbw (FGr WP)
                [102,1] // Anh 7
            ]
        },
        {
            buildingID: 9,
            displayName: "FGr SB",
            vehicles:[
                [109,1] // MzGW SB
            ]
        },
        {
            buildingID: 9,
            displayName: "FGr E",
            vehicles:[
                [122,1], // LKW 7 Lbw (FGr E)
                [112,1] // NEA200
            ]
        },
        {
            buildingID: 9,
            displayName: "FGr Drohne",
            vehicles:[
                [125,1] // MTW-Tr UL
            ]
        },
        {
            buildingID: 9,
            displayName: "FGr Führung",
            vehicles:[
                [144,1], // FüKW
                [145,1], // FüKomKW
                [146,1], // Anh FüLa
                [147,1], // FmKW
                [148,1] // MTW-FGr K
            ]
        },
        {
            buildingID: 9,
            displayName: "FGr Log-V",
            vehicles:[
                [177,1], // MTW-FGr Log-V
                [176,1], // LKW 7 Lbw (FGr Log-V)
                [178,1] // Anh 12 Lbw (FGr Log-V)
            ]
        },
        {
            buildingID: 9,
            displayName: "FGr BrB",
            vehicles:[
                [181,1], // MzGW (FGr BrB)
                [182,1], // Mobilkran
                [183,1] // Anh Plattform (FGr BrB)
            ]
        },
        {
            buildingID: 9,
            displayName: "FGr MTW",
            vehicles:[
                [124,2] // MTW-OV
            ]
        },
        {
            buildingID: 11,
            displayName: "Bepo Alles",
            vehicles:[
                [35,4], // leBefKw
                [50,9], // GruKw
                [51,5], // FüKW
                [52,1], // GefKw
                [72,3], // WaWe
                [165,1], // LauKw
                [79,6], // SEK-ZF
                [80,2], // SEK-MTF
                [81,6], // MEK-ZF
                [82,2], // MEK-MTF
                [94,3], // DHuFüKW
                [136,3], // Anh Pferdetransport
                [137,3] // Zugfahrzeug Pferdetransport
            ]
        },
        {
            buildingID: 11,
            displayName: "EHU",
            vehicles:[
                [35,3], // leBefKw
                [50,9], // GruKw
                [51,1], // FüKW
                [52,1] // GefKw
            ]
        },
        {
            buildingID: 11,
            displayName: "WaWe",
            vehicles:[
                [35,4], // leBefKw
                [50,9], // GruKw
                [51,1], // FüKW
                [52,1], // GefKw
                [72,3] // WaWe
            ]
        },
        {
            buildingID: 11,
            displayName: "LauKw",
            vehicles:[
                [165,1] // LauKw
            ]
        },
        {
            buildingID: 11,
            displayName: "SEK",
            vehicles:[
                [79,6], // SEK-ZF
                [80,2], // SEK-MTF
                [51,3] // FüKW
            ]
        },
        {
            buildingID: 11,
            displayName: "MEK",
            vehicles:[
                [81,6], // MEK-ZF
                [82,2], // MEK-MTF
                [51,5] // FüKW
            ]
        },
        {
            buildingID: 11,
            displayName: "Hunde",
            vehicles:[
                [94,3] // DHuFüKW
            ]
        },
        {
            buildingID: 12,
            displayName: "SEG Sanitäts-Zug",
            vehicles:[
                [28,1], // RTW
                [58,3], // KTW Typ B
                [59,1], // ELW 1 (SEG)
                [60,1] // GW-San
            ]
        },
        {
            buildingID: 12,
            displayName: "SEG Voll",
            vehicles:[
                [28,1], // RTW
                [58,3], // KTW Typ B
                [59,1], // ELW 1 (SEG)
                [60,1], // GW-San
                [63,1], // GW-Taucher
                [64,1], // GW-Wasserrettung
                [70,1], // MZB
                [91,2], // Rettungshundefahrzeug
                [127,1], // GW UAS
                [131,4], // Bt-Kombi
                [132,3], // FKH
                [133,3], // Bt LKW
                [171,2], // GW-TeSi
                [172,1], // LK Technik (Notstrom)
                [173,1], // MTW-TeSi
                [174,1], // Anh TeSi
                [175,1] // NEA50
            ]
        },
        {
            buildingID: 13,
            displayName: "PHuSt",
            vehicles:[ [156,7] ] // PHuSt mit Winde
        },
        {
            buildingID: 15,
            displayName: "DLRG",
            vehicles:[
                [63,2], // GW-Taucher
                [64,2], // GW-Wasserrettung
                [70,2] // MZB
            ]
        }
    ];

    const buildingsIDToIgnore = [1,3,4,7,8,10];
    const buildingId = window.location.pathname.split("/")[2];
    const currentHost = window.location.hostname;

    let titleDiv = $("h1").filter((i, e) => $(e).attr("building_type") !== undefined).first();
    if (!titleDiv.length) return;

    let buildingTypeID = parseInt(titleDiv.attr("building_type"), 10);
    if (buildingsIDToIgnore.includes(buildingTypeID)) return;

    let wrapperDIV = $(`
        <div style="padding: 12px; border: 1px dashed #666; margin: 10px 0; border-radius: 5px; background: rgba(0,0,0,0.2);">
            <b style="display:block; margin-bottom:5px;">Turbo Vehicle-Configs:</b>
        </div>
    `);

    if (placeButtonOnTop) {
        titleDiv.parent().after(wrapperDIV);
    } else {
        $("#vehicle_table").before(wrapperDIV);
    }

    vehicleConfigurations.forEach(config => {
        if (config.buildingID === buildingTypeID) {
            let btn = $(`<a class="btn btn-success btn-xs" style="margin: 3px;">${config.displayName}</a>`);
            btn.on("click", () => buyVehiclesSafe(config));
            wrapperDIV.append(btn);
        }
    });

    async function buyVehiclesSafe(config) {
        let messageText = $("#autoBuyStatus");

        if (!messageText.length) {
            messageText = $(`<div id="autoBuyStatus" style="font-size:1.2em;font-weight:bold;margin-top:10px;color:#f0ad4e;"></div>`);
            wrapperDIV.append(messageText);
        }

        messageText.text("Analysiere vorhandene Fahrzeuge...").css("color", "#f0ad4e");

        const allVehicles = $("img[vehicle_type_id]").get();
        const token = $("meta[name=csrf-token]").attr("content");

        let buyJobs = [];
        let missingCount = 0;

        config.vehicles.forEach(([typeID, targetCount]) => {
            const currentCount = allVehicles.filter(e => $(e).attr("vehicle_type_id") == typeID).length;
            const needToBuy = targetCount - currentCount;

            if (needToBuy > 0) {
                missingCount += needToBuy;

                for (let i = 0; i < needToBuy; i++) {
                    buyJobs.push({
                        typeID,
                        run: () => $.post(
                            `https://${currentHost}/buildings/${buildingId}/vehicle/${buildingId}/${typeID}/credits?building=${buildingId}`,
                            {
                                "_method": "get",
                                "authenticity_token": token
                            }
                        )
                    });
                }
            }
        });

        if (missingCount === 0) {
            messageText.text("Alle Fahrzeuge vorhanden").css("color", "#5cb85c");
            return;
        }

        let vehicleBought = false;

        for (let i = 0; i < buyJobs.length; i++) {
            messageText
                .text(`Kaufe Fahrzeug ${i + 1} von ${buyJobs.length}...`)
                .css("color", "#f0ad4e");

            try {
                await buyJobs[i].run();
                vehicleBought = true;
            } catch (e) {
                console.warn(`Fahrzeug-ID ${buyJobs[i].typeID} konnte nicht gekauft werden.`, e);
            }

            await sleep(buyDelay);
        }

        if (vehicleBought) {
            messageText.text("Kauf abgeschlossen. Aktualisiere Seite...").css("color", "#5cb85c");
            setTimeout(() => location.reload(), 600);
        } else {
            messageText.text("Es konnten keine Fahrzeuge gekauft werden").css("color", "#d9534f");
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
})();
