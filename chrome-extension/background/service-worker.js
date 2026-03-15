/**
 * AGS Background Service Worker
 * Handles messaging between content scripts and native automation
 */

// Default configuration
const AGS_CONFIG = {
    activeClient: 'flyland',
    automationEnabled: true,
    autoSearchSF: true,
    transcriptionEnabled: true,
    aiAnalysisEnabled: true,
    saveMarkdown: true,
    aiServerUrl: 'http://4.157.143.70:8000',
    salesforceUrl: 'https://flyland.my.salesforce.com'
};

let callLog = [];

// Load config on startup
loadConfig();

// Load config from chrome.storage
async function loadConfig() {
    try {
        const keys = ['activeClient', 'automationEnabled', 'autoSearchSF', 'transcriptionEnabled', 
                     'aiAnalysisEnabled', 'saveMarkdown', 'salesforceUrl', 'aiServerUrl',
                     'ats_config'];
        const stored = await chrome.storage.local.get(keys);
        
        // Check for new config format first
        if (stored.ats_config) {
            const config = stored.ats_config;
            if (config.activeClient) AGS_CONFIG.activeClient = config.activeClient;
            if (config.automationEnabled !== undefined) AGS_CONFIG.automationEnabled = config.automationEnabled;
            if (config.autoSearchSF !== undefined) AGS_CONFIG.autoSearchSF = config.autoSearchSF;
            if (config.transcriptionEnabled !== undefined) AGS_CONFIG.transcriptionEnabled = config.transcriptionEnabled;
            if (config.aiAnalysisEnabled !== undefined) AGS_CONFIG.aiAnalysisEnabled = config.aiAnalysisEnabled;
            if (config.saveMarkdown !== undefined) AGS_CONFIG.saveMarkdown = config.saveMarkdown;
            if (config.salesforceUrl) AGS_CONFIG.salesforceUrl = config.salesforceUrl;
            if (config.aiServerUrl) AGS_CONFIG.aiServerUrl = config.aiServerUrl;
        }
        
        // Legacy support - check individual keys
        if (stored.salesforceUrl) AGS_CONFIG.salesforceUrl = stored.salesforceUrl;
        if (stored.aiServerUrl) AGS_CONFIG.aiServerUrl = stored.aiServerUrl;
        if (stored.activeClient) AGS_CONFIG.activeClient = stored.activeClient;
        
        // Initialize storage with defaults if not set
        if (!stored.aiServerUrl) {
            await chrome.storage.local.set({ aiServerUrl: 'http://4.157.143.70:8000' });
        }
        if (!stored.salesforceUrl) {
            await chrome.storage.local.set({ salesforceUrl: 'https://flyland.my.salesforce.com' });
        }
        
        console.log('[AGS] Config loaded:', AGS_CONFIG);
    } catch (error) {
        console.error('[AGS] Error loading config:', error);
    }
}

// Handle extension icon click - open as floating window if enabled
chrome.action.onClicked.addListener(async (tab) => {
    try {
        const result = await chrome.storage.local.get('popupFloatEnabled');
        
        if (result.popupFloatEnabled) {
            const windows = await chrome.windows.getAll();
            const existingWindow = windows.find(w => 
                w.type === 'popup' && 
                w.url && 
                w.url.includes('popup.html')
            );
            
            if (existingWindow) {
                await chrome.windows.update(existingWindow.id, { focused: true });
            } else {
                await chrome.windows.create({
                    url: chrome.runtime.getURL('popup/popup.html'),
                    type: 'popup',
                    width: 420,
                    height: 700,
                    focused: true
                });
            }
        } else {
            // Default behavior - let Chrome handle the popup
            // This won't work with onClicked, so we open the popup page directly
            await chrome.windows.create({
                url: chrome.runtime.getURL('popup/popup.html'),
                type: 'popup',
                width: 420,
                height: 700,
                focused: true
            });
        }
    } catch (error) {
        console.error('[AGS] Error handling click:', error);
    }
});

// Remove duplicate function at end of file

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[AGS Background] Received message:', message.type || message.action);

    switch (message.type || message.action) {
        case 'CTM_CALL_EVENT':
        case 'CALL_EVENT':
            handleCallEvent(message.payload || message.data);
            break;
        case 'SEARCH_SALESFORCE':
            handleSearchSalesforce(message.payload || message.data);
            break;
        case 'TRANSCRIPTION_COMPLETE':
            handleTranscriptionComplete(message.payload || message.data);
            break;
        case 'SF_RECORD_DATA':
            handleSfRecordData(message.payload || message.data);
            break;
        case 'ATS_ACTION':
            handleAtsAction(message.payload || message.data);
            break;
        case 'CLIENT_CHANGED':
            handleClientChanged(message.client);
            break;
        case 'GET_CONFIG':
            sendResponse(AGS_CONFIG);
            break;
        case 'PING':
            sendResponse({ pong: true, status: 'ok' });
            break;
    }

    return true;
});

async function handleClientChanged(client) {
    console.log('[AGS] Client changed to:', client);
    AGS_CONFIG.activeClient = client;
}

async function handleCallEvent(payload) {
    console.log('[AGS] Call event:', payload);

    if (payload.event === 'call_started') {
        callLog.push({
            phone: payload.phoneNumber,
            callerName: payload.callerName,
            startTime: payload.timestamp,
            status: payload.status
        });

        showOverlayNotification(`Incoming call: ${payload.phoneNumber || 'Unknown'}`);
    } else if (payload.event === 'call_ended') {
        if (callLog.length > 0) {
            const lastCall = callLog[callLog.length - 1];
            lastCall.endTime = payload.timestamp;
            lastCall.duration = payload.timestamp - lastCall.startTime;
        }
    }
}

async function handleSearchSalesforce(payload) {
    const { phone } = payload;
    if (!phone) {
        console.error('[AGS] No phone number provided');
        return;
    }

    // Ensure we have a Salesforce URL configured
    if (!AGS_CONFIG.salesforceUrl) {
        console.error('[AGS] Salesforce URL not configured. Please configure in popup.');
        showOverlayNotification('⚠️ Salesforce URL not configured. Open extension settings.');
        return;
    }

    console.log('[AGS] Searching Salesforce for:', phone);
    console.log('[AGS] Using Salesforce URL:', AGS_CONFIG.salesforceUrl);

    try {
        const searchUrl = `${AGS_CONFIG.salesforceUrl}/lightning/setup/Search/home?ws=%2Fsearch%2F%3FsearchType%3D2%26q%3D${encodeURIComponent(phone)}`;
        
        const tabs = await chrome.tabs.query({ url: '*://*.salesforce.com/*' });
        
        if (tabs.length > 0) {
            await chrome.tabs.update(tabs[0].id, { url: searchUrl, active: true });
            console.log('[AGS] Updated existing SF tab');
        } else {
            await chrome.tabs.create({ url: searchUrl });
            console.log('[AGS] Created new SF tab');
        }

        showOverlayNotification(`Searching Salesforce for: ${phone}`);

    } catch (error) {
        console.error('[AGS] Error searching Salesforce:', error);
        showOverlayNotification('⚠️ Error opening Salesforce');
    }
}

async function handleTranscriptionComplete(payload) {
    console.log('[AGS] Transcription complete:', payload);
    
    callLog.push({
        phone: payload.phone,
        callerName: payload.callerName,
        transcription: payload.markdown,
        timestamp: payload.timestamp
    });

    showOverlayNotification('Transcription saved! Processing with AI...');

    processWithAI(payload);
}

async function processWithAI(payload) {
    if (!AGS_CONFIG.aiAnalysisEnabled) {
        console.log('[AGS] AI Analysis disabled');
        return;
    }

    try {
        const response = await fetch(`${AGS_CONFIG.aiServerUrl}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcription: payload.markdown,
                phone: payload.phone,
                client: AGS_CONFIG.activeClient
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('[AGS] AI Analysis result:', result);
            
            showOverlayNotification('AI Analysis complete!');
            
            await chrome.tabs.query({ url: '*://*.salesforce.com/*' }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'AI_ANALYSIS_RESULT',
                        payload: result
                    });
                }
            });
        } else {
            console.log('[AGS] AI server not available');
        }
    } catch (error) {
        console.log('[AGS] AI server not running');
    }
}

async function showOverlayNotification(message) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'SHOW_NOTIFICATION',
                payload: { message }
            });
        }
    } catch (error) {
        console.error('[AGS] Error showing notification:', error);
    }
}

async function handleSfRecordData(payload) {
    console.log('[AGS] SF Record data:', payload);
}

async function handleAtsAction(payload) {
    console.log('[AGS] Action triggered:', payload);
    
    const { action, data } = payload;
    
    switch (action) {
        case 'search_sf':
            handleSearchSalesforce({ phone: data.phone });
            break;
        case 'copy_note':
            copyToClipboard(data.note);
            break;
        case 'insert_reply':
            insertReply(data.reply);
            break;
    }
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        console.error('[AGS] Error copying to clipboard:', error);
    }
}

async function insertReply(text) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'INSERT_TEXT',
                text
            });
        }
    } catch (error) {
        console.error('[AGS] Error inserting reply:', error);
    }
}
