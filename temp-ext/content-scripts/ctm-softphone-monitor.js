/**
 * CTM Softphone - Incoming Call Detector
 * 
 * Detects incoming calls from the CTM softphone embedded widget.
 * Extracts phone number, fetches transcript via API, triggers analysis.
 */

(function() {
    'use strict';

    const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
    const POLL_INTERVAL = 5000; // 5 seconds

    let lastCallId = null;
    let pollTimer = null;

    /**
     * Extract phone number from CTM softphone DOM
     */
    function extractIncomingPhoneNumber() {
        // Look for incoming call banner
        const incomingBanner = document.querySelector('.banner[data-type="answer"]');
        if (!incomingBanner || incomingBanner.style.display === 'none') {
            return null;
        }

        // Get phone number from the banner
        const infoBody = incomingBanner.querySelector('.info-body');
        const infoTitle = incomingBanner.querySelector('.info-title');
        
        if (infoBody) {
            const text = infoBody.textContent || '';
            // Extract phone number from text
            const phoneMatch = text.match(/\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
            if (phoneMatch) {
                return phoneMatch[0].replace(/[^\d+]/g, '');
            }
        }

        if (infoTitle) {
            const text = infoTitle.textContent || '';
            const phoneMatch = text.match(/\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
            if (phoneMatch) {
                return phoneMatch[0].replace(/[^\d+]/g, '');
            }
        }

        // Fallback: check for phone number in various CTM elements
        const phoneElements = document.querySelectorAll('[data-phone], .caller-number, .phone-number');
        for (const el of phoneElements) {
            const text = el.textContent || el.getAttribute('data-phone') || '';
            const phoneMatch = text.match(/\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
            if (phoneMatch) {
                return phoneMatch[0].replace(/[^\d+]/g, '');
            }
        }

        return null;
    }

    /**
     * Get active/recent calls from our API
     */
    async function fetchRecentCalls() {
        try {
            const response = await fetch(`${SERVER_URL}/api/ctm/calls?limit=10&hours=1`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('[CTM-SW] Failed to fetch calls:', error);
            return [];
        }
    }

    /**
     * Analyze a call via AI server
     */
    async function analyzeCall(callId) {
        try {
            const response = await fetch(`${SERVER_URL}/api/ctm/calls/${callId}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('[CTM-SW] Failed to analyze call:', error);
            return null;
        }
    }

    /**
     * Send transcript directly to analysis
     */
    async function analyzeTranscript(transcript, phone) {
        try {
            const response = await fetch(`${SERVER_URL}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcription: transcript,
                    phone: phone,
                    client: 'flyland'
                })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('[CTM-SW] Failed to analyze transcript:', error);
            return null;
        }
    }

    /**
     * Create and show the analysis overlay
     */
    function showAnalysisOverlay(analysis, phone) {
        // Remove existing overlay
        const existing = document.getElementById('ats-automation-overlay');
        if (existing) existing.remove();

        const score = analysis.qualification_score || 0;
        let scoreClass = 'cold';
        let statusLabel = 'Cold Lead';
        
        if (score >= 70) {
            scoreClass = 'hot';
            statusLabel = 'Hot Lead';
        } else if (score >= 40) {
            scoreClass = 'warm';
            statusLabel = 'Warm Lead';
        }

        const tags = (analysis.tags || []).join(', ');
        const summary = analysis.summary || 'No summary available';
        const sentiment = analysis.sentiment || 'neutral';

        const overlay = document.createElement('div');
        overlay.id = 'ats-automation-overlay';
        overlay.innerHTML = `
            <div class="ats-overlay-header">
                <span class="ats-title">ATS Automation</span>
                <button class="ats-close-btn">×</button>
            </div>
            <div class="ats-overlay-content">
                <div class="ats-header-section">
                    <div class="ats-header-info">
                        <div class="ats-phone-icon ringing">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="ringing">
                                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
                            </svg>
                        </div>
                        <span class="ats-phone-number">${phone || 'Unknown'}</span>
                    </div>
                    <div class="ats-status-row">
                        <span class="ats-score-badge ${scoreClass}">${score}</span>
                        <span class="ats-status-label ${scoreClass}">${statusLabel}</span>
                    </div>
                </div>
                <div class="ats-card">
                    <div class="ats-card-header">
                        <div class="ats-card-title">Key Details</div>
                        <div class="ats-card-toggle">▼</div>
                    </div>
                    <div class="ats-card-body">
                        <div class="ats-info-list">
                            <div class="ats-info-item">
                                <span class="ats-info-label">Tags:</span>
                                <span class="ats-info-value">${tags || 'None'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ats-card">
                    <div class="ats-card-header">
                        <div class="ats-card-title">Summary</div>
                        <div class="ats-card-toggle">▼</div>
                    </div>
                    <div class="ats-card-body">
                        <div class="ats-salesforce-notes">${summary}</div>
                        <button class="ats-copy-notes-btn" id="ats-copy-notes">Copy Notes</button>
                    </div>
                </div>
                <div class="ats-recommendation">
                    Disposition: ${analysis.suggested_disposition || 'New'} | Sentiment: ${sentiment}
                </div>
                <div class="ats-button-group">
                    <button class="ats-button-primary" data-action="new-lead">New Lead - Create Contact</button>
                    <button class="ats-button-secondary" data-action="existing-lead">Existing Lead</button>
                    <button class="ats-button-fill-sf" data-action="fill-salesforce" data-form-type="log_call">Fill Salesforce (Log Call)</button>
                </div>
            </div>
        `;

        // Add styles
        if (!document.getElementById('ats-overlay-styles')) {
            const styles = document.createElement('style');
            styles.id = 'ats-overlay-styles';
            styles.textContent = `
                #ats-automation-overlay {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 380px;
                    max-height: 90vh;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    overflow: hidden;
                }
                .ats-overlay-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .ats-title { font-weight: 600; font-size: 16px; }
                .ats-close-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                }
                .ats-overlay-content { padding: 16px; max-height: calc(90vh - 60px); overflow-y: auto; }
                .ats-header-section { text-align: center; margin-bottom: 16px; }
                .ats-phone-icon { width: 48px; height: 48px; margin: 0 auto 8px; }
                .ats-phone-icon.ringing svg { animation: ring 1s infinite; }
                @keyframes ring {
                    0%, 100% { transform: rotate(0); }
                    25% { transform: rotate(15deg); }
                    75% { transform: rotate(-15deg); }
                }
                .ats-phone-number { font-size: 20px; font-weight: 600; display: block; margin-top: 8px; }
                .ats-status-row { display: flex; justify-content: center; gap: 12px; margin-top: 12px; }
                .ats-score-badge {
                    width: 50px; height: 50px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 18px; font-weight: 700; color: white;
                }
                .ats-score-badge.hot { background: #e74c3c; }
                .ats-score-badge.warm { background: #f39c12; }
                .ats-score-badge.cold { background: #3498db; }
                .ats-status-label { font-size: 14px; padding-top: 15px; }
                .ats-status-label.hot { color: #e74c3c; }
                .ats-status-label.warm { color: #f39c12; }
                .ats-status-label.cold { color: #3498db; }
                .ats-card { border: 1px solid #eee; border-radius: 8px; margin-bottom: 12px; }
                .ats-card-header { padding: 12px; background: #f8f9fa; cursor: pointer; display: flex; justify-content: space-between; }
                .ats-card-title { font-weight: 600; font-size: 14px; }
                .ats-card-body { padding: 12px; }
                .ats-info-list { display: flex; flex-direction: column; gap: 8px; }
                .ats-info-item { display: flex; gap: 8px; }
                .ats-info-label { font-weight: 500; color: #666; }
                .ats-info-value { color: #333; }
                .ats-salesforce-notes { font-size: 14px; line-height: 1.5; color: #333; margin-bottom: 12px; }
                .ats-copy-notes-btn {
                    background: #f0f0f0; border: none; padding: 8px 16px;
                    border-radius: 4px; cursor: pointer; font-size: 12px;
                }
                .ats-copy-notes-btn:hover { background: #e0e0e0; }
                .ats-recommendation {
                    text-align: center; padding: 12px; background: #f8f9fa;
                    border-radius: 8px; font-size: 14px; margin-bottom: 12px;
                }
                .ats-button-group { display: flex; flex-direction: column; gap: 8px; }
                .ats-button-primary, .ats-button-secondary, .ats-button-fill-sf {
                    padding: 12px; border: none; border-radius: 6px; cursor: pointer;
                    font-size: 14px; font-weight: 500;
                }
                .ats-button-primary { background: #667eea; color: white; }
                .ats-button-secondary { background: #f0f0f0; color: #333; }
                .ats-button-fill-sf { background: #00a1e0; color: white; }
            `;
            document.head.appendChild(styles);
        }

        // Add to page
        document.body.appendChild(overlay);

        // Close button handler
        overlay.querySelector('.ats-close-btn').addEventListener('click', () => {
            overlay.remove();
        });

        // Copy notes handler
        const copyBtn = document.getElementById('ats-copy-notes');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(summary);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy Notes'; }, 2000);
            });
        }

        return overlay;
    }

    /**
     * Process incoming call
     */
    async function processIncomingCall(phoneNumber) {
        if (!phoneNumber) return;

        console.log('[CTM-SW] Processing incoming call:', phoneNumber);

        // Check if we already processed this number recently
        const cacheKey = `ats_processed_${phoneNumber}`;
        if (sessionStorage.getItem(cacheKey)) {
            console.log('[CTM-SW] Already processed this number recently');
            return;
        }

        try {
            // Get recent calls to find matching call
            const calls = await fetchRecentCalls();
            
            // Find the most recent call with matching phone number
            const matchingCall = calls.find(call => {
                const callPhone = call.phone || '';
                return callPhone.includes(phoneNumber) || phoneNumber.includes(callPhone);
            });

            if (matchingCall && matchingCall.call_id !== lastCallId) {
                lastCallId = matchingCall.call_id;
                
                // Analyze the call
                const analysis = await analyzeCall(matchingCall.call_id);
                
                if (analysis) {
                    showAnalysisOverlay(analysis, phoneNumber);
                    sessionStorage.setItem(cacheKey, 'true');
                }
            } else if (!matchingCall) {
                // No matching call found - try direct transcript analysis
                // This happens when call is still active and transcript not yet available
                console.log('[CTM-SW] No matching call found in recent calls, will retry...');
            }
        } catch (error) {
            console.error('[CTM-SW] Error processing call:', error);
        }
    }

    /**
     * Start monitoring for incoming calls
     */
    function startMonitoring() {
        console.log('[CTM-SW] Starting CTM softphone monitoring...');

        // Initial check
        checkForIncomingCall();

        // Set up polling
        pollTimer = setInterval(checkForIncomingCall, POLL_INTERVAL);

        // Also set up MutationObserver for dynamic content
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' || mutation.type === 'childList') {
                    // Check if incoming call banner changed
                    const banner = document.querySelector('.banner[data-type="answer"]');
                    if (banner && banner.style.display !== 'none') {
                        const phone = extractIncomingPhoneNumber();
                        if (phone) {
                            processIncomingCall(phone);
                        }
                    }
                }
            }
        });

        // Observe the CTM phone control
        const phoneControl = document.querySelector('ctm-phone-control');
        if (phoneControl) {
            observer.observe(phoneControl, { attributes: true, childList: true, subtree: true });
        }

        // Fallback: observe entire document
        observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    }

    /**
     * Check for incoming call
     */
    function checkForIncomingCall() {
        const phoneNumber = extractIncomingPhoneNumber();
        if (phoneNumber) {
            processIncomingCall(phoneNumber);
        }
    }

    /**
     * Stop monitoring
     */
    function stopMonitoring() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        console.log('[CTM-SW] Stopped CTM softphone monitoring');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
        startMonitoring();
    }

    // Expose for debugging
    window.ctmSoftphoneMonitor = {
        extractPhoneNumber: extractIncomingPhoneNumber,
        checkNow: checkForIncomingCall,
        stop: stopMonitoring,
        start: startMonitoring
    };

})();