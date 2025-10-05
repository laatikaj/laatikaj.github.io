// api.js 
const endpoint = 'https://worker-april-fool-0104.laatikaj.workers.dev/';

function escapeSqlString(s) {
    // Korvaa yksittäiset heittomerkit SQL-escaped-versioon (' -> '')
    return String(s ?? '').replace(/'/g, "''");
}

async function sendSQL(sql, key_id) {
    const key = escapeSqlString(key_id);
    
    let response;
    try {
        response = await fetch(endpoint + 'dataset?key=' + key, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: [{ sql }] })
        });
    } catch (err) {
        return { error: true, status: 0, message: 'Network error', details: err };
    }

    if (!response.ok) {
        let msg = `HTTP error: ${response.status}`;
        const statusMessages = {
            400: 'Bad Request',
            403: 'Forbidden',
            404: 'Not Found',
            500: 'Internal Server Error'
        };
        msg = statusMessages[response.status] || msg;
        // Include original status text for debugging
        return { error: true, status: response.status, message: msg, statusText: response.statusText };
    }
    try {
        return await response.json();
    } catch (err) {
        return { error: true, status: response.status, message: 'Invalid JSON', details: err };
    }
}

export async function login(key_id) {
    console.log('API / login');

    let response;
    try {
        response = await fetch(endpoint + 'login?key=' + key_id, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return { error: true, status: 0, message: 'Network error', details: err };
    }

    if (!response.ok) {
        let msg = `HTTP error: ${response.status}`;
        const statusMessages = {
            400: 'Bad Request',
            403: 'Forbidden',
            404: 'Not Found',
            500: 'Internal Server Error'
        };
        msg = statusMessages[response.status] || msg;
        // Include original status text for debugging
        return { error: true, status: response.status, message: msg, statusText: response.statusText };
    }
    return { error: false, status: response.status, message: 'Key validated successfully', parseWarning: true };
}

export async function fetchNotes(kirjuri_id_val, key_id) {
    const kid = escapeSqlString(kirjuri_id_val);
    console.log('API / fetchNotes /', kid);

    const sql = `SELECT muistilappu_id, teksti, kirjuri_id, muokattu FROM muistilappu WHERE kirjuri_id = '${kid}' ORDER BY muokattu DESC LIMIT 144`;
    const data = await sendSQL(sql, key_id);
    if (data?.error) return data;
    const rows = data?.results?.[0]?.response?.result?.rows ?? [];

    // Muunna array-rivit objektilistaksi
    const notes = rows.map(r => {
        const muokattuRaw = r?.[3]?.value ?? '';
        let muokattu = '';
        if (muokattuRaw) {
            const d = new Date(muokattuRaw);
            if (!isNaN(d)) {
                const pad = n => n.toString().padStart(2, '0');
                muokattu = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear().toString().slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
            }
        }
        return {
            muistilappu_id: r?.[0]?.value ?? '',
            teksti: r?.[1]?.value ?? '',
            kirjuri_id: r?.[2]?.value ?? '',
            muokattu
        };
    });

    return notes;
}

export async function fetchKirjurit(key_id) {
    console.log('API / fetchKirjurit /');        
    const sql = `SELECT kirjuri_id, nimimerkki FROM kirjuri WHERE aktiivinen = 1 ORDER BY vierailuaika DESC LIMIT 20`;
    const data = await sendSQL(sql, key_id);
    if (data?.error) return data;
    const rows = data?.results?.[0]?.response?.result?.rows ?? [];

    // Muunna array-rivit objektilistaksi
    const kirjurit = rows.map(r => ({
        id: r?.[0]?.value ?? '',
        nimi: r?.[1]?.value ?? ''
    }));

    return kirjurit;
}

export async function deleteNote(kirjuri_id_val, muistilappu_id, key_id) {
    const kid = escapeSqlString(kirjuri_id_val);
    const mid = escapeSqlString(muistilappu_id);
    console.log('API / deleteNote /', kid, '/', mid);

    const sql = `DELETE FROM muistilappu WHERE kirjuri_id = '${kid}' AND muistilappu_id = '${mid}'`;
    const data = await sendSQL(sql, key_id);
    return data;
}

export async function updateNote(kirjuri_id_val, muistilappu_id, newText, key_id) {
    const kid = escapeSqlString(kirjuri_id_val);
    const mid = escapeSqlString(muistilappu_id);
    const txt = escapeSqlString(newText);
    console.log('API / updateNote /', kid, '/', mid, '/', txt);
    const sql = `
    UPDATE muistilappu SET teksti = '${txt}', muokattu = CURRENT_TIMESTAMP WHERE kirjuri_id = '${kid}' AND muistilappu_id = '${mid}'`;
    const data = await sendSQL(sql, key_id);
    return data;
}

export async function insertNote(kirjuri_id_val, teksti, key_id) {
    const kid = escapeSqlString(kirjuri_id_val);
    const txt = escapeSqlString(teksti);
    console.log('API / insertNote /', kid, '/', txt);
    
    const sql = `INSERT INTO muistilappu (teksti, kirjuri_id) VALUES ('${txt}', '${kid}')`;
    const data = await sendSQL(sql, key_id);
    return data;
}
