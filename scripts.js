
/**
 * Updates the text content of a DOM element.
 * @param {string} id - The ID of the DOM element.
 * @param {string} text - The text to set as the content.
 */
function updateElement(id, text) {
    const element = document.getElementById(id);
    if (element) {
        console.log(`updateElement: ${id} >> ${text}`);
        element.innerText = text;
        element.setAttribute('aria-label', text); // Add ARIA label for accessibility
    }
}

// Helper function to log and return values
function logAndReturn(label, value) {
    console.log(`${label} >> ${value}`);
    return value;
}

// Funktio tutkii navigator.userAgent-merkkijonoa käyttämällä includes-metodia, joka etsii avainsanoja
function detectDeviceType() {
    const userAgent = navigator.userAgent;
    const userAgentLower = userAgent.toLowerCase(); // Convert to lowercase for case-insensitive matching
    let deviceName;
    if (userAgentLower.includes("windows")) {
        deviceName = "Windows-laite";
    } else if (userAgentLower.includes("mac")) {
        deviceName = "Mac-laite";
    } else if (userAgentLower.includes("linux")) {
        deviceName = "Linux-laite";
    } else if (userAgentLower.includes("android")) {
        deviceName = "Android-laite";
    } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
        deviceName = "iOS-laite";
    } else {
        deviceName = "Tuntematon laite";
    }

    return logAndReturn("detectDeviceType", deviceName);
}

// Funktio näytön resoluution hakemiseen
function getScreenResolution() {
    console.log(`getScreenResolution >> ${screen.width} x ${screen.height}`);
    return logAndReturn("getScreenResolution", screen.width + " x " + screen.height + " px");
}

// Funktio näytön virkistystaajuuden hakemiseen
function getRefreshRate() {
    if (window.screen && window.screen.refreshRate) {
        return window.screen.refreshRate + " Hz";
    }
    console.log('getRefreshRate >> Tuntematon');
    return null;
}

// Funktio näytön kirkkauden hakemiseen
function getBrightness() {
    if (window.screen && window.screen.brightness) {
        return window.screen.brightness + " %";
    }
    console.log('getBrightness >> Tuntematon');
    return null;
}

// Funktio näytön orientaation hakemiseen
function getOrientation() {
    if (screen.orientation) {
        console.log(`getOrientation >> ${screen.orientation.type}`);
        return (screen.orientation || {}).type || screen.mozOrientation || screen.msOrientation || "Tuntematon";
    }
    console.log('getOrientation >> Tuntematon');
    return null;
}

// Funktio käyttäjäagentin tietojen hakemiseen
function getUserAgent() {
    let uaInfo = navigator.userAgent;
    return logAndReturn("getUserAgent", uaInfo);
}

// Funktio alustan hakemiseen
function getPlatform() {
    let platformInfo = navigator.userAgentData?.platform ?? "Tuntematon";
    return logAndReturn("getPlatform", platformInfo);
}

// Funktio, jolla tutkitaan onko kyseessä mobiililaite
function getMobile() {
    let mobileInfo = navigator.userAgentData?.mobile ?? "Tuntematon";
    return logAndReturn("getMobile", mobileInfo);
}

// Funktio selainten nimien ja versioiden hakemiseen
function getBrands() {
    if (navigator.userAgentData?.brands) {
        const brandsInfo = navigator.userAgentData?.brands;
        if (brandsInfo && Array.isArray(brandsInfo)) {
            console.log(`getBrands >> ${brandsInfo.length}`);
            brandsInfo.forEach(browser => {
                console.log(`Selaimen nimi: ${browser.brand}, Versio: ${browser.version}`);
            });
            return brandsInfo;
        } else {
            console.log('getBrands >> User-Agent Client Hints ei ole tuettu tässä selaimessa tai brandsInfo ei ole taulukko.');
            return [];
        }
    }
}

async function getUserAgentHints() {
    // Tarkista, tukeeko selain User-Agent Client Hints -ominaisuutta
    if (navigator.userAgentData) {
        // Pyydä tietoja käyttöjärjestelmästä ja laitteesta
        const ua = navigator.userAgentData?.getHighEntropyValues 
            ? await navigator.userAgentData.getHighEntropyValues(['platformVersion', 'architecture', 'bitness', 'model', 'formFactor']) 
            : {};

        return {
            architectureInfo: ua.architecture ?? null,
            platformVersionInfo: ua.platformVersion ?? null,
            bitnessInfo: ua.bitness ?? null,
            formFactorInfo: ua.formFactor ?? null,
            modelInfo: ua.model ?? null   //arvo vain jos mobiililaite esim. Pixel 3, muuten ei arvoa/tyhjä
        };
    } else {
        console.log('User-Agent Client Hints ei ole tuettu tässä selaimessa.');
        return null;
    }
}

function makeFronttiInfo() {
    try {
        // Update DOM with texts
        updateElement('logText', `${new Date().toLocaleString()}`);
        updateElement('mobile', `Mobiililaite: ${getMobile()}`);

        let strProperty;
        strProperty = detectDeviceType();
        if (strProperty) { updateElement('deviceName', `Laitteen tyyppi: ${strProperty}`); }
        strProperty = getRefreshRate();
        if (strProperty) { updateElement('refreshRate', `Virkistystaajuus: ${strProperty}`); }
        strProperty = getBrightness();
        if (strProperty) { updateElement('brightness', `Näytön kirkkaus: ${strProperty}`); }
        strProperty = getOrientation();
        if (strProperty) { updateElement('orientation', `Näytön orientaatio: ${strProperty}`); }
        strProperty = getUserAgent();
        if (strProperty) { updateElement('uaInfo', `Käyttäjäagentti: ${strProperty}`); }
        strProperty = getPlatform();
        if (strProperty) { updateElement('platform', `Alusta: ${strProperty}`); }

        updateElement('colorDepth', `Värisyvyys: ${screen.colorDepth} bit`);
        updateElement('pixelDepth', `Pikselisyvyys: ${screen.pixelDepth} bit`);
        updateElement('resolution', `Näytön resoluutio: ${screen.width} x ${screen.height} px`);
        updateElement('screenHeight', `- korkeus: ${screen.height} px (käytettävissä ${screen.availHeight} px)`);
        updateElement('screenWidth', `- leveys: ${screen.width} px (käytettävissä ${screen.availWidth} px)`);
        updateElement('aspectRatio', `- kuvasuhde: ${(screen.width / screen.height).toFixed(2)}`);
        updateElement('windowWidth', `Ikkunan leveys: ${window.innerWidth} px`);
        updateElement('windowHeight', `Ikkunan korkeus: ${window.innerHeight} px`);

        let arrBrands = getBrands();
        let list = arrBrands.map(browser => `<li>${browser.brand}, versio: ${browser.version}</li>`).join('');
        document.getElementById('brands').innerHTML = `Selaimet: ${arrBrands.length} kpl<ul>${list}</ul>`;


        // Kutsu funktiota ja tulosta arvot HTML-sivulle
        if (navigator.userAgentData) {
            getUserAgentHints().then(info => {
                if (info) {
                    if (info.modelInfo) {
                        updateElement('mobileModel', `Mobililaitteen malli: ${info.modelInfo}`);
                    }
                    if (info.architectureInfo) {
                        updateElement('architecture', `Käyttöjärjestelmän arkkitehtuuri: ${info.architectureInfo}`);
                    }
                    if (info.platformVersionInfo) {
                        updateElement('platformVersion', `Käyttöjärjestelmän versio: ${info.platformVersionInfo}`);
                    }
                    if (info.bitnessInfo) {
                        updateElement('bitness', `Arkkitehtuurin bittisyys: ${info.bitnessInfo}`);
                    }
                    if (info.formFactorInfo) {
                        updateElement('formFactor', `Laitteen muoto: ${info.formFactorInfo}`);
                    }
                }
            });
        }
    } catch (error) {
        alert(`Virhe: ${error.message}`);
    }
}