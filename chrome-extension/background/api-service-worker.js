/**
 * ATS Automation - API-Based Service Worker
 * 
 * Simplified version that uses CTM API instead of DOM monitoring.
 * Polls the AI server which fetches data from CTM API.
 * 
 * Credentials stored in Azure Key Vault - not local.
 */

const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
const POLL_INTERVAL = 30000; // 30 seconds
const CALL_CHECK_INTERVAL = 10000; // 10 seconds for active calls

let pollTimer = null;
let activeCallsPollTimer = null;

let state = {
    calls: [],
    analyzedCalls: {},
    currentCall: null,
    loading: false,
    error: null
};

/**
 * Fetch calls from the AI server (which uses CTM API)
 */
async function fetchCallsFromAPI(limit = 50, hours = 24) {
    try {
        const url = `${SERVER_URL}/api/ctm/calls?limit=${limit}&hours=${hours}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const calls = await response.json();
        console.log('[API-SW] Fetched calls:', calls.length);
        return calls;
    } catch (error) {
        console.error('[API-SW] Failed to fetch calls:', error);
        throw error;
    }
}

/**
 * Fetch active calls from the AI server
 */
async function fetchActiveCallsFromAPI() {
    try {
        const url = `${SERVER_URL}/api/ctm/active-calls`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const calls = await response.json();
        console.log('[API-SW] Active calls:', calls.length);
        return calls;
    } catch (error) {
        console.error('[API-SW] Failed to fetch active calls:', error);
        throw error;
    }
}

/**
 * Analyze a specific call
 */
async function analyzeCall(callId) {
    try {
        const url = `${SERVER_URL}/api/ctm/calls/${callId}/analyze`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const analysis = await response.json();
        console.log('[API-SW] Call analysis:', analysis);
        return analysis;
    } catch (error) {
        console.error('[API-SW] Failed to analyze call:', error);
        throw error;
    }
}

/**
 * Get call details including recording URL
 */
async function getCallDetails(callId) {
    try {
        const url = `${SERVER_URL}/api/ctm/calls/${callId}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const call = await response.json();
        return call;
    } catch (error) {
        console.error('[API-SW] Failed to get call details:', error);
        throw error;
    }
}

/**
 * Start polling for calls
 */
async function startPolling() {
    console.log('[API-SW] Starting call polling...');
    
    // Initial fetch
    await refreshCalls();
    
    // Set up interval
    pollTimer = setInterval(refreshCalls, POLL_INTERVAL);
    
    // Also poll for active calls more frequently
    activeCallsPollTimer = setInterval(checkActiveCalls, CALL_CHECK_INTERVAL);
}

/**
 * Stop polling
 */
function stopPolling() {
    console.log('[API-SW] Stopping call polling...');
    
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    
    if (activeCallsPollTimer) {
        clearInterval(activeCallsPollTimer);
        activeCallsPollTimer = null;
    }
}

/**
 * Refresh calls list
 */
async function refreshCalls() {
    try {
        state.loading = true;
        state.error = null;
        
        const calls = await fetchCallsFromAPI();
        state.calls = calls;
        
        // Notify popup if needed
        broadcastToPopup('CALLS_UPDATED', { calls: state.calls });
        
    } catch (error) {
        state.error = error.message;
        broadcastToPopup('ERROR', { error: error.message });
    } finally {
        state.loading = false;
    }
}

/**
 * Check for active calls
 */
async function checkActiveCalls() {
    try {
        const activeCalls = await fetchActiveCallsFromAPI();
        
        if (activeCalls.length > 0) {
            console.log('[API-SW] Active calls detected:', activeCalls.length);
            
            // Notify content script if there's a call in progress
            chrome.runtime.sendMessage({
                type: 'ACTIVE_CALLS_DETECTED',
                payload: activeCalls
            }).catch(() => {});
            
            broadcastToPopup('ACTIVE_CALLS', { calls: activeCalls });
        }
    } catch (error) {
        console.error('[API-SW] Active call check failed:', error);
    }
}

/**
 * Broadcast message to popup
 */
function broadcastToPopup(type, payload) {
    chrome.runtime.sendMessage({ type, payload }).catch(() => {});
}

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const msgType = message.type || message.action;
    console.log('[API-SW] Message received:', msgType);
    
    switch (msgType) {
        case 'GET_CALLS':
            sendResponse({ calls: state.calls, loading: state.loading, error: state.error });
            return true;
            
        case 'REFRESH_CALLS':
            refreshCalls().then(() => {
                sendResponse({ success: true, calls: state.calls });
            }).catch((error) => {
                sendResponse({ success: false, error: error.message });
            });
            return true;
            
        case 'GET_CALL_DETAILS':
            getCallDetails(message.callId).then((call) => {
                sendResponse({ success: true, call });
            }).catch((error) => {
                sendResponse({ success: false, error: error.message });
            });
            return true;
            
        case 'ANALYZE_CALL':
            analyzeCall(message.callId).then((analysis) => {
                state.analyzedCalls[message.callId] = analysis;
                sendResponse({ success: true, analysis });
            }).catch((error) => {
                sendResponse({ success: false, error: error.message });
            });
            return true;
            
        case 'GET_ANALYSIS':
            sendResponse({ 
                analysis: state.analyzedCalls[message.callId] || null 
            });
            return true;
            
        case 'START_POLLING':
            startPolling();
            sendResponse({ success: true });
            return true;
            
        case 'STOP_POLLING':
            stopPolling();
            sendResponse({ success: true });
            return true;
            
        case 'PING':
            sendResponse({ pong: true });
            return true;
            
        default:
            sendResponse({ error: 'Unknown message type' });
            return true;
    }
});

/**
 * Service worker startup
 */
chrome.runtime.onInstalled.addListener(() => {
    console.log('[API-SW] Service worker installed');
    startPolling();
});

/**
 * Service worker startup (for updates)
 */
chrome.runtime.onStartup.addListener(() => {
    console.log('[API-SW] Service worker starting up');
    startPolling();
});

console.log('[API-SW] API-based service worker loaded');