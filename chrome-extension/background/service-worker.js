/**
 * ATS Background Service Worker
 * Handles messaging between content scripts and native automation
 */

const ATS_CONFIG = {
    activeClient: 'flyland',
    automationEnabled: true
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[ATS Background] Received message:', message.type);

    switch (message.type) {
        case 'CTM_CALL_EVENT':
            handleCallEvent(message.payload);
            break;
        case 'SF_RECORD_DATA':
            handleSfRecordData(message.payload);
            break;
        case 'ZOHO_CHAT_EVENT':
            handleZohoChatEvent(message.payload);
            break;
        case 'ATS_ACTION':
            handleAtsAction(message.payload);
            break;
        case 'GET_CONFIG':
            sendResponse(ATS_CONFIG);
            break;
        case 'SET_CLIENT':
            ATS_CONFIG.activeClient = message.client;
            saveConfig();
            break;
    }

    return true;
});

async function handleCallEvent(payload) {
    console.log('[ATS] Call event:', payload);

    if (!ATS_CONFIG.automationEnabled) return;

    const { phoneNumber, status } = payload;
    if (!phoneNumber) return;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_OVERLAY',
            data: {
                status: 'Searching...',
                phone: phoneNumber
            }
        });

    } catch (error) {
        console.error('[ATS] Error handling call event:', error);
    }
}

async function handleSfRecordData(payload) {
    console.log('[ATS] SF Record data:', payload);
}

async function handleZohoChatEvent(payload) {
    console.log('[ATS] ZOHO Chat event:', payload);
}

async function handleAtsAction(payload) {
    console.log('[ATS] Action triggered:', payload);
    
    const { action, data } = payload;
    
    switch (action) {
        case 'search_sf':
            openSalesforceSearch(data.phone);
            break;
        case 'copy_note':
            copyToClipboard(data.note);
            break;
        case 'insert_reply':
            insertReply(data.reply);
            break;
    }
}

async function openSalesforceSearch(phoneNumber) {
    const baseUrl = 'https://flyland.my.salesforce.com';
    const searchUrl = `${baseUrl}/lightning/setup/Search/home?ws=%2Fsearch%2F%3FsearchType%3D2%26q%3D${encodeURIComponent(phoneNumber)}`;

    try {
        const tabs = await chrome.tabs.query({ url: '*://*.salesforce.com/*' });
        
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { url: searchUrl, active: true });
        } else {
            chrome.tabs.create({ url: searchUrl });
        }
    } catch (error) {
        console.error('[ATS] Error opening SF search:', error);
    }
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        console.error('[ATS] Error copying to clipboard:', error);
    }
}

async function insertReply(text) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, {
            type: 'INSERT_TEXT',
            text: text
        });
    } catch (error) {
        console.error('[ATS] Error inserting reply:', error);
    }
}

async function saveConfig() {
    try {
        await chrome.storage.local.set({ atsConfig: ATS_CONFIG });
    } catch (error) {
        console.error('[ATS] Error saving config:', error);
    }
}

async function loadConfig() {
    try {
        const result = await chrome.storage.local.get('atsConfig');
        if (result.atsConfig) {
            Object.assign(ATS_CONFIG, result.atsConfig);
        }
    } catch (error) {
        console.error('[ATS] Error loading config:', error);
    }
}

loadConfig();
