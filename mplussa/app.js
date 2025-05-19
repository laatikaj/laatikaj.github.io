
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.5/dist/dexie.mjs';

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
    const addTextButton = document.getElementById('addTextButton');
    if (addTextButton) {
        addTextButton.addEventListener('click', addText);
    }
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
            alert("Muistilapun lisääminen epäonnistui.");
        }
    }
}

async function safeLoadTable() {
    try {
        await loadTable();
    } catch (error) {
        console.error("Error loading table:", error);
        alert("Virhe tapahtui taulukon lataamisen aikana. Yritä myöhemmin uudelleen.");
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

    const idCell = newRow.insertCell(0);
    const textCell = newRow.insertCell(1);
    const actionCell = newRow.insertCell(2);

    idCell.textContent = item.id;
    idCell.className = "idx";
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
        alert("Muistilappu ei saa olla tyhjä!");
        return false;
    }
    return true;
}

async function deleteRow(id) {
    try {
        await db.muistilaput.delete(id);
    } catch (error) {
        console.error("Virhe poistossa:", error);
        alert("Muistilapun poistaminen epäonnistui.");
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
        alert("Muistilapun päivittäminen epäonnistui.");
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
