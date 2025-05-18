let db;

function avaaTietokanta() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("MuistiplusDB", 1);

        request.onerror = (event) => {
            console.error("IndexedDB-virhe:", event.target.errorCode);
            reject(event.target.errorCode);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains("muistilaput")) {
                db.createObjectStore("muistilaput", { autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
    });
}

function lisaaMuistilappu(teksti) {
    const transaction = db.transaction(["muistilaput"], "readwrite");
    const store = transaction.objectStore("muistilaput");
    store.add(teksti);
    transaction.oncomplete = () => {
        document.getElementById("muistilappu").value = "";
        paivitaTaulukko();
    };
}

function haeMuistilaput() {
    return new Promise((resolve) => {
        const transaction = db.transaction(["muistilaput"], "readonly");
        const store = transaction.objectStore("muistilaput");

        const muistilaput = [];
        store.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                muistilaput.push({ id: cursor.key, teksti: cursor.value });
                cursor.continue();
            } else {
                resolve(muistilaput);
            }
        };
    });
}

function paivitaTaulukko() {
    const taulukko = document.getElementById("muistilaputTaulukko");
    taulukko.innerHTML = "";  // Tyhjennetään taulukko

    haeMuistilaput().then(muistilaput => {
        muistilaput.forEach(muistilappu => {
            const rivi = document.createElement("tr");

            // Teksti soluun
            const soluteksti = document.createElement("td");
            soluteksti.textContent = muistilappu.teksti;
            rivi.appendChild(soluteksti);

            // Toiminnot soluun
            const solutoiminnot = document.createElement("td");

            // Muokkauspainike
            const muokkaaBtn = document.createElement("button");
            muokkaaBtn.innerHTML = '<i class="fas fa-edit"></i>';
            muokkaaBtn.className = 'edit';
            muokkaaBtn.onclick = () => muokkaaMuistilappua(muistilappu.id, muistilappu.teksti);
            solutoiminnot.appendChild(muokkaaBtn);

            // Poistopainike
            const poistaBtn = document.createElement("button");
            poistaBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            poistaBtn.className = 'clear';
            poistaBtn.onclick = () => poistaMuistilappu(muistilappu.id);
            solutoiminnot.appendChild(poistaBtn);

            rivi.appendChild(solutoiminnot);
            taulukko.appendChild(rivi);
        });
    });
}

function muokkaaMuistilappua(id, vanhaTeksti) {
    const uusiTeksti = prompt("Muokkaa muistilappua:", vanhaTeksti); // Näytetään nykyinen teksti promptissa
    if (uusiTeksti !== null && uusiTeksti.trim() !== "") { //Tallennetaan jos tekstiä on
        const transaction = db.transaction(["muistilaput"], "readwrite");
        const store = transaction.objectStore("muistilaput");
        store.put(uusiTeksti, id).onsuccess = () => {  // Tallennetaan uusi teksti ID:n mukaan
            paivitaTaulukko(); // Päivitetään taulukko
        };
    }
}

function poistaMuistilappu(id) {
    const vahvistus = confirm("Haluatko varmasti poistaa tämän muistilapun?");
    if (!vahvistus) return; // Ei poisteta, jos käyttäjä peruuttaa

    const transaction = db.transaction(["muistilaput"], "readwrite");
    const store = transaction.objectStore("muistilaput");
    store.delete(id).onsuccess = () => {
        paivitaTaulukko(); // Päivitetään taulukko poistamisen jälkeen
    };
}

function muodostaTimestamp() {
    const now = new Date();
    return now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + "_" +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
}

function lataaTiedosto(blob, tiedostonimi) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = tiedostonimi;
    link.click();
}

function exportData(muoto = "json") {
    const sallitutFormaatit = ["json", "txt"];
    if (!sallitutFormaatit.includes(muoto)) {
        alert(`Tuntematon vientimuoto: "${muoto}". Sallittuja ovat: ${sallitutFormaatit.join(", ")}`);
        return;
    }

    haeMuistilaput().then((muistilaput) => {
        if (!muistilaput || muistilaput.length === 0) {
            alert("Ei vietävää dataa.");
            return;
        }

        const timestamp = muodostaTimestamp();
        const tiedostopaate = muoto === "json" ? "json" : "txt";
        const tiedostonimi = `Muisti+laput_${timestamp}.${tiedostopaate}`;
        let blob;

        try {
            if (muoto === "json") {
                const tekstit = muistilaput.map(m => m.teksti);
                blob = new Blob([JSON.stringify(tekstit, null, 2)], { type: 'application/json' });
            } else {
                const kentatIlmanId = Object.keys(muistilaput[0]).filter(avain => avain !== 'id');
                const datarivit = muistilaput.map(m =>
                    kentatIlmanId.map(avain => m[avain]).join(' - ')
                );
                const kaikkiRivit = ['MUISTI+LAPUT', ...datarivit].join('\n');
                blob = new Blob([kaikkiRivit], { type: 'text/plain;charset=utf-8' });
            }

            lataaTiedosto(blob, tiedostonimi);
        } catch (e) {
            alert("Tiedoston vienti epäonnistui. Yritä uudelleen.");
            console.error("Virhe viennissä:", e);
        }
    });
}


function importJson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        let uudetMerkinnat;

        try {
            uudetMerkinnat = JSON.parse(e.target.result);
        } catch (err) {
            alert("Virheellinen JSON-tiedosto. Tarkista tiedoston muoto.");
            return;
        }

        if (!Array.isArray(uudetMerkinnat) || !uudetMerkinnat.every(m => typeof m === "string")) {
            alert("Virheellinen JSON-rakenne. Odotettiin taulukkoa, jossa on pelkkiä tekstiarvoja.");
            return;
        }

        const transaction = db.transaction(["muistilaput"], "readwrite");
        const store = transaction.objectStore("muistilaput");

        uudetMerkinnat.forEach(teksti => store.add(teksti));

        transaction.oncomplete = () => {
            paivitaTaulukko();
            alert("Muistilaput ladattu.");
        };
    };
    reader.readAsText(file);
}

function clearObjectStore() {
    const vahvistus = confirm("Haluatko varmasti tyhjentää kaikki muistilaput?");
    if (!vahvistus) return;

    const transaction = db.transaction(["muistilaput"], "readwrite");
    const store = transaction.objectStore("muistilaput");
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
        paivitaTaulukko();
        alert("Kaikki muistilaput poistettu.");
    };


    clearRequest.onerror = () => {
        alert("Tietokannan tyhjennys epäonnistui.");
    };
}

document.addEventListener("DOMContentLoaded", async () => {
    await avaaTietokanta();
    paivitaTaulukko();

    document.getElementById("lomake").addEventListener("submit", (e) => {
        e.preventDefault();
        const teksti = document.getElementById("muistilappu").value.trim();
        if (teksti) {
            lisaaMuistilappu(teksti);
        }
    });
    document.getElementById("exportTxt").addEventListener("click", () => exportData("txt"));
    document.getElementById("exportJson").addEventListener("click", () => exportData("json"));
    document.getElementById("clearObjectStore").addEventListener("click", clearObjectStore);
    document.getElementById("importJson").addEventListener("change", importJson);
});
