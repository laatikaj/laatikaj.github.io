
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
    let userAgent = navigator.userAgent;
    let userAgentLower = userAgent.toLowerCase(); // Convert to lowercase for case-insensitive matching
    let deviceName;
    if (userAgentLower.includes("windows")) {
        deviceName = "Windows-laite";
    } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
        deviceName = "iOS-laite";
    } else if (userAgentLower.includes("mac")) {
        deviceName = "Mac-laite";
    } else if (userAgentLower.includes("linux")) {
        deviceName = "Linux-laite";
    } else if (userAgentLower.includes("android")) {
        deviceName = "Android-laite";
    } else {
        deviceName = "Tuntematon laite";
    }
    return logAndReturn("detectDeviceType", deviceName);
}

// Funktio näytön resoluution hakemiseen
function getScreenResolution() {
    return logAndReturn("getScreenResolution", screen.width + " x " + screen.height + " px");
}

// Funktio näytön kirkkauden hakemiseen
function getBrightness() {
    let brightness = screen.brightness || screen.mozBrightness || screen.msBrightness || "Tuntematon";
    return logAndReturn("getBrightness", "Näytön kirkkaus (%): " + brightness);
}

// Funktio näytön orientaation hakemiseen
function getOrientation() {
    return logAndReturn("getOrientation", screen.orientation.type || screen.mozOrientation || screen.msOrientation || "Tuntematon");
}

// Funktio käyttäjäagentin tietojen hakemiseen
function getUserAgent() {
    return logAndReturn("getUserAgent", navigator.userAgent ?? "Tuntematon");
}

// Funktio alustan hakemiseen
function getPlatform() {
    return logAndReturn("getPlatform", navigator.userAgentData?.platform ?? "Tuntematon");
}

// Funktio, jolla tutkitaan onko kyseessä mobiililaite
function getMobile() {
    return logAndReturn("getMobile", navigator.userAgentData?.mobile ?? "Tuntematon");
}

// Funktio selainten nimien ja versioiden hakemiseen
function getBrands() {
    let brandsInfo = navigator.userAgentData?.brands;
    if (brandsInfo && Array.isArray(brandsInfo)) {
        return brandsInfo.map(brand => {
            return {
                brand: brand.brand,
                version: brand.version
            };
        });
    } else {
        console.log('Selainten tietoja ei ole saatavilla.');
        return [];
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

function buildDocument() {
    try {

        // Päättele arvot
        let mobileStatus = getMobile();
        if (mobileStatus === true) {
            mobileStatus = "Mobiililaite: Kyllä";
        } else if (mobileStatus === false) {
            mobileStatus = "Mobiililaite: Ei";
        } else {
            mobileStatus = "Mobiililaite: Tuntematon";
        }




        // Update DOM with texts
        updateElement('logText', `${new Date().toLocaleString()}`);
        updateElement('uaInfo', `Käyttäjäagentti: ${getUserAgent()}`);
        updateElement('deviceName', `Laitteen tyyppi: ${detectDeviceType()}`);
        updateElement('mobile', mobileStatus);
        updateElement('platform', `Alusta: ${getPlatform()}`);
        updateElement('resolution', `Näytön resoluutio: ${screen.width} x ${screen.height} px`);
        updateElement('screenHeight', `- korkeus/käytettävissä: ${screen.height}/${screen.availHeight} px`);
        updateElement('screenWidth', `- leveys/käytettävissä: ${screen.width}/${screen.availWidth} px`);
        updateElement('aspectRatio', `- kuvasuhde: ${(screen.width / screen.height).toFixed(2)}`);
        updateElement('colorDepth', `Värisyvyys: ${screen.colorDepth} bit`);
        updateElement('pixelDepth', `Pikselisyvyys: ${screen.pixelDepth} bit`);
        updateElement('brightness', getBrightness());
        updateElement('orientation', `Näytön orientaatio: ${getOrientation()}`);

        let arrBrands = getBrands();
        if (arrBrands.length > 0) {
            let list = arrBrands.map(browser => `<li>${browser.brand}, versio: ${browser.version}</li>`).join('');
            document.getElementById('brands').innerHTML = `Selaimet: ${arrBrands.length} kpl<ul>${list}</ul>`;
        } else {
            document.getElementById('brands').innerHTML = "Selaimia ei löytynyt."; 
        }

        updateElement('windowWidth', `Ikkunan leveys: ${window.innerWidth} px`);
        updateElement('windowHeight', `Ikkunan korkeus: ${window.innerHeight} px`);

        //tässä kesken

 






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

        let footer = "Handmade in Nurmijärvi \u00A9 " + new Date().getFullYear() + " All rights reserved.";
        updateElement('footer', footer);

    } catch (error) {
        alert(`Virhe: ${error.message}`);
    }
}