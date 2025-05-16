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

    haeMuistiinpanot().then(muistiinpanot => {
        muistiinpanot.forEach(muistiinpano => {
            const rivi = document.createElement("tr");

            // Teksti soluun
            const soluteksti = document.createElement("td");
            soluteksti.textContent = muistiinpano.teksti;
            rivi.appendChild(soluteksti);

            // Toiminnot soluun
            const solutoiminnot = document.createElement("td");

            // Muokkauspainike
            const muokkaaBtn = document.createElement("button");
            muokkaaBtn.innerHTML = '<i class="fas fa-edit"></i> Muokkaa';
            muokkaaBtn.className = 'muokkaa-nappi';
            muokkaaBtn.onclick = () => muokkaaMuistiinpanoa(muistiinpano.id, muistiinpano.teksti);
            solutoiminnot.appendChild(muokkaaBtn);

            // Poistopainike
            const poistaBtn = document.createElement("button");
            poistaBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Poista';
            poistaBtn.className = 'poista-nappi';
            poistaBtn.onclick = () => poistaMuistiinpano(muistiinpano.id);
            solutoiminnot.appendChild(poistaBtn);

            rivi.appendChild(solutoiminnot);
            taulukko.appendChild(rivi);
        });
    });
}

function muokkaaMuistiinpanoa(id, vanhaTeksti) {
    const uusiTeksti = prompt("Muokkaa muistiinpanoa:", vanhaTeksti); // Näytetään nykyinen teksti promptissa
    if (uusiTeksti !== null && uusiTeksti.trim() !== "") { //Tallennetaan jos tekstiä on
        const transaction = db.transaction(["muistiinpanot"], "readwrite");
        const store = transaction.objectStore("muistiinpanot");
        store.put(uusiTeksti, id).onsuccess = () => {  // Tallennetaan uusi teksti ID:n mukaan
            paivitaTaulukko(); // Päivitetään taulukko
        };
    }
}

function poistaMuistiinpano(id) {
    const vahvistus = confirm("Haluatko varmasti poistaa tämän muistiinpanon?");
    if (!vahvistus) return; // Ei poisteta, jos käyttäjä peruuttaa

    const transaction = db.transaction(["muistiinpanot"], "readwrite");
    const store = transaction.objectStore("muistiinpanot");
    store.delete(id).onsuccess = () => {
        paivitaTaulukko(); // Päivitetään taulukko poistamisen jälkeen
    };
}

function tallennaJSON() {
    haeMuistiinpanot().then((muistiinpanot) => {
        const tekstit = muistiinpanot.map(m => m.teksti);
        const blob = new Blob([JSON.stringify(tekstit, null, 2)], { type: 'application/json' });

        // Muodostetaan timestamp muodossa: YYYYMMDD_HHMMSS
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
                          String(now.getMonth() + 1).padStart(2, '0') +
                          String(now.getDate()).padStart(2, '0') + "_" +
                          String(now.getHours()).padStart(2, '0') +
                          String(now.getMinutes()).padStart(2, '0') +
                          String(now.getSeconds()).padStart(2, '0');

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `muistiinpanot_${timestamp}.json`;  // Esim. muistiinpanot_20250516_143045.json
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

        const transaction = db.transaction(["muistiinpanot"], "readwrite");
        const store = transaction.objectStore("muistiinpanot");

        uudetMerkinnat.forEach(teksti => store.add(teksti));

        transaction.oncomplete = () => {
            paivitaTaulukko();
            alert("Muistiinpanot ladattu.");
        };
    };
    reader.readAsText(file);
}

function tyhjennaTietokanta() {
    const vahvistus = confirm("Haluatko varmasti tyhjentää kaikki muistiinpanot?");
    if (!vahvistus) return;

    const transaction = db.transaction(["muistiinpanot"], "readwrite");
    const store = transaction.objectStore("muistiinpanot");
    store.clear().onsuccess = () => {
        paivitaTaulukko();
        alert("Kaikki muistiinpanot poistettu.");
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
        const teksti = document.getElementById("muistiinpano").value.trim();
        if (teksti) {
            lisaaMuistiinpano(teksti);
        }
    });

    document.getElementById("exportBtn").addEventListener("click", tallennaJSON);
    document.getElementById("importFile").addEventListener("change", lataaJSON);
    document.getElementById("clearBtn").addEventListener("click", tyhjennaTietokanta);
});
