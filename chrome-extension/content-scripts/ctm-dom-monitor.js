/**
 * CTM DOM Monitor - Dynamic Call Detection
 * 
 * Monitors CTM web interface for ANY incoming call.
 * Uses modular services for API communication and storage.
 */

import { ApiService } from '../src/services/api-service.js';
import { StorageService } from '../src/services/storage-service.js';
import { extractFromCTMDOM, formatPhone } from '../src/utils/phone-utils.js';

const CONFIG = {
    DOM_POLL_INTERVAL: 2000,
    STORAGE_KEY: 'ats_latest_analysis'
};

let pollTimer = null;
let lastDetectedPhone = null;

/**
 * Process detected phone number
 */
async function processPhoneNumber(phone) {
    if (!phone || phone === lastDetectedPhone) return;
    
    console.log('[CTM-DOM] Phone detected:', phone);
    lastDetectedPhone = phone;

    // Store call detected status
    await StorageService.setLatestAnalysis({
        type: 'call_detected',
        phone: phone,
        status: 'searching',
        timestamp: Date.now()
    });

    // Find call in API
    const call = await ApiService.findCallByPhone(phone);
    
    if (!call) {
        console.log('[CTM-DOM] No call found for:', phone);
        return;
    }

    console.log('[CTM-DOM] Found call:', call.call_id);

    // Poll for transcript
    const transcript = await ApiService.pollForTranscript(call.call_id);
    
    if (!transcript) {
        console.log('[CTM-DOM] No transcript available');
        await StorageService.setLatestAnalysis({
            type: 'call_ended',
            phone: phone,
            call_id: call.call_id,
            status: 'no_transcript'
        });
        return;
    }

    // Run analysis
    const client = await StorageService.getClient();
    const analysis = await ApiService.analyze(transcript, phone, client, call.call_id);
    
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
    await StorageService.setLatestAnalysis(result);

    // Also try direct message to extension
    try {
        chrome.runtime.sendMessage(result);
    } catch (e) {
        // Not in extension context
    }
}

/**
 * Main monitoring loop
 */
async function monitorLoop() {
    const phone = extractFromCTMDOM();
    
    if (phone && phone !== lastDetectedPhone) {
        await processPhoneNumber(phone);
    }
}

/**
 * Start monitoring
 */
function startMonitoring() {
    console.log('[CTM-DOM] Starting dynamic CTM monitoring...');
    
    // Initial check
    monitorLoop();
    
    // Start polling
    pollTimer = setInterval(monitorLoop, CONFIG.DOM_POLL_INTERVAL);

    // Use MutationObserver for dynamic content
    const observer = new MutationObserver(() => {
        monitorLoop();
    });

    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
}

// Start when DOM is ready
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
