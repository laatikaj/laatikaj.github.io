// app.js
import { fetchNotes, fetchKirjurit, deleteNote, updateNote, insertNote } from './api.js';

// Sovelluksen tila
let allNotes = [];
let allKirjurit = [];

/* ==========================
   APUFUNKTIOITA / UTILITIES
   ========================== */

// 1–2000 merkin pituus, sallii kaikki Unicode-merkit (rivinvaihdot, emot, ym.)
// Tarkistaa pituuden, kieltää tietyt merkit ja estää XSS
function isValidNote(text) {
  if (typeof text !== 'string' || text.length === 0 || text.length > 2000) return false;
  // Kielletyt merkit: < " ' ` [ ]
  if (/[<"'`\[\]]/.test(text)) return false;
  // Estä ohjausmerkit (ASCII < 32, pois lukien \n ja \r)
  if (/[<\u0000-\b\u000b\u000c\u000e-\u001f>]/.test(text)) return false;
  // Estä script-tagit ja event-attribuutit
  if (/script|onerror|onload|onmouseover|onfocus|onabort|onblur|onchange|onclick|ondblclick|onkeydown|onkeypress|onkeyup|onmousedown|onmousemove|onmouseout|onmouseover|onmouseup|onreset|onresize|onscroll|onselect|onsubmit|onunload/i.test(text)) return false;
  // Estä liiallinen whitespace
  if (/^\s+$/.test(text)) return false;
  // Varoitus: epäilyttävä sisältö
  if (/javascript:|data:|vbscript:/i.test(text)) {
    console.warn('isValidNote: Suspicious content detected.');
    return false;
  }
  // Estä URL-osoitteet http ja ftp
  if (/(^http:\/\/|^ftp:\/\/)/i.test(text)) return false;
  // Estä toistuvat merkit (esim. 10+ samaa merkkiä)
  if (/(.)\1{9,}/.test(text)) return false;
  // Estä SQL-avainsanat
  if (/\b(select|insert|update|delete|drop|alter|create|truncate|exec|union|--|;|\*)\b/i.test(text)) return false;
  // Estä emoji-merkit (tarkennettu Unicode-alue)
  if (/([\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}])/u.test(text)) return false;
  return true;
}

// Escape HTML for safe rendering
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')
    .replace(/=/g, '&#61;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/\[/g, '&lsqb;')
    .replace(/\]/g, '&rsqb;');
}

// Apufunktio: lisää eventin ja hoitaa virheen automaattisesti
function addSafeEvent(id, event, handler, errorMsg = 'Virhe tapahtumassa') {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Required element #${id} is missing in HTML.`);
  el.addEventListener(event, function(e) {
    try {
      handler(e);
    } catch (err) {
      console.error(errorMsg, err);
      showErrorNotification(errorMsg, err);
    }
  });
}
// Yhtenäinen tapa näyttää virhe-notifikaatio, lisää virheen viesti jos saatavilla
function showErrorNotification(baseMsg, err) {
  let msg = baseMsg;
  if (err && err.message) {
    msg += ` (${err.message})`;
  } else if (err && typeof err === 'string') {
    msg += ` (${err})`;
  }
  showNotification('error', msg);
}
// Yhtenäinen tapa näyttää notifikaatio (info | success | error).
// Edellyttää <div id="notification"></div> HTML:ssä.
function showNotification(type, message) {
  const notification = document.getElementById('notification');
  if (!notification) {
    console.warn('showNotification: Required element #notification is missing in HTML.');
    throw new Error('Required element #notification is missing in HTML.');
  }

    // Always clear previous timeout before setting new notification
  if (showNotification._t) {
    window.clearTimeout(showNotification._t);
    showNotification._t = null;
  }

  notification.innerHTML = `<span>${message}</span><button id="notif-close" style="margin-left:1em;background:none;border:none;font-size:1em;cursor:pointer;width:1.5em;height:1.5em;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">×</button>`;
  notification.className = `notification ${type}`;

  // Manual dismiss
  const closeBtn = document.getElementById('notif-close');
  if (closeBtn) {
    closeBtn.onclick = function () {
      notification.textContent = '';
      notification.className = '';
      if (showNotification._t) {
        window.clearTimeout(showNotification._t);
        showNotification._t = null;
      }
    };
  }
  // Auto dismiss after 4.444 seconds
  showNotification._t = window.setTimeout(() => {
    notification.textContent = '';
    notification.className = '';
  }, 4444);
}

function getKirjuriId() {
  const sel = document.getElementById('kirjuri-select');
  if (!sel) {
    console.warn('getKirjuriId: Required element #kirjuri-select is missing in HTML.');
    throw new Error('Required element #kirjuri-select is missing in HTML.');
  }
  const v = sel.value.trim();
  if (v) return v;
  if (window.kirjuri_id) return window.kirjuri_id;
  return '';
}

function getSalainenAvain() {
  const sel = document.getElementById('key-id');
  if (!sel) {
    console.warn('getSalainenAvain: Required element #key-id is missing in HTML.');
    throw new Error('Required element #key-id is missing in HTML.');
  }
  const v = sel.value.trim();
  if (v) return v;
  return '';
}

/* ==========================
   DATAHAKU JA RENDERÖINTI
   ========================== */

// Hakee muistiinpanot kirjuri_id:llä ja renderöi.
async function fetchAndRenderNotes(kirjuriId) {
  try {
    const key = getSalainenAvain();
    if (!key) {
      // Ei key-tietoa → tyhjennä näkymä ja ilmoita
      renderNotes([]);
      showNotification('error', 'Anna salainen avain, niin saat yhteyden API:in');
      return;
    }

  const notes = await fetchNotes(kirjuriId, key);
  allNotes = Array.isArray(notes) ? notes : [];
  renderNotes(allNotes);

  } catch (err) {
    console.error('Muistilappujen haku epäonnistui:', err);
    showErrorNotification('Muistilappujen haku epäonnistui', err);
  }
}

async function fetchAndRenderKirjurit() {
  try {
    const key = getSalainenAvain();
    if (!key) {
      // Ei key-tietoa → tyhjennä näkymä ja ilmoita
      renderNotes([]);
      showNotification('error', 'Anna salainen avain, niin saat yhteyden API:in');
      return;
    }

    const kirjurit = await fetchKirjurit(key);
    if (Array.isArray(kirjurit)) {
      allKirjurit = kirjurit;
      renderKirjurit(allKirjurit);
    } else {
      console.error('Ei löytynyt:', kirjurit);
      let msg = 'Avaimella ei löytynyt kirjuritietoja';
      if (kirjurit && kirjurit.message) {
        msg += ` (${kirjurit.message})`;
      } else if (kirjurit && typeof kirjurit === 'string') {
        msg += ` (${kirjurit})`;
      }
      showNotification('error', msg);
    }

  } catch (err) {
    console.error('Kirjurihaku epäonnistui:', err);
    showErrorNotification('Kirjurihaku epäonnistui', err);
  }
}

// Luo yhden TR-rivin note-objektista.
function createTableRow(note) {

  const tr = document.createElement('tr');
  tr.setAttribute('contenteditable', 'false');

  // ID
  const idTd = document.createElement('td');
  idTd.className = 'hidden';
  idTd.textContent = note.muistilappu_id;
  idTd.setAttribute('data-original', note.muistilappu_id);

  // TEKSTI (safe)
  const tekstiTd = document.createElement('td');
  tekstiTd.textContent = note.teksti;
  tekstiTd.setAttribute('data-original', note.teksti);

  // MUOKATTU
  const muokattuTd = document.createElement('td');
  muokattuTd.textContent = note.muokattu;

  // TOIMINNOT
  const actionsTd = document.createElement('td');
  const editBtn = document.createElement('button');
  editBtn.innerHTML = '<i class="fas fa-edit"></i>';
  editBtn.className = 'edit-button';
  editBtn.type = 'button';
  editBtn.title = 'Muokkaa';
  editBtn.setAttribute('aria-label', 'Muokkaa muistilappua');

  // Poiston toggle-checkbox (näkyy vasta muokkaustilassa)
  const deleteCheckbox = document.createElement('input');
  deleteCheckbox.className = 'delete-checkbox';
  deleteCheckbox.type = 'checkbox';
  deleteCheckbox.title = 'Valitse poistettavaksi';
  deleteCheckbox.style.display = 'none';
  deleteCheckbox.setAttribute('aria-label', 'Valitse muistilappu poistettavaksi');

  editBtn.onclick = () => enterEditMode(tr, note, { editBtn, deleteCheckbox });

  actionsTd.appendChild(editBtn);
  actionsTd.appendChild(deleteCheckbox);

  // Koosta rivi
  tr.appendChild(idTd);
  tr.appendChild(tekstiTd);
  tr.appendChild(muokattuTd);
  tr.appendChild(actionsTd);

  return tr;
}

// Renderöi muistiinpanot taulukkoon (uusin ylimpänä).
function renderNotes(notes) {
  const tbody = document.getElementById('table-body');
  if (!tbody) {
    console.warn('renderNotes: Required element #table-body is missing in HTML.');
    throw new Error('Required element #table-body is missing in HTML.');
  }

  tbody.innerHTML = '';

  notes.forEach(note => {
    const tr = createTableRow(note);
    tbody.appendChild(tr);
  });
}

// Renderöi kirjurit alasvetovalikkoon (viimeisin ylimpänä).
function renderKirjurit(kirjurit) {
  const valikko = document.getElementById('kirjuri-select');
  if (!valikko) {
    console.warn('renderKirjurit: Required element #kirjuri-select is missing in HTML.');
    throw new Error('Required element #kirjuri-select is missing in HTML.');
  }

  valikko.innerHTML = '';

  kirjurit.forEach(kirjuri => {
    const op = document.createElement('option');
    op.setAttribute('value', kirjuri.id);
    op.textContent = kirjuri.nimi;
    valikko.appendChild(op);
  });

  // Always fetch notes for the selected kirjuri after rendering
  const kirjuriId = valikko.value;
  fetchAndRenderNotes(kirjuriId);
}

/* ==========================
   MUOKKAUS- JA POISTOLOGIIKKA
   ========================== */

// Aktivoi muokkaustilan: tekstisolu contentEditable, näkyviin poistoruutu,
// tallennus- tai poistotoiminto samasta napista tilanteen mukaan.
function enterEditMode(tr, note, { editBtn, deleteCheckbox }) {
  const tekstiTd = tr.children[1];
  const originalText = tekstiTd.getAttribute('data-original') ?? '';

  tekstiTd.setAttribute('contentEditable', 'true');
  tekstiTd.focus();

  // Näytä poistovalitsin
  deleteCheckbox.style.display = 'inline-block';

  // Päivitä toimintanappi "Tallenna"-tilaan
  setActionButton(editBtn, 'save');

  // Toggle: jos poistovalinta on päällä -> roskis, muuten "check"
  deleteCheckbox.onchange = () => {
    if (deleteCheckbox.checked) {
      setActionButton(editBtn, 'delete');
    } else {
      setActionButton(editBtn, 'save');
    }
  };

  // Tallennus / Poisto
  editBtn.onclick = async () => {
    if (deleteCheckbox.checked) {
      // Poistovarmistus
      const confirmed = confirm('Poistetaanko tämä muistilappu pysyvästi?');
      if (!confirmed) {
        deleteCheckbox.checked = false;
        setActionButton(editBtn, 'save');
        return;
      }
      safeAsync(async () => {
        const key = getSalainenAvain();
        await deleteNote(note.kirjuri_id, note.muistilappu_id, key);
        showNotification('success', 'Muistilappu poistettu');
        await fetchAndRenderNotes(note.kirjuri_id);
      }, 'Poisto epäonnistui');
      return;
    }

    // Ei poistoa -> päivitys
    const newText = (tekstiTd.textContent ?? '').trim();

    // Ei muutosta → palaa katselutilaan ja palauta edit-handler
    if (newText === originalText) {
      exitEditMode(tr, note, { editBtn, deleteCheckbox });
      return;
    }

    // Validointi
    if (!isValidNote(newText)) {
      showNotification('error', 'Muistilappu ei ole validi, korjaa sisältöä'); 
      return;
    }

    await safeAsync(async () => {
      const key = getSalainenAvain();
      await updateNote(note.kirjuri_id, note.muistilappu_id, newText, key);
      showNotification('success', 'Muistilappu päivitetty');
      await fetchAndRenderNotes(note.kirjuri_id);
    }, 'Päivitys epäonnistui');
  };
}

// Palauttaa rivin muokkaustilasta katselutilaan ilman uudelleenhakua.
function exitEditMode(tr, note, { editBtn, deleteCheckbox }) {
  const tekstiTd = tr.children[1];
  tekstiTd.setAttribute('contentEditable', 'false');

  setActionButton(editBtn, 'edit');
  deleteCheckbox.checked = false;
  deleteCheckbox.style.display = 'none';

  // Palauta "Muokkaa" -toiminto seuraavaa klikkausta varten
  editBtn.onclick = () => enterEditMode(tr, note, { editBtn, deleteCheckbox });
}

/* Toimintonappien tilanvaihdot */
function setActionButton(btn, type) {
  const icons = {
    edit: '<i class="fas fa-edit"></i>',
    save: '<i class="fas fa-check"></i>',
    delete: '<i class="fas fa-trash-alt"></i>'
  };
  const classes = {
    edit: 'edit-button',
    save: 'save-button',
    delete: 'clear-button'
  };
  const titles = {
    edit: 'Muokkaa',
    save: 'Tallenna',
    delete: 'Poista'
  };
  btn.innerHTML = icons[type];
  btn.className = classes[type];
  btn.title = titles[type];
  btn.setAttribute('aria-label', titles[type] + ' muistilappu');
}

/* ==========================
   LISÄYS (NOPEA LISÄYS -LOMAKE)
   ========================== */

document.getElementById('quick-insert-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const input = document.getElementById('quick-teksti');
  if (!input) {
    console.warn('quick-insert-form: Required element #quick-teksti is missing in HTML.');
    throw new Error('Required element #quick-teksti is missing in HTML.');
  }

  const teksti = (input.value ?? '').trim();

  if (!isValidNote(teksti)) {
    showNotification('error', 'Muistilappu ei ole validi, korjaa sisältöä'); 
    return;
  }

  await safeAsync(async () => {
    const kirjuriId = getKirjuriId();
    const key = getSalainenAvain();
      const result = await insertNote(kirjuriId, teksti, key);
      if (result && !result.error) {
        input.value = '';
        showNotification('success', 'Muistilappu lisätty');
      } else {
        let msg = 'Lisäys epäonnistui';
        if (result && result.message) msg += ` (${result.message})`;
        showNotification('error', msg);
        return;
      }
    //Nollaa laskuri
    const charCount = document.getElementById('char-count');
    charCount.textContent = `0 / 2000`;
    await fetchAndRenderNotes(kirjuriId);
  }, 'Lisäys epäonnistui');
});

/* ==========================
   ALOITUS & INIT
   ========================== */

// Kytke alasvetovalikko: vaihto -> hae uudet muistiinpanot, säilytä valinta
(function initKirjuriSelect() {
  const kirjuriSelect = document.getElementById('kirjuri-select');
  if (!kirjuriSelect) return;

  // Päivitä kirjurit ja aseta valinta kun ne on ladattu
  fetchAndRenderKirjurit();

  kirjuriSelect.addEventListener('change', () => {
    const kirjuriId = getKirjuriId();
    // Reset search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    fetchAndRenderNotes(kirjuriId);
  });
})();

// Merkkilaskuri nopean lisäyksen kenttään
(function initCharCounter() {
  const quickTeksti = document.getElementById('quick-teksti');
  const charCount = document.getElementById('char-count');
  if (!quickTeksti) {
    console.warn('initCharCounter: Required element #quick-teksti is missing in HTML.');
    throw new Error('Required element #quick-teksti is missing in HTML.');
  }
  if (!charCount) {
    console.warn('initCharCounter: Required element #char-count is missing in HTML.');
    throw new Error('Required element #char-count is missing in HTML.');
  }

  const updateCharCount = () => {
    const len = quickTeksti.value.length;
    charCount.textContent = `${len} / 2000`;
    // Valinnainen: varoitus lähellä rajaa
    charCount.style.color = len > 1900 ? 'red' : '';
  };
  quickTeksti.addEventListener('input', updateCharCount);
  const formSubmit = document.getElementById('quick-insert-form');
  formSubmit.addEventListener('submit', updateCharCount);

  updateCharCount(); // init
})();

addSafeEvent('search-form', 'submit', function(e) {
  e.preventDefault();
  const searchInput = document.getElementById('search-input');
  if (!searchInput) throw new Error('Required element #search-input is missing in HTML.');
  const keyword = searchInput.value.trim().toLowerCase();
  const filtered = allNotes.filter(note => (note.teksti || '').toLowerCase().includes(keyword));
  renderNotes(filtered);
}, 'Hakutoiminto epäonnistui');

addSafeEvent('key-id', 'focusout', function() {
  fetchAndRenderKirjurit();
  const kirjuriId = getKirjuriId();
  if (kirjuriId) {
    fetchAndRenderNotes(kirjuriId);
  }
}, 'Avainkentän käsittely epäonnistui');

async function safeAsync(fn, errorMsg) {
  try {
    await fn();
  } catch (err) {
    console.error(errorMsg, err);
    showErrorNotification(errorMsg, err);
  }
}
