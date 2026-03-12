/**
 * ATS Background Service Worker
 * Handles messaging between content scripts and native automation
 */

// Default configuration
const ATS_CONFIG = {
    activeClient: 'flyland',
    automationEnabled: true,
    autoSearchSF: true,
    transcriptionEnabled: true,
    aiAnalysisEnabled: true,
    saveMarkdown: true,
    salesforceUrl: 'https://flyland.my.salesforce.com',
    aiServerUrl: 'http://localhost:8000'
};

let callLog = [];

// Load config on startup
loadConfig();

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[ATS Background] Received message:', message.type);

    switch (message.type) {
        case 'CTM_CALL_EVENT':
            handleCallEvent(message.payload);
            break;
        case 'SEARCH_SALESFORCE':
            handleSearchSalesforce(message.payload);
            break;
        case 'TRANSCRIPTION_COMPLETE':
            handleTranscriptionComplete(message.payload);
            break;
        case 'SF_RECORD_DATA':
            handleSfRecordData(message.payload);
            break;
        case 'ATS_ACTION':
            handleAtsAction(message.payload);
            break;
        case 'GET_CONFIG':
            sendResponse(ATS_CONFIG);
            break;
    }

    return true;
});

async function handleCallEvent(payload) {
    console.log('[ATS] Call event:', payload);

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
    if (!phone) return;

    console.log('[ATS] Searching Salesforce for:', phone);

    try {
        const searchUrl = `${ATS_CONFIG.salesforceUrl}/lightning/setup/Search/home?ws=%2Fsearch%2F%3FsearchType%3D2%26q%3D${encodeURIComponent(phone)}`;
        
        const tabs = await chrome.tabs.query({ url: '*://*.salesforce.com/*' });
        
        if (tabs.length > 0) {
            await chrome.tabs.update(tabs[0].id, { url: searchUrl, active: true });
            console.log('[ATS] Updated existing SF tab');
        } else {
            await chrome.tabs.create({ url: searchUrl });
            console.log('[ATS] Created new SF tab');
        }

        showOverlayNotification(`Searching Salesforce for: ${phone}`);

    } catch (error) {
        console.error('[ATS] Error searching Salesforce:', error);
    }
}

async function handleTranscriptionComplete(payload) {
    console.log('[ATS] Transcription complete:', payload);
    
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
    if (!ATS_CONFIG.aiAnalysisEnabled) {
        console.log('[ATS] AI Analysis disabled');
        return;
    }

    try {
        const response = await fetch(`${ATS_CONFIG.aiServerUrl}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcription: payload.markdown,
                phone: payload.phone,
                client: ATS_CONFIG.activeClient
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('[ATS] AI Analysis result:', result);
            
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
            console.log('[ATS] AI server not available');
        }
    } catch (error) {
        console.log('[ATS] AI server not running');
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
        console.error('[ATS] Error showing notification:', error);
    }
}

async function handleSfRecordData(payload) {
    console.log('[ATS] SF Record data:', payload);
}

async function handleAtsAction(payload) {
    console.log('[ATS] Action triggered:', payload);
    
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
        console.error('[ATS] Error copying to clipboard:', error);
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
        console.error('[ATS] Error inserting reply:', error);
    }
}

async function loadConfig() {
    try {
        const keys = ['activeClient', 'automationEnabled', 'autoSearchSF', 'transcriptionEnabled', 
                     'aiAnalysisEnabled', 'saveMarkdown', 'salesforceUrl', 'aiServerUrl'];
        const stored = await chrome.storage.local.get(keys);
        
        if (stored.activeClient) ATS_CONFIG.activeClient = stored.activeClient;
        if (stored.automationEnabled !== undefined) ATS_CONFIG.automationEnabled = stored.automationEnabled;
        if (stored.autoSearchSF !== undefined) ATS_CONFIG.autoSearchSF = stored.autoSearchSF;
        if (stored.transcriptionEnabled !== undefined) ATS_CONFIG.transcriptionEnabled = stored.transcriptionEnabled;
        if (stored.aiAnalysisEnabled !== undefined) ATS_CONFIG.aiAnalysisEnabled = stored.aiAnalysisEnabled;
        if (stored.saveMarkdown !== undefined) ATS_CONFIG.saveMarkdown = stored.saveMarkdown;
        if (stored.salesforceUrl) ATS_CONFIG.salesforceUrl = stored.salesforceUrl;
        if (stored.aiServerUrl) ATS_CONFIG.aiServerUrl = stored.aiServerUrl;
        
        console.log('[ATS] Config loaded:', ATS_CONFIG);
    } catch (error) {
        console.error('[ATS] Error loading config:', error);
    }
}
