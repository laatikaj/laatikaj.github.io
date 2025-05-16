let db;

function avaaTietokanta() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("MuistiinpanotDB", 1);

        request.onerror = (event) => {
            console.error("IndexedDB-virhe:", event.target.errorCode);
            reject(event.target.errorCode);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            db.createObjectStore("muistiinpanot", { autoIncrement: true });
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
    });
}

function lisaaMuistiinpano(teksti) {
    const transaction = db.transaction(["muistiinpanot"], "readwrite");
    const store = transaction.objectStore("muistiinpanot");
    store.add(teksti);
    transaction.oncomplete = () => {
        document.getElementById("muistiinpano").value = "";
        paivitaTaulukko();
    };
}

function haeMuistiinpanot() {
    return new Promise((resolve) => {
        const transaction = db.transaction(["muistiinpanot"], "readonly");
        const store = transaction.objectStore("muistiinpanot");

        const muistiinpanot = [];
        store.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                muistiinpanot.push({ id: cursor.key, teksti: cursor.value });
                cursor.continue();
            } else {
                resolve(muistiinpanot);
            }
        };
    });
}

function paivitaTaulukko() {
    const taulukko = document.getElementById("muistiinpanotTaulukko");
    taulukko.innerHTML = "";  // Tyhjennetään taulukko

    const transaction = db.transaction(["muistiinpanot"], "readonly");
    const store = transaction.objectStore("muistiinpanot");

    store.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            const rivi = document.createElement("tr");

            // Teksti soluun
            const soluteksti = document.createElement("td");
            soluteksti.textContent = cursor.value;  // Tekstiarvo
            rivi.appendChild(soluteksti);

            // Toiminnot soluun
            const solutoiminnot = document.createElement("td");

            // Muokkauspainike
            const muokkaaBtn = document.createElement("button");
            muokkaaBtn.textContent = "Muokkaa";
            // Liitetään tapahtumakäsittelijä oikealla ID:llä ja tekstillä
            muokkaaBtn.onclick = function() {
                muokkaaMuistiinpanoa(cursor.key, cursor.value);
            };
            solutoiminnot.appendChild(muokkaaBtn);

            // Poistopainike
            const poistaBtn = document.createElement("button");
            poistaBtn.textContent = "Poista";
            // Liitetään tapahtumakäsittelijä oikealla ID:llä
            poistaBtn.onclick = function() {
                poistaMuistiinpano(cursor.key);
            };
            solutoiminnot.appendChild(poistaBtn);

            rivi.appendChild(solutoiminnot);  // Lisätään toiminnot-riviin

            taulukko.appendChild(rivi);  // Lisätään rivi taulukkoon

            cursor.continue();  // Jatketaan seuraavaan
        }
    };
}


function tallennaJSON() {
    haeMuistiinpanot().then((muistiinpanot) => {
        const blob = new Blob([JSON.stringify(muistiinpanot, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'muistiinpanot.json';
        link.click();
    });
}

function lataaJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
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

        // 1. Haetaan olemassa olevat muistiinpanot
        const olemassaOlevat = await haeMuistiinpanot();
        const olemassaOlevatTekstit = new Set(olemassaOlevat.map(m => m.teksti));

        // 2. Suodatetaan vain uudet
        const lisattavat = uudetMerkinnat.filter(teksti => !olemassaOlevatTekstit.has(teksti));

        if (lisattavat.length === 0) {
            alert("Kaikki merkinnät olivat jo tietokannassa.");
            return;
        }

        // 3. Lisätään vain uudet merkinnät
        const transaction = db.transaction(["muistiinpanot"], "readwrite");
        const store = transaction.objectStore("muistiinpanot");

        lisattavat.forEach(teksti => {
            store.add(teksti);
        });

        transaction.oncomplete = () => {
            paivitaTaulukko();
            alert(`Lisättiin ${lisattavat.length} uutta muistiinpanoa.`);
        };

        transaction.onerror = () => {
            alert("Virhe tallennettaessa muistiinpanoja.");
        };
    };

    reader.readAsText(file);
}

function tyhjennaTietokanta() {
    const vahvistus = confirm("Haluatko varmasti tyhjentää kaikki muistiinpanot?");
    if (!vahvistus) return;

    const transaction = db.transaction(["muistiinpanot"], "readwrite");
    const store = transaction.objectStore("muistiinpanot");

    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
        paivitaTaulukko();
        alert("Kaikki muistiinpanot poistettu.");
    };

    clearRequest.onerror = () => {
        alert("Tietokannan tyhjennys epäonnistui.");
    };
}

function muokkaaMuistiinpanoa(id, vanhaTeksti) {
    const uusiTeksti = prompt("Muokkaa muistiinpanoa:", vanhaTeksti);  // Näytetään nykyinen teksti promptissa
    if (uusiTeksti === null || uusiTeksti.trim() === "") return;  // Ei tallenneta, jos ei tekstiä

    const transaction = db.transaction(["muistiinpanot"], "readwrite");
    const store = transaction.objectStore("muistiinpanot");

    store.put(uusiTeksti, id).onsuccess = () => {  // Tallennetaan uusi teksti ID:n mukaan
        paivitaTaulukko();  // Päivitetään taulukko
    };
}

function poistaMuistiinpano(id) {
    const vahvistus = confirm("Haluatko varmasti poistaa tämän muistiinpanon?");
    if (!vahvistus) return;  // Ei poisteta, jos käyttäjä peruuttaa

    const transaction = db.transaction(["muistiinpanot"], "readwrite");
    const store = transaction.objectStore("muistiinpanot");

    store.delete(id).onsuccess = () => {
        paivitaTaulukko();  // Päivitetään taulukko poistamisen jälkeen
    };
}

document.addEventListener("DOMContentLoaded", async () => {
    await avaaTietokanta();
    paivitaTaulukko();

    document.getElementById("lomake").addEventListener("submit", (e) => {
        e.preventDefault();
        const teksti = document.getElementById("muistiinpano").value.trim();
        if (teksti) {
            lisaaMuistiinpano(teksti);
        }
    });

    document.getElementById("exportBtn").addEventListener("click", tallennaJSON);
    document.getElementById("importFile").addEventListener("change", lataaJSON);
    document.getElementById("clearBtn").addEventListener("click", tyhjennaTietokanta);
});

