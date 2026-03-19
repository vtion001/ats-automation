/**
 * CTM DOM Monitor - Dynamic Call Detection
 * 
 * Monitors CTM web interface for ANY incoming call.
 * Extracts phone number dynamically, then queries API for analysis.
 * Results are sent to popup for display.
 * 
 * Flow:
 * 1. Poll DOM for phone numbers (any number)
 * 2. When detected, query /api/ctm/calls?phone={number}
 * 3. Wait for transcript
 * 4. Run AI analysis
 * 5. Send results to popup via chrome.storage
 */

(function() {
    'use strict';

    const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
    const DOM_POLL_INTERVAL = 2000;       // Poll DOM every 2 seconds
    const API_POLL_INTERVAL = 3000;       // Poll API for transcript
    const STORAGE_KEY = 'ats_current_call';

    let pollTimer = null;
    let lastDetectedPhone = null;

    /**
     * Extract ANY phone number from CTM DOM
     * Looks for various CTM interface elements
     */
    function extractAnyPhoneNumber() {
        // Method 1: Check party-options (active call participants)
        const phone = extractFromPartyOptions();
        if (phone) return phone;

        // Method 2: Check incoming call banner
        const phone2 = extractFromBanner();
        if (phone2) return phone2;

        // Method 3: Check any element with phone-like data
        const phone3 = extractFromAnyElement();
        if (phone3) return phone3;

        return null;
    }

    /**
     * Extract from party-options frame
     */
    function extractFromPartyOptions() {
        const partyOptions = document.querySelector('.frame.party-options');
        if (!partyOptions) return null;

        const participants = partyOptions.querySelectorAll('.participant');
        
        for (const participant of participants) {
            // Skip moderators (internal agents)
            const isModerator = participant.getAttribute('data-moderator') === '1';
            if (isModerator) continue;

            // Get phone from .result-text
            const resultText = participant.querySelector('.result-text');
            if (resultText) {
                const text = resultText.textContent || '';
                const phone = extractPhoneFromText(text);
                if (phone) return phone;
            }

            // Get phone from data-id attribute
            const dataId = participant.getAttribute('data-id');
            if (dataId && looksLikePhone(dataId)) {
                return cleanPhone(dataId);
            }
        }

        return null;
    }

    /**
     * Extract from incoming call banner
     */
    function extractFromBanner() {
        const banners = document.querySelectorAll('.banner, .incoming-call, [data-type="answer"]');
        
        for (const banner of banners) {
            const text = banner.textContent || '';
            const phone = extractPhoneFromText(text);
            if (phone) return phone;

            // Check data attributes
            const dataPhone = banner.getAttribute('data-phone');
            if (dataPhone && looksLikePhone(dataPhone)) {
                return cleanPhone(dataPhone);
            }
        }

        return null;
    }

    /**
     * Search entire document for phone numbers
     */
    function extractFromAnyElement() {
        // Look for elements that typically contain caller info
        const selectors = [
            '.caller-number',
            '.phone-number', 
            '.call-phone',
            '.participant-phone',
            '[class*="caller"]',
            '[class*="phone"]',
            '[data-phone]'
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                const text = el.textContent || el.getAttribute('data-phone') || '';
                const phone = extractPhoneFromText(text);
                if (phone) return phone;
            }
        }

        // Last resort: search all text nodes
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent || '';
            const phone = extractPhoneFromText(text);
            if (phone && text.length < 50) { // Avoid long text nodes
                return phone;
            }
        }

        return null;
    }

    /**
     * Extract phone number from text using regex
     */
    function extractPhoneFromText(text) {
        if (!text) return null;
        
        // Match various phone formats: +1 (800) 123-4567, 18001234567, +1-800-123-4567, etc.
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

    /**
     * Clean phone number - keep only digits and leading +
     */
    function cleanPhone(phone) {
        if (!phone) return '';
        // Keep leading + if present, then only digits
        const hasPlus = phone.startsWith('+');
        const digits = phone.replace(/\D/g, '');
        return hasPlus ? '+' + digits : digits;
    }

    /**
     * Check if string looks like a phone number
     */
    function looksLikePhone(str) {
        if (!str) return false;
        const digits = str.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
    }

    /**
     * Format phone for display
     */
    function formatPhone(phone) {
        if (!phone) return 'Unknown';
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 11 && digits[0] === '1') {
            return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
        } else if (digits.length === 10) {
            return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
        }
        return phone;
    }

    /**
     * Find call in API using phone number
     */
    async function findCallByPhone(phone) {
        try {
            // Fetch recent calls and find by phone
            const response = await fetch(`${SERVER_URL}/api/ctm/calls?limit=50&hours=24`);
            if (!response.ok) return null;
            
            const calls = await response.json();
            
            // Find call with matching phone
            const matchingCall = calls.find(call => {
                const callPhone = (call.phone || '').replace(/\D/g, '');
                const searchPhone = phone.replace(/\D/g, '');
                return callPhone.includes(searchPhone) || searchPhone.includes(callPhone);
            });

            return matchingCall || null;
        } catch (error) {
            console.error('[CTM-DOM] Error finding call:', error);
            return null;
        }
    }

    /**
     * Poll API until transcript is available
     */
    async function pollForTranscript(callId, phone) {
        let attempts = 0;
        const maxAttempts = 80; // ~4 minutes

        const poll = async () => {
            attempts++;
            
            if (attempts > maxAttempts) {
                console.log('[CTM-DOM] Transcript poll timeout');
                return null;
            }

            try {
                const response = await fetch(`${SERVER_URL}/api/ctm/calls/${callId}/transcript`);
                if (!response.ok) {
                    await sleep(API_POLL_INTERVAL);
                    return poll();
                }

                const data = await response.json();
                
                if (data.available && data.transcript && data.transcript.length > 10) {
                    console.log('[CTM-DOM] Transcript available!');
                    return data.transcript;
                }
            } catch (error) {
                console.error('[CTM-DOM] Transcript poll error:', error);
            }

            await sleep(API_POLL_INTERVAL);
            return poll();
        };

        return poll();
    }

    /**
     * Run AI analysis on transcript
     */
    async function analyzeTranscript(transcript, phone, callId) {
        try {
            const response = await fetch(`${SERVER_URL}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcription: transcript,
                    phone: phone,
                    client: 'flyland',
                    call_id: callId
                })
            });

            if (!response.ok) throw new Error('Analysis failed');
            return await response.json();
        } catch (error) {
            console.error('[CTM-DOM] Analysis error:', error);
            return null;
        }
    }

    /**
     * Store analysis result for popup to retrieve
     */
    async function storeForPopup(data) {
        try {
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ ats_latest_analysis: data }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (e) {
            // Storage not available (may not be extension context)
            console.log('[CTM-DOM] Storage not available, data:', data);
        }
    }

    /**
     * Send message to popup/background
     */
    function sendToPopup(message) {
        try {
            chrome.runtime.sendMessage(message);
        } catch (e) {
            // Not in extension context
        }
    }

    /**
     * Sleep helper
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Process detected phone number
     */
    async function processPhoneNumber(phone) {
        if (!phone || phone === lastDetectedPhone) return;
        
        console.log('[CTM-DOM] New phone detected:', phone);
        lastDetectedPhone = phone;

        // Find call in API
        const call = await findCallByPhone(phone);
        
        if (!call) {
            console.log('[CTM-DOM] No call found for:', phone);
            // Store the phone anyway for popup to handle
            await storeForPopup({
                type: 'call_detected',
                phone: phone,
                status: 'searching'
            });
            return;
        }

        console.log('[CTM-DOM] Found call:', call.call_id);

        // Poll for transcript
        const transcript = await pollForTranscript(call.call_id, phone);
        
        if (!transcript) {
            console.log('[CTM-DOM] No transcript available');
            await storeForPopup({
                type: 'call_ended',
                phone: phone,
                call_id: call.call_id,
                status: 'no_transcript'
            });
            return;
        }

        // Run analysis
        const analysis = await analyzeTranscript(transcript, phone, call.call_id);
        
        if (!analysis) {
            console.log('[CTM-DOM] Analysis failed');
            return;
        }

        console.log('[CTM-DOM] Analysis complete:', analysis.qualification_score);

        // Prepare result data
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
        await storeForPopup(result);
        
        // Also try direct message
        sendToPopup(result);

        return result;
    }

    /**
     * Main monitoring loop
     */
    async function monitorLoop() {
        const phone = extractAnyPhoneNumber();
        
        if (phone && phone !== lastDetectedPhone) {
            console.log('[CTM-DOM] Phone detected:', phone);
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
        pollTimer = setInterval(monitorLoop, DOM_POLL_INTERVAL);

        // Also use MutationObserver for dynamic content changes
        const observer = new MutationObserver(() => {
            monitorLoop();
        });

        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    }

    /**
     * Stop monitoring
     */
    function stopMonitoring() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        console.log('[CTM-DOM] Stopped monitoring');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
        startMonitoring();
    }

    // Expose for debugging
    window.ctmDomMonitor = {
        stop: stopMonitoring,
        start: startMonitoring,
        extractPhone: extractAnyPhoneNumber
    };

})();
