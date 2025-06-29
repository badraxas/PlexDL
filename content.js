// content.js — PlexDL Download Plugin

// --- Global Variables ---
let currentPlexServer = {
    baseUri: null,      // Base URI of the active Plex server
    accessToken: null   // Access token for this server
};
let currentMediaId = null;            // ID du média actuellement téléchargé
let lastProcessedMediaUrl = null;     // To avoid re-injecting the button on the same URL
let plexRelayUrls = {};               // (unused here, but kept in case needed later)

// --- Retrieve Plex token from localStorage ---
function getToken() {
    try {
        const token = localStorage.getItem('myPlexAccessToken') || localStorage.getItem('X-Plex-Token');
        if (token) {
            console.log('[PlexDL] Plex token found');
            return token;
        }
    } catch (e) {
        console.error('[PlexDL] Error retrieving Plex token:', e);
    }
    return null;
}

// --- Regex and templates for Plex API ---
const clientIdRegex = /server\/([a-f0-9]{40})\//;
const metadataIdRegex = /key=%2Flibrary%2Fmetadata%2F(\d+)/;

// --- Helper to fetch XML via XMLHttpRequest ---
function getXml(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
            callback(xhr.responseXML);
        }
    };
    xhr.open('GET', url);
    xhr.send();
}

// --- Extract base URI and access token from resources XML ---
function getMetadata(resourcesXml) {
    const match = clientIdRegex.exec(window.location.href);
    if (!match) {
        return alert('Unable to retrieve clientIdentifier from URL.');
    }
    const clientId = match[1];

    const accessTokenNode = resourcesXml.evaluate(
        `//Device[@clientIdentifier='${clientId}']/@accessToken`,
        resourcesXml, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
    ).singleNodeValue;
    const baseUriNode = resourcesXml.evaluate(
        `//Device[@clientIdentifier='${clientId}']/Connection[@local=0]/@uri`,
        resourcesXml, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
    ).singleNodeValue;
    if (!accessTokenNode || !baseUriNode) {
        return alert('Plex token or connection URI not found in resources.');
    }

    const accessToken = accessTokenNode.textContent;
    const baseUri = baseUriNode.textContent;
    const metaMatch = metadataIdRegex.exec(window.location.href);
    if (!metaMatch) {
        return alert('You are not on a valid Plex media page.');
    }
    const mediaId = metaMatch[1];
    currentMediaId = mediaId;

    const libraryUrl = `${baseUri}/library/metadata/${mediaId}?X-Plex-Token=${accessToken}`;
    getXml(libraryUrl, xmlMeta => getDownloadUrl(xmlMeta, baseUri, accessToken));
}

// --- Extract part key and redirect to download ---
function getDownloadUrl(xmlMeta, baseUri, accessToken) {
    downloadRecursive(xmlMeta, baseUri, accessToken);
}

// Fonction récursive : gère les dossiers, les vidéos et les médias simples
function downloadRecursive(xmlMeta, baseUri, accessToken) {
    // 1. Si des répertoires, parcourir récursivement chaque children
    const directories = xmlMeta.getElementsByTagName('Directory');
    if (directories.length > 0) {
        for (let i = 0; i < directories.length; i++) {
            const dirKey = directories[i].getAttribute('key');
            const childrenUrl = `${baseUri}${dirKey}?X-Plex-Token=${accessToken}`;
            getXml(childrenUrl, xmlChildren => {
                downloadRecursive(xmlChildren, baseUri, accessToken);
            });
        }
        return;
    }
    // 2. Si des vidéos, déclencher un téléchargement pour chaque épisode
    const videos = xmlMeta.getElementsByTagName('Video');
    if (videos.length > 0) {
        for (let i = 0; i < videos.length; i++) {
            const mediaNode = videos[i].getElementsByTagName('Media')[0];
            const partNode = mediaNode.getElementsByTagName('Part')[0];
            const partKey = partNode.getAttribute('key');
            const fileName = partNode.getAttribute('file').split('/').pop();
            const downloadUrl = `${baseUri}${partKey}?download=1&X-Plex-Token=${accessToken}`;
            chrome.runtime.sendMessage({
                type: 'PLEXDL_DOWNLOAD',
                url: downloadUrl,
                filename: fileName
            });
        }
        return;
    }
    // 3. Sinon, cas média simple : recherche du partKey et téléchargement
    const singlePart = xmlMeta.evaluate(
        `//Media/Part[1]/@key`,
        xmlMeta, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
    ).singleNodeValue;
    if (singlePart) {
        const partKey = singlePart.textContent;
        // Essayer de récupérer le nom de fichier depuis l’attribut file si disponible
        let fileName = 'download';
        try {
            const fileAttr = xmlMeta.evaluate(
                `//Media/Part[1]/@file`,
                xmlMeta, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
            ).singleNodeValue;
            if (fileAttr) {
                fileName = fileAttr.textContent.split('/').pop();
            }
        } catch {}
        const downloadUrl = `${baseUri}${partKey}?download=1&X-Plex-Token=${accessToken}`;
        chrome.runtime.sendMessage({
            type: 'PLEXDL_DOWNLOAD',
            url: downloadUrl,
            filename: fileName
        });
        return;
    }
    alert('Unable to find any media to download.');
}

// --- Inject a "Download" button next to the Play button ---
function injectDownloadButton(playBtn) {
    // Do not reinject if Download button already present
    if (document.getElementById('plex-download-button')) return;

    const btn = document.createElement('button');
    btn.id = 'plex-download-button';
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 4C16.5523 4 17 4.44772 17 5V9.2L22.2133 5.55071C22.4395 5.39235 22.7513 5.44737 22.9096 5.6736C22.9684 5.75764 23 5.85774 23 5.96033V18.0397C23 18.3158 22.7761 18.5397 22.5 18.5397C22.3974 18.5397 22.2973 18.5081 22.2133 18.4493L17 14.8V19C17 19.5523 16.5523 20 16 20H2C1.44772 20 1 19.5523 1 19V5C1 4.44772 1.44772 4 2 4H16ZM10 8H8V12H5L9 16L13 12H10V8Z"></path></svg> <span>Download</span>';
    btn.className = playBtn.className;
    playBtn.parentNode.insertBefore(btn, playBtn.nextSibling);

    btn.addEventListener('click', () => {
        const token = getToken();
        if (!token) {
            return alert('Plex token not found. Please sign in again.');
        }
        const resourcesUrl = `https://plex.tv/api/resources?includeHttps=1&X-Plex-Token=${token}`;
        getXml(resourcesUrl, getMetadata);
    });
}

// --- Observer to dynamically detect the Play button and inject Download ---
const observer = new MutationObserver(() => {
    const playBtn = document.querySelector('button[data-testid="preplay-play"]');
    const currentUrl = window.location.href;

    // If new media or Download button is absent, inject it
    if (playBtn && (currentUrl !== lastProcessedMediaUrl || !document.getElementById('plex-download-button'))) {
        console.log('[PlexDL] Injecting Download button');
        injectDownloadButton(playBtn);
        lastProcessedMediaUrl = currentUrl;
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// --- On initial page load, attempt injection if the Play button is already present ---
window.addEventListener('load', () => {
    const playBtn = document.querySelector('button[data-testid="preplay-play"]');
    if (playBtn) {
        injectDownloadButton(playBtn);
        lastProcessedMediaUrl = window.location.href;
    }
});
