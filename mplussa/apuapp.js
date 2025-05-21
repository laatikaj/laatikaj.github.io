
//todo uusin rivi ylimmäksi
//todo sorttaus?

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


/* LISÄÄ MOBIILIN TYYLIT!!
@media only screen and (max-width: 600px) {
    body {
        margin: 5px;
        font-size: 10px;
    }

    h1 {
        font-size: 24px;
    }

    h2 {
        font-size: 18px;
    }

    h3 {
        font-size: 16px;
    }

    button.rect {
        padding-top: 4px;
        padding-bottom: 4px;
        padding-left: 10px;
        padding-right: 10px;
        font-size: 10px;
    }

    button.edit,
    button.clear,
    button.save {
        height: 25px;
        width: 25px;
        font-size: 12px;
    }
}


body {
    -webkit-text-size-adjust: none;
    font-family: Helvetica, Arial, Verdana, sans-serif;
    margin: 10px;
    margin-bottom: 100px;
    font-size: 12px;
}

div {
    clear: both !important;
    width: 100% !important;
    float: none !important;
    margin: 0 !important;
}

h1 {
    font-size: 32px;
}

h2 {
    font-size: 20px;
}

h3 {
    font-size: 18px;
}

textarea {
    height: 50px;
    font-size: 11px;
}

button.rect {
    padding-top: 5px;
    padding-bottom: 5px;
    padding-left: 15px;
    padding-right: 15px;
    font-size: 11px;
}

button.edit,
button.clear,
button.save {
    height: 30px;
    width: 30px;
    font-size: 14px;
}

button.about {
    font-size: 20px;
    margin: 5px;
    padding-top: 4px;
    padding-bottom: 4px;
    padding-left: 8px;
    padding-right: 8px;
}

button:hover {
    box-shadow: 0 1px 3px rgba(47, 79, 79, 0.5);
}

table {
    margin-top: 10px;
}

th {
    padding: 4px;
    font-size: 14px;
}

td {
    padding: 4px;
}

code {
    font-size: 11px;
}

.collapsible {
    font-size: 9px;
    margin-top: 40px;
}

.jsonContent {
    padding-left: 4px;
    padding-top: 0;
    padding-bottom: 8px;
    padding-right: 4px;
    font-size: 9px;
}

.json-header {
    padding-top: 7px;
}

.delete-checkbox {
    margin-left: 8px;
    height: 15px;
    width: 15px;
}

.faq {
    padding: 5px;
  }

.footer {
    font-size: 9px;
    padding-top: 5px;
}

*/