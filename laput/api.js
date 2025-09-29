// api.js 
const endpoint = 'https://worker-april-fool-0104.laatikaj.workers.dev/';
const path = endpoint + 'laput?key=';

function escapeSqlString(s) {
    // Korvaa yksittäiset heittomerkit SQL-escaped-versioon (' -> '')
    return String(s ?? '').replace(/'/g, "''");
}

async function sendSQL(sql, key_id) {
    const key = escapeSqlString(key_id);
    let response;
    try {
        response = await fetch(path + key, {
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
        return { error: true, status: response.status, message: msg };
    }
    try {
        return await response.json();
    } catch (err) {
        return { error: true, status: response.status, message: 'Invalid JSON', details: err };
    }
}

export async function fetchNotes(kirjuri_id_val, key_id) {
    const kid = escapeSqlString(kirjuri_id_val);
    console.log('API / fetchNotes /', kid);

    const sql = `SELECT muistilappu_id, teksti, kirjuri_id, muokattu FROM muistilappu WHERE kirjuri_id = '${kid}' LIMIT 144`;
    const data = await sendSQL(sql, key_id);
    if (data?.error) return data;
    const rows = data?.results?.[0]?.response?.result?.rows ?? [];

    // Muunna array-rivit objektilistaksi
    const notes = rows.map(r => ({
        muistilappu_id: r?.[0]?.value ?? '',
        teksti: r?.[1]?.value ?? '',
        kirjuri_id: r?.[2]?.value ?? '',
        muokattu: r?.[3]?.value ?? ''
    }));

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
