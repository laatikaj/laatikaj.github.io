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
        muistilaput.forEach((muistilappu, index) => {
            const rivi = document.createElement("tr");

            // Numero-solu
            const soluNumero = document.createElement("td");
            soluNumero.textContent = index + 1;
            soluNumero.className = "idx";
            rivi.appendChild(soluNumero);


            // Teksti-solu
            const soluteksti = document.createElement("td");
            soluteksti.textContent = muistilappu.teksti;
            rivi.appendChild(soluteksti);

            // Toiminnot-solu
            const solutoiminnot = document.createElement("td");

            const muokkaaBtn = document.createElement("button");
            muokkaaBtn.innerHTML = '<i class="fas fa-edit"></i>';
            muokkaaBtn.className = 'edit';
            muokkaaBtn.onclick = () => muokkaaMuistilappua(muistilappu.id, muistilappu.teksti);
            solutoiminnot.appendChild(muokkaaBtn);

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
    const taulukko = document.getElementById("muistilaputTaulukko");
    const rivit = taulukko.getElementsByTagName("tr");

    for (let rivi of rivit) {
        const solut = rivi.getElementsByTagName("td");
        if (solut.length >= 3 && solut[1].textContent === vanhaTeksti) {
            rivi.classList.add("muokkaus"); // korostus

            const input = document.createElement("input");
            input.type = "text";
            input.value = vanhaTeksti;
            input.style.width = "100%";
            input.autofocus = true;

            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    tallennaMuokkaus();
                } else if (e.key === "Escape") {
                    peruutaBtn.click();
                }
            });

            input.addEventListener("blur", () => {
                setTimeout(() => {
                    if (document.body.contains(input)) {
                        tallennaMuokkaus();
                    }
                }, 100);
            });


            // Säilötään alkuperäinen teksti varmuuden vuoksi
            const alkuperainenHTML = solut[1].innerHTML;
            solut[1].innerHTML = "";
            solut[1].appendChild(input);
            input.focus();

            // Tallenna-painike
            const tallennaBtn = document.createElement("button");
            tallennaBtn.innerHTML = '<i class="fas fa-check"></i>';
            tallennaBtn.className = 'edit';
            tallennaBtn.title = "Tallenna";
            tallennaBtn.onclick = () => {
                tallennaMuokkaus();
            };

            // Peruuta-painike
            const peruutaBtn = document.createElement("button");
            peruutaBtn.innerHTML = '<i class="fas fa-times"></i>';
            peruutaBtn.className = 'clear';
            peruutaBtn.title = "Peruuta";
            peruutaBtn.onclick = () => {
                solut[1].innerHTML = vanhaTeksti;
                solut[2].innerHTML = "";
                solut[2].appendChild(muokkaaBtn);
                solut[2].appendChild(poistaBtn);
                rivi.classList.remove("muokkaus"); // poista korostus
            };

            // Alkuperäiset muokkaa/poista-painikkeet
            const muokkaaBtn = document.createElement("button");
            muokkaaBtn.innerHTML = '<i class="fas fa-edit"></i>';
            muokkaaBtn.className = 'edit';
            muokkaaBtn.onclick = () => muokkaaMuistilappua(id, vanhaTeksti);

            const poistaBtn = document.createElement("button");
            poistaBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            poistaBtn.className = 'clear';
            poistaBtn.onclick = () => poistaMuistilappu(id);

            // Korvaa painikkeet
            solut[2].innerHTML = "";
            solut[2].appendChild(tallennaBtn);
            solut[2].appendChild(peruutaBtn);

            // Enter = tallenna, Esc = peruuta
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    tallennaMuokkaus();
                } else if (e.key === "Escape") {
                    peruutaBtn.click();
                }
            });

            let onTallennettu = false;

            function tallennaMuokkaus() {
                if (onTallennettu) return; // Estetään tuplatallennus
                onTallennettu = true;

                const uusiTeksti = input.value.trim();
                if (uusiTeksti !== "") {
                    const transaction = db.transaction(["muistilaput"], "readwrite");
                    const store = transaction.objectStore("muistilaput");
                    store.put(uusiTeksti, id).onsuccess = () => {
                        rivi.classList.remove("muokkaus");
                        paivitaTaulukko();
                    };
                }
            }
            break;
        }
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
