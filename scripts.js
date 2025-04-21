
// Helper function to update DOM elements
function updateElement(id, text) {
    const element = document.getElementById(id);
    if (element) {
        console.log(`updateElement: ${id} >> ${text}`);
        element.innerText = text;
    }
}

// Helper function to log and return values
function logAndReturn(label, value) {
    console.log(`${label} >> ${value}`);
    return value;
}

// Funktio tutkii navigator.userAgent-merkkijonoa käyttämällä includes-metodia, joka etsii avainsanoja
function getDeviceName() {
    const userAgent = navigator.userAgent;
    const deviceName = userAgent.includes("Windows") ? "Windows-laite" :
        userAgent.includes("Mac") ? "Mac-laite" :
            userAgent.includes("Linux") ? "Linux-laite" :
                userAgent.includes("Android") ? "Android-laite" :
                    (userAgent.includes("iPhone") || userAgent.includes("iPad")) ? "iOS-laite" :
                        "Tuntematon laite";

    return logAndReturn("getDeviceName", deviceName);
}

// Funktio näytön resoluution hakemiseen
function getScreenResolution() {
    console.log(`getScreenResolution >> ${screen.width} x ${screen.height}`);
    return logAndReturn("getScreenResolution", screen.width + " x " + screen.height + " px");
}

// Funktio näytön virkistystaajuuden hakemiseen
function getRefreshRate() {
    let refreshRate;
    if (window.screen && window.screen.refreshRate) {
        refreshRate = window.screen.refreshRate + " Hz";
    }
    console.log(`getRefreshRate >> ${refreshRate}`);
    return refreshRate;
}

// Funktio näytön kirkkauden hakemiseen
function getBrightness() {
    let brightness;
    if (window.screen && window.screen.brightness) {
        brightness = window.screen.brightness + " %";
    }
    console.log(`getBrightness >> ${brightness}`);
    return brightness;
}

// Funktio näytön orientaation hakemiseen
function getOrientation() {
    console.log(`getOrientation >> ${screen.orientation.type}`);
    return (screen.orientation || {}).type || screen.mozOrientation || screen.msOrientation || "Tuntematon";
}

// Funktio käyttäjäagentin tietojen hakemiseen
function getUserAgent() {
    let uaInfo;
    uaInfo = navigator.userAgent;
    console.log(`getUserAgent >> ${uaInfo}`);
    return uaInfo;
}

// Funktio alustan hakemiseen
function getPlatform() {
    let platformInfo;
    platformInfo = navigator.userAgentData.platform;
    console.log(`getPlatform >> ${platformInfo}`);
    return platformInfo;
}

// Funktio, jolla tutkitaan onko kyseessä mobiililaite
function getMobile() {
    let mobileInfo;
    mobileInfo = navigator.userAgentData.mobile;
    return mobileInfo;
}

// Funktio selainten nimien ja versioiden hakemiseen
function getBrands() {
    let brandsInfo;
    brandsInfo = navigator.userAgentData.brands;
    console.log(`getBrands >> ${brandsInfo.length}`);
    brandsInfo.forEach(browser => {
        console.log(`Selaimen nimi: ${browser.brand}, Versio: ${browser.version}`);
    });
    return brandsInfo;
}

async function getUserAgentHints() {
    // Tarkista, tukeeko selain User-Agent Client Hints -ominaisuutta
    if (navigator.userAgentData) {
        // Pyydä tietoja käyttöjärjestelmästä ja laitteesta
        const ua = await navigator.userAgentData.getHighEntropyValues(['platformVersion', 'architecture', 'bitness', 'model', 'formFactor']);

        let platformVersionInfo, architectureInfo, bitnessInfo, modelInfo, formFactorInfo;

        architectureInfo = ua.architecture;
        console.log(`getUserAgentHints: architecture >> ${architectureInfo}`);
        platformVersionInfo = ua.platformVersion;
        console.log(`getUserAgentHints: platform >> ${platformVersionInfo}`);
        bitnessInfo = ua.bitness;
        console.log(`getUserAgentHints: bitness >> ${bitnessInfo}`);
        formFactorInfo = ua.formFactor;
        console.log(`getUserAgentHints: formFactor >> ${formFactorInfo}`);
        modelInfo = ua.model;
        //arvo vain jos mobiililaite esim. Pixel 3, muuten ei arvoa/tyhjä
        console.log(`getUserAgentHints: model >> ${modelInfo}`);

        return {
            architectureInfo,
            platformVersionInfo,
            bitnessInfo,
            formFactorInfo,
            modelInfo
        };
    } else {
        console.log('User-Agent Client Hints ei ole tuettu tässä selaimessa.');
        return null;
    }
}

function makeFronttiInfo() {

    // Update DOM with texts
    
    let blnMobile = getMobile();
    updateElement('mobile', `Mobiililaite: ${blnMobile ? 'kyllä' : 'ei'}`);

    let strProperty;
    strProperty = getDeviceName();
    if (strProperty) { updateElement('deviceName', `Laitteen tyyppi: ${strProperty}`); }
    strProperty = getRefreshRate();
    if (strProperty) { updateElement('refreshRate', `Virkistystaajuus: ${strProperty}`); }
    strProperty = getBrightness();
    if (strProperty) { updateElement('brightness', `Näytön kirkkaus: ${strProperty}`);}
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
    getUserAgentHints().then(info => {
        if (info) {
            if (blnMobile) {
                updateElement('mobileModel', `Mobililaitteen malli: ${info.modelInfo}`);
            };
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