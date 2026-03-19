/**
 * CTM DOM Monitor - Softphone Only
 * ONLY extracts phone numbers from the agent's softphone interface
 * IGNORES the dashboard (left side) which shows all agents' calls
 */

const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
const STORAGE_KEY = 'ats_latest_analysis';
const DOM_POLL_INTERVAL = 2000;

let pollTimer = null;
let lastDetectedPhone = null;
let lastCallId = null;

// ============ PHONE UTILS ============

function extractPhoneFromText(text) {
    if (!text) return null;
    
    const patterns = [
        /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
        /\+?[0-9]{10,15}/g
    ];

    for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
            for (const match of matches) {
                const phone = cleanPhone(match);
                if (looksLikePhone(phone)) {
                    return phone;
                }
            }
        }
    }
    return null;
}

function cleanPhone(phone) {
    if (!phone) return '';
    const hasPlus = phone.startsWith('+');
    const digits = phone.replace(/\D/g, '');
    return hasPlus ? '+' + digits : digits;
}

function looksLikePhone(str) {
    if (!str) return false;
    const digits = str.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
}

function formatPhone(phone) {
    if (!phone) return 'Unknown';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits[0] === '1') {
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
}

// ============ SOFTPHONE ONLY EXTRACTION ============

/**
 * Extract phone ONLY from the agent's softphone interface
 * This ignores the dashboard completely
 */
function extractFromSoftphoneOnly() {
    // Method 1: Check shadow DOM of ctm-phone-input (dialpad)
    const phoneInput = document.querySelector('ctm-phone-control ctm-phone-input');
    if (phoneInput && phoneInput.shadowRoot) {
        const shadowInput = phoneInput.shadowRoot.querySelector('input.phone-number[type="tel"]');
        if (shadowInput) {
            const value = shadowInput.value || '';
            const phone = extractPhoneFromText(value);
            if (phone) {
                console.log('[CTM-DOM] Found phone in dialpad:', phone);
                return phone;
            }
        }
    }

    // Method 2: Check call-info (shows current caller's info during active call)
    const callInfo = document.querySelector('ctm-phone-control .call-info');
    if (callInfo) {
        const callingNumber = callInfo.querySelector('.calling_number');
        if (callingNumber) {
            const text = callingNumber.textContent || '';
            const phone = extractPhoneFromText(text);
            if (phone) {
                console.log('[CTM-DOM] Found phone in call-info:', phone);
                return phone;
            }
        }
    }

    // Method 3: Check phone_in_progress (during active call)
    const phoneInProgress = document.querySelector('ctm-phone-control .phone_in_progress');
    if (phoneInProgress) {
        const text = phoneInProgress.textContent || '';
        const phone = extractPhoneFromText(text);
        if (phone) return phone;
    }

    // Method 4: Check incoming call banner (when call is ringing)
    const incomingBanner = document.querySelector('ctm-phone-control .banner[data-type="answer"]');
    if (incomingBanner) {
        const infoBody = incomingBanner.querySelector('.info-body');
        if (infoBody) {
            const text = infoBody.textContent || '';
            const phone = extractPhoneFromText(text);
            if (phone) {
                console.log('[CTM-DOM] Found phone in incoming banner:', phone);
                return phone;
            }
        }
    }

    // Method 5: Check inner-phone frame (contains dialpad and call info)
    const innerPhone = document.querySelector('ctm-phone-control .inner-phone');
    if (innerPhone) {
        const callingNumber = innerPhone.querySelector('.calling_number .phone_number');
        if (callingNumber) {
            const text = callingNumber.textContent || '';
            const phone = extractPhoneFromText(text);
            if (phone) return phone;
        }
    }

    // Method 6: Check party-header (shows participants during call)
    const partyHeader = document.querySelector('ctm-phone-control .party-header');
    if (partyHeader) {
        const text = partyHeader.textContent || '';
        const phone = extractPhoneFromText(text);
        if (phone) return phone;
    }

    // Method 7: Check active-chats frame
    const activeChats = document.querySelector('ctm-phone-control .active-chats');
    if (activeChats) {
        const text = activeChats.textContent || '';
        const phone = extractPhoneFromText(text);
        if (phone) return phone;
    }

    return null;
}

// ============ AGENT ACCOUNT ID ============

/**
 * Extract the agent's account_id from the CTM interface
 * This identifies which workstation/account is receiving calls
 */
function extractAgentAccountId() {
    // Look for account_id in various locations
    // 1. Check agent-status element
    const agentStatus = document.querySelector('#agent-status, .agent-status');
    if (agentStatus) {
        const accountId = agentStatus.getAttribute('data-account-id') || 
                         agentStatus.getAttribute('account_id') ||
                         agentStatus.getAttribute('data-id');
        if (accountId) {
            console.log('[CTM-DOM] Found account_id in agent-status:', accountId);
            return accountId;
        }
    }
    
    // 2. Check phone control data attributes
    const phoneControl = document.querySelector('ctm-phone-control');
    if (phoneControl) {
        const accountId = phoneControl.getAttribute('data-account-id') ||
                         phoneControl.getAttribute('account-id') ||
                         phoneControl.getAttribute('data-station-id') ||
                         phoneControl.getAttribute('station-id');
        if (accountId) {
            console.log('[CTM-DOM] Found account_id in phone-control:', accountId);
            return accountId;
        }
    }
    
    // 3. Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const accountIdFromUrl = urlParams.get('account_id') || urlParams.get('accountId');
    if (accountIdFromUrl) {
        console.log('[CTM-DOM] Found account_id in URL:', accountIdFromUrl);
        return accountIdFromUrl;
    }
    
    // 4. Check localStorage/sessionStorage
    const storedAccountId = localStorage.getItem('ctm_account_id') || 
                           sessionStorage.getItem('ctm_account_id') ||
                           localStorage.getItem('account_id');
    if (storedAccountId) {
        console.log('[CTM-DOM] Found account_id in storage:', storedAccountId);
        return storedAccountId;
    }
    
    return null;
}

// ============ API ============

async function fetchCalls(limit = 50, hours = 24) {
    try {
        const resp = await fetch(`${SERVER_URL}/api/ctm/calls?limit=${limit}&hours=${hours}`);
        if (!resp.ok) return [];
        return await resp.json();
    } catch (error) {
        console.error('[CTM-DOM] Fetch calls error:', error);
        return [];
    }
}

async function findCallByPhone(phone) {
    // First, get the agent's account_id from the interface
    const agentAccountId = extractAgentAccountId();
    
    const calls = await fetchCalls(50, 24);
    
    // Filter by phone, account_id, and status
    return calls.find(call => {
        // Phone match
        const callPhone = (call.phone || '').replace(/\D/g, '');
        const searchPhone = phone.replace(/\D/g, '');
        const phoneMatch = callPhone.includes(searchPhone) || searchPhone.includes(callPhone);
        
        if (!phoneMatch) return false;
        
        // Direction filter: must be inbound
        const direction = (call.direction || '').toLowerCase();
        if (direction !== 'inbound') {
            console.log('[CTM-DOM] Skipping non-inbound call:', direction);
            return false;
        }
        
        // Status filter: must be 'new' to capture calls just arriving at this workstation
        const status = (call.status || '').toLowerCase();
        if (status !== 'new') {
            console.log('[CTM-DOM] Skipping call not in new status:', status);
            return false;
        }
        
        // Account_id match: verify call is directed to this workstation
        if (agentAccountId && call.caller && call.caller.account_id) {
            const callAccountId = call.caller.account_id;
            if (callAccountId !== agentAccountId) {
                console.log('[CTM-DOM] Skipping call for different account_id:', callAccountId, '!==', agentAccountId);
                return false;
            }
        }
        
        return true;
    }) || null;
}

async function fetchTranscript(callId) {
    try {
        const resp = await fetch(`${SERVER_URL}/api/ctm/calls/${callId}/transcript`);
        if (!resp.ok) return null;
        return await resp.json();
    } catch (error) {
        console.error('[CTM-DOM] Fetch transcript error:', error);
        return null;
    }
}

async function analyzeTranscript(transcription, phone, client, callId) {
    try {
        const resp = await fetch(`${SERVER_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcription, phone, client, call_id: callId })
        });
        if (!resp.ok) return null;
        return await resp.json();
    } catch (error) {
        console.error('[CTM-DOM] Analyze error:', error);
        return null;
    }
}

async function pollForTranscript(callId, maxAttempts = 80, interval = 3000) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        attempts++;
        const data = await fetchTranscript(callId);
        
        if (data && data.available && data.transcript && data.transcript.length > 10) {
            return data.transcript;
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return null;
}

// ============ STORAGE ============

function setStorage(items) {
    return new Promise((resolve) => {
        chrome.storage.local.set(items, resolve);
    });
}

async function getClient() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['ats_client'], (result) => {
            resolve(result.ats_client || 'flyland');
        });
    });
}

async function setLatestAnalysis(data) {
    await setStorage({ [STORAGE_KEY]: data });
}

// ============ PROCESS CALL ============

async function processPhoneNumber(phone) {
    if (!phone || phone === lastDetectedPhone) return;
    
    console.log('[CTM-DOM] Phone detected in softphone:', phone);
    lastDetectedPhone = phone;

    // Store call detected status
    await setLatestAnalysis({
        type: 'call_detected',
        phone: phone,
        status: 'searching',
        timestamp: Date.now()
    });

    // Find call in API
    const call = await findCallByPhone(phone);
    
    if (!call) {
        console.log('[CTM-DOM] No call found for:', phone);
        return;
    }

    // Avoid processing same call twice
    if (call.call_id === lastCallId) {
        console.log('[CTM-DOM] Already processed this call');
        return;
    }
    lastCallId = call.call_id;

    console.log('[CTM-DOM] Found call:', call.call_id);

    // Poll for transcript
    const transcript = await pollForTranscript(call.call_id);
    
    if (!transcript) {
        console.log('[CTM-DOM] No transcript available');
        await setLatestAnalysis({
            type: 'call_ended',
            phone: phone,
            call_id: call.call_id,
            status: 'no_transcript'
        });
        return;
    }

    // Run analysis
    const client = await getClient();
    const analysis = await analyzeTranscript(transcript, phone, client, call.call_id);
    
    if (!analysis) {
        console.log('[CTM-DOM] Analysis failed');
        return;
    }

    console.log('[CTM-DOM] Analysis complete:', analysis.qualification_score);

    // Prepare result
    const result = {
        type: 'analysis_complete',
        phone: phone,
        call_id: call.call_id,
        duration: call.duration,
        timestamp: call.timestamp,
        analysis: {
            score: analysis.qualification_score || 0,
            sentiment: analysis.sentiment || 'neutral',
            summary: analysis.summary || 'No summary',
            tags: analysis.tags || [],
            disposition: analysis.suggested_disposition || 'New',
            follow_up: analysis.follow_up_required || false
        },
        status: 'complete'
    };

    // Store for popup
    await setLatestAnalysis(result);

    // Also try direct message to extension
    try {
        chrome.runtime.sendMessage(result);
    } catch (e) {
        // Not in extension context
    }
}

// ============ MONITORING ============

async function monitorLoop() {
    const phone = extractFromSoftphoneOnly();
    
    if (phone && phone !== lastDetectedPhone) {
        await processPhoneNumber(phone);
    }
}

function startMonitoring() {
    console.log('[CTM-DOM] Starting SOFTPHONE-ONLY monitoring...');
    
    // Initial check
    monitorLoop();
    
    // Start polling
    pollTimer = setInterval(monitorLoop, DOM_POLL_INTERVAL);

    // Use MutationObserver for dynamic content
    const observer = new MutationObserver(() => {
        monitorLoop();
    });

    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
}

// ============ INIT ============

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMonitoring);
} else {
    startMonitoring();
}

// Expose for debugging
window.ctmDomMonitor = {
    stop: () => pollTimer && clearInterval(pollTimer),
    start: startMonitoring
};
