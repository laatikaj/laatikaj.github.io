import Sortable from 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/modular/sortable.esm.js';
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.5/dist/dexie.mjs';

// Create a Dexie database and define the table schema
const db = new Dexie("KeyValueDB");
db.version(14).stores({
    valueList: '++id, idx, key, value'  // 'id' is the primary key
});

// Open the database
await db.open().catch((err) => {
    console.error("Failed to open database:", err);
});

const addButton = document.querySelector('button:nth-child(1)');
const editButton = document.querySelector('button:nth-child(2)');
const deleteButton = document.querySelector('button:nth-child(3)');
const tbody = document.getElementById('myrows');

let selectedRow = null;
let enterListener = null;

function updateButtonState() {
    const isSelected = selectedRow !== null;
    editButton.disabled = !isSelected;
    deleteButton.disabled = !isSelected;
}

function setupRowSelection(row) {
    row.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;

        // Jos valitaan uusi rivi ja vanha rivi oli muokkaustilassa → tallennetaan se
        if (selectedRow && selectedRow !== row && selectedRow.querySelector('input')) {
            const cells = selectedRow.querySelectorAll('td');
            const inputs = selectedRow.querySelectorAll('input');
            inputs.forEach((input, i) => {
                cells[i].textContent = input.value.trim();
            });

            editButton.textContent = 'Edit';
            editButton.onclick = null;
            document.removeEventListener('keydown', enterListener);
        }

        // Tavallinen valintalogiikka
        if (row === selectedRow) {
            row.classList.remove('selected');
            selectedRow = null;
        } else {
            if (selectedRow) {
                selectedRow.classList.remove('selected');
            }
            row.classList.add('selected');
            selectedRow = row;
        }

        updateButtonState();
    });
}

// Load initial data from DB
async function loadRows() {
    const all = await db.valueList.toArray();
    all.forEach(record => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', record.id);
        row.innerHTML = `
            <td>${record.idx}</td>    
            <td>${record.key}</td>
            <td>${record.value}</td>    
        `;
        tbody.appendChild(row);
        setupRowSelection(row);
    });
}

await loadRows();



// Lisää uusi rivi
addButton.addEventListener('click', () => {
    const newRow = document.createElement('tr');
    newRow.setAttribute('data-id', 'id');
    newRow.innerHTML = `
    <td>?</td>
    <td>?</td>
    <td>0</td>
  `;
    tbody.appendChild(newRow);
    setupRowSelection(newRow);
});


deleteButton.addEventListener('click', () => {
    if (!selectedRow) return;

    // Näytä modaalinen vahvistusikkuna
    const modal = document.getElementById('confirmModal');
    modal.style.display = 'flex';

    // Kun klikataan "Yes"
    const yesButton = document.getElementById('confirmYes');
    const cancelButton = document.getElementById('confirmCancel');

    const closeModal = () => {
        modal.style.display = 'none';
        yesButton.removeEventListener('click', onYes);
        cancelButton.removeEventListener('click', onCancel);
    };

     const onYes = async () => {
        const id = parseInt(selectedRow.getAttribute('data-id'));
        await db.valueList.delete(id);
        selectedRow.remove();
        selectedRow = null;
        updateButtonState();
        closeModal();
    };

    const onCancel = () => {
        closeModal();
    };

    yesButton.addEventListener('click', onYes);
    cancelButton.addEventListener('click', onCancel);
});

// Sulje modaalinen ikkuna, kun käyttäjä klikkaa ulkopuolelle
window.addEventListener('click', (event) => {
    const modal = document.getElementById('confirmModal');
    if (modal.style.display === 'flex' && event.target === modal) {
        modal.style.display = 'none';
    }
});

// Editoi valittua riviä
editButton.addEventListener('click', () => {
    if (!selectedRow) return;

    const cells = selectedRow.querySelectorAll('td');
    const originalValues = [];

    if (selectedRow.querySelector('input')) return;

    for (let i = 0; i < cells.length; i++) {
        originalValues.push(cells[i].textContent);
        cells[i].innerHTML = `<input type="text" value="${cells[i].textContent}" style="width: 100%; font-size: inherit;">`;
    }

    const inputs = selectedRow.querySelectorAll('input');
    if (inputs.length > 0) inputs[0].focus();

    const saveRow = () => {
        inputs.forEach((input, i) => {
            cells[i].textContent = input.value.trim() || originalValues[i];
        });

        editButton.textContent = 'Edit';
        document.removeEventListener('keydown', enterListener);
        updateButtonState();
    };
    
    editButton.textContent = 'Save';

    enterListener = function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveRow();
        }
    };

    document.addEventListener('keydown', enterListener);

    editButton.onclick = () => {
        saveRow();
        editButton.onclick = null;
    };
});

// Aktivoi valinta olemassa oleville riveille
document.querySelectorAll('#myrows tr').forEach(setupRowSelection);

// Sortable (ESM)
new Sortable(tbody, {
    animation: 150,
    onEnd: function (evt) {
        console.log('Row moved:', evt.item);
    }
});

updateButtonState();
