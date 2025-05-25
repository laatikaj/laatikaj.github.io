import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@4.0.11/dist/dexie.mjs';

const db = new Dexie("MuistiPlusDB");
db.version(14).stores({
    muistilaput: '++id,muistilappu,muokattu'
});

document.addEventListener("DOMContentLoaded", () => {
    setCurrentYear();
    initializeEventListeners();
    safeLoadTable();
});

function setCurrentYear() {
    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }
}

function initializeEventListeners() {
    const faqButton = document.getElementById('faqButton');
    if (faqButton) {
        faqButton.addEventListener('click', toggleFAQ);
    }
    const form = document.getElementById('lomake');
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            addText();
        });
    }
    const exportTxt = document.getElementById('exportTxt');
    if (exportTxt) {
        exportTxt.addEventListener('click', () => exportData('txt'));
    }
    const exportJson = document.getElementById('exportJson');
    if (exportJson) {
        exportJson.addEventListener('click', () => exportData('json'));
    }
    const fileInput = document.getElementById('importJson');
    if (fileInput) {
        fileInput.addEventListener('change', importData);
    }
    const deleteData = document.getElementById('clearObjectStore');
    if (deleteData) {
        deleteData.addEventListener('click', () => clearObjectStore());
    }
}
async function addText() {
    const inputEl = document.getElementById('textInput');
    const textInput = inputEl.value.trim();

    if (textInput) {
        try {
            const timestamp = new Date().toISOString();
            const id = await db.muistilaput.add({
                muistilappu: textInput,
                muokattu: timestamp
            });

            const newItem = { id, muistilappu: textInput, muokattu: timestamp };
            addRowToTable(newItem, true);
            inputEl.value = "";
        } catch (error) {
            console.error("Virhe tallennuksessa:", error);
            showNotification("Muistilapun lisääminen epäonnistui.", "error");   
        }
    }
}

async function safeLoadTable() {
    try {
        await loadTable();
    } catch (error) {
        console.error("Error loading table:", error);
        showNotification("Virhe tapahtui taulukon lataamisen aikana. Yritä myöhemmin uudelleen.", "error");

    }
}

async function loadTable() {
    const tableBody = document.getElementById('textTable');
    tableBody.innerHTML = "";

    const rows = await db.muistilaput.orderBy('muokattu').reverse().toArray();
    rows.forEach(item => addRowToTable(item));
}

function addRowToTable(item, toTop = false) {
    const table = document.getElementById('textTable');
    const newRow = table.insertRow(toTop ? 0 : -1);
    newRow.setAttribute('data-id', item.id);

    const textCell = newRow.insertCell(0);
    const actionCell = newRow.insertCell(1);

    textCell.textContent = item.muistilappu;
    textCell.setAttribute('contentEditable', 'false');

    const editButton = createEditButton(item.id, textCell);
    const checkbox = createDeleteCheckbox(editButton);

    actionCell.appendChild(editButton);
    actionCell.appendChild(checkbox);
}

function createEditButton(id, textCell) {
    const button = document.createElement("button");
    button.innerHTML = '<i class="fas fa-edit"></i>';
    button.className = "edit";
    button.type = "button";
    button.title = "Muokkaa";

    button.onclick = () => toggleEdit(id, textCell, button);
    return button;
}

function createDeleteCheckbox(button) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "delete-checkbox";
    checkbox.title = "Valitse poistettavaksi";
    checkbox.style.display = "none";

    checkbox.onchange = () => {
        button.innerHTML = checkbox.checked ? '<i class="fas fa-trash-alt"></i>' : '<i class="fas fa-check"></i>';
        button.className = checkbox.checked ? "clear" : "save";
        button.title = checkbox.checked ? "Poista" : "Tallenna";
    };

    return checkbox;
}

function toggleEdit(id, cell, button) {
    const row = cell.closest("tr");
    const checkbox = row.querySelector(".delete-checkbox");

    if (cell.isContentEditable) {
        handleSave(id, cell, button, checkbox);
    } else {
        enableEditing(cell, button, checkbox);
    }
}

function enableEditing(cell, button, checkbox) {
    cell.setAttribute('contentEditable', 'true');
    cell.focus();
    button.innerHTML = '<i class="fas fa-check"></i>';
    button.className = "save";
    button.title = "Tallenna";
    checkbox.style.display = "inline-block";
}

async function handleSave(id, cell, button, checkbox) {
    cell.setAttribute('contentEditable', 'false');

    if (checkbox.checked) {
        const confirmed = confirm("Poistetaanko tämä muistilappu pysyvästi?");
        if (confirmed) {
            await deleteRow(id);
            removeRowFromTable(id);
        } else {
            checkbox.checked = false;
        }
    } else {
        const updatedText = cell.textContent.trim();
        if (!validateInput(updatedText)) {
            await revertToOriginal(cell, id);
            return;
        }
        await updateDatabase(id, updatedText);
        updateRowTimestamp(id);
    }

    resetButtonAndCheckbox(button, checkbox);
}

function validateInput(input) {
    if (!input) {
        showNotification("Muistilappu ei saa olla tyhjä!", "error");
        return false;
    }
    return true;
}

async function deleteRow(id) {
    try {
        await db.muistilaput.delete(id);
    } catch (error) {
        console.error("Virhe poistossa:", error);
        showNotification("Muistilapun poistaminen epäonnistui.", "error");
    }
}

function removeRowFromTable(id) {
    const row = document.querySelector(`tr[data-id='${id}']`);
    if (row) row.remove();
}

async function revertToOriginal(cell, id) {
    try {
        const original = await db.muistilaput.get(id);
        if (original) {
            cell.textContent = original.muistilappu;
        }
    } catch (error) {
        console.error("Virhe palautettaessa alkuperäistä sisältöä:", error);
    }
}
async function updateDatabase(id, updatedText) {
    try {
        const existing = await db.muistilaput.get(id);
        if (!existing) {
            console.warn(`Muistilappua id:llä ${id} ei löytynyt.`);
            return;
        }

        // Skip update if text is identical
        if (existing.muistilappu === updatedText) {
            console.log("Ei muutoksia – päivitys ohitettu.");
            return;
        }

        const timestamp = new Date().toISOString();
        await db.muistilaput.update(id, {
            muistilappu: updatedText,
            muokattu: timestamp
        });
    } catch (error) {
        console.error("Virhe päivityksessä:", error);
        showNotification("Muistilapun päivittäminen epäonnistui.", "error");
    }
}

function updateRowTimestamp(id) {
    const row = document.querySelector(`tr[data-id='${id}']`);
    if (row) {
        const tableBody = document.getElementById('textTable');
        const rows = Array.from(tableBody.rows);
        rows.sort((a, b) => {
            const aTimestamp = new Date(a.getAttribute('data-timestamp'));
            const bTimestamp = new Date(b.getAttribute('data-timestamp'));
            return bTimestamp - aTimestamp;
        });
        rows.forEach(row => tableBody.appendChild(row));
    }
}

function resetButtonAndCheckbox(button, checkbox) {
    button.innerHTML = '<i class="fas fa-edit"></i>';
    button.className = "edit";
    checkbox.checked = false;
    button.title = "Muokkaa";
    checkbox.style.display = "none";
}

function toggleFAQ() {
    const faq = document.getElementById('faq');
    faq.classList.toggle('visible');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const muistilaputArray = JSON.parse(e.target.result);
            if (!Array.isArray(muistilaputArray)) throw new Error("Virheellinen tiedostomuoto.");

            const timestamp = new Date().toISOString();
            const newObjects = muistilaputArray.map(item => {
                if (typeof item === "string") {
                    return { muistilappu: item, muokattu: timestamp };
                } else if (typeof item === "object" && item.muistilappu) {
                    return { muistilappu: item.muistilappu, muokattu: timestamp };
                } else {
                    throw new Error("Virheellinen muistilapun muoto.");
                }
            });

            await db.muistilaput.bulkAdd(newObjects);
            showNotification("Tiedot tuotu onnistuneesti.", "success");
            safeLoadTable();
        } catch (error) {
            console.error("Virhe tuonnissa:", error);
            showNotification("Tiedostoa ei voitu tuoda. Varmista, että tiedosto on oikeassa muodossa.", "error");
        }
        finally {
            // Tyhjennetään tiedostovalitsin
            event.target.value = ""; 
        }
    };
    reader.readAsText(file);
}

function exportData(format) {
    const sallitutFormaatit = ["json", "txt"];
    if (!sallitutFormaatit.includes(format)) {
        showNotification(`Tuntematon vientimuoto: "${format}". Sallittuja ovat: ${sallitutFormaatit.join(", ")}`, "info");
        return;
    }
    db.muistilaput.toArray().then((data) => {
        if (!data || data.length === 0) {
            showNotification("Ei vietävää dataa.", "info");
            return;
        }
        let blob;
        try {

            if (format === 'txt') {
                let text = 'MUISTI+LAPUT (' + data.length + ')\n\n';
                text += data.map(item => item.muistilappu).join('\n\n');
                text += '\n\n\n--------------------------------\nLadattu: ' + new Date().toLocaleString();
                blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            }
            else {
                const muistilaputOnly = data.map(item => item.muistilappu);
                const json = JSON.stringify(muistilaputOnly, null, 2);
                blob = new Blob([json], { type: 'application/json' });
            }
            const now = new Date();
            const pad = n => n.toString().padStart(2, '0');
            const yyyymmdd = now.getFullYear().toString() +
                pad(now.getMonth() + 1) +
                pad(now.getDate());
            const hhmmss = pad(now.getHours()) +
                pad(now.getMinutes()) +
                pad(now.getSeconds());
            const timestamp = `${yyyymmdd}_${hhmmss}`;
            const fileName = `Muisti+laput_${timestamp}.${format}`;


            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        catch (error) {
            console.error("Virhe vientiprosessissa:", error);
            showNotification("Tiedoston vienti epäonnistui. Yritä uudelleen.", "error");
        }
    });
}

function clearObjectStore() {
    const vahvistus = confirm("Haluatko varmasti poistaa KAIKKI muistilaput?");
    if (!vahvistus) return; // Ei poisteta, jos käyttäjä peruuttaa
    // Poistetaan muistilaput
    db.muistilaput.clear().then(() => {
        safeLoadTable();
        showNotification("Kaikki muistilaput poistettu.", "success");
    }).catch((error) => {
        console.error("Virhe poistossa:", error);
        showNotification("Muistilappujen poisto epäonnistui.", "error");
    });
}
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}