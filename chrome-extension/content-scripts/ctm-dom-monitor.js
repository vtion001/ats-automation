/**
 * CTM DOM Monitor - Dynamic Call Detection
 * Self-contained - no external imports for Chrome Extension compatibility
 */

const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
const STORAGE_KEY = 'ats_latest_analysis';
const DOM_POLL_INTERVAL = 2000;

let pollTimer = null;
let lastDetectedPhone = null;

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

// ============ DOM EXTRACTION ============

function extractFromPartyOptions() {
    const partyOptions = document.querySelector('.frame.party-options');
    if (!partyOptions) return null;

    const participants = partyOptions.querySelectorAll('.participant');
    
    for (const participant of participants) {
        const isModerator = participant.getAttribute('data-moderator') === '1';
        if (isModerator) continue;

        const resultText = participant.querySelector('.result-text');
        if (resultText) {
            const phone = extractPhoneFromText(resultText.textContent);
            if (phone) return phone;
        }

        const dataId = participant.getAttribute('data-id');
        if (dataId && looksLikePhone(dataId)) {
            return cleanPhone(dataId);
        }
    }
    return null;
}

function extractFromBanners() {
    const banners = document.querySelectorAll('.banner, .incoming-call, [data-type="answer"]');
    
    for (const banner of banners) {
        const phone = extractPhoneFromText(banner.textContent);
        if (phone) return phone;

        const dataPhone = banner.getAttribute('data-phone');
        if (dataPhone && looksLikePhone(dataPhone)) {
            return cleanPhone(dataPhone);
        }
    }
    return null;
}

function extractFromAnyElement() {
    const selectors = [
        '.caller-number', '.phone-number', '.call-phone',
        '.participant-phone', '[class*="caller"]', '[class*="phone"]', '[data-phone]'
    ];

    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
            const phone = extractPhoneFromText(el.textContent || el.getAttribute('data-phone') || '');
            if (phone) return phone;
        }
    }
    return null;
}

function extractAnyPhoneNumber() {
    let phone = extractFromPartyOptions();
    if (phone) return phone;

    phone = extractFromBanners();
    if (phone) return phone;

    phone = extractFromAnyElement();
    if (phone) return phone;

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
    const calls = await fetchCalls(50, 24);
    return calls.find(call => {
        const callPhone = (call.phone || '').replace(/\D/g, '');
        const searchPhone = phone.replace(/\D/g, '');
        return callPhone.includes(searchPhone) || searchPhone.includes(callPhone);
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
    
    console.log('[CTM-DOM] Phone detected:', phone);
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
    const phone = extractAnyPhoneNumber();
    
    if (phone && phone !== lastDetectedPhone) {
        await processPhoneNumber(phone);
    }
}

function startMonitoring() {
    console.log('[CTM-DOM] Starting dynamic CTM monitoring...');
    
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
