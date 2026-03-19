/**
 * CTM DOM Monitor - Captures calls from CTM web interface
 * 
 * Monitors the CTM softphone DOM for incoming/outgoing calls.
 * Extracts phone numbers and triggers AI analysis.
 * 
 * CTM Interface Structure:
 * - .frame.party-options contains active call participants
 * - .participant elements with data-id
 * - Phone numbers in .result-text spans
 */

(function() {
    'use strict';

    const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
    const POLL_INTERVAL = 3000; // Poll DOM every 3 seconds
    const API_POLL_INTERVAL = 5000; // Poll API for transcript

    let pollTimer = null;
    let transcriptTimer = null;
    let lastPhoneNumber = null;
    let lastCallStart = 0;
    let isAnalyzing = false;

    /**
     * Extract phone number from CTM party-options DOM
     * Looks for the caller (not moderator) in the participant list
     */
    function extractPhoneFromPartyOptions() {
        // Look for the party-options frame (active call)
        const partyOptions = document.querySelector('.frame.party-options');
        if (!partyOptions) return null;

        // Look for all participants
        const participants = partyOptions.querySelectorAll('.participant');
        
        for (const participant of participants) {
            // Skip moderators (they have data-moderator="1")
            const isModerator = participant.getAttribute('data-moderator') === '1';
            
            if (!isModerator) {
                // This is likely the caller
                const resultText = participant.querySelector('.result-text');
                if (resultText) {
                    const text = resultText.textContent || '';
                    // Extract phone number from text
                    const phoneMatch = text.match(/\+?[0-9]{1,3}[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
                    if (phoneMatch) {
                        return phoneMatch[0].replace(/[^\d+]/g, '');
                    }
                    // Also try data attributes
                    const dataId = participant.getAttribute('data-id');
                    if (dataId && dataId.startsWith('+')) {
                        return dataId.replace(/[^\d+]/g, '');
                    }
                }
            }
        }

        // Fallback: look for any phone number in result-text elements
        const allResultTexts = partyOptions.querySelectorAll('.result-text');
        for (const el of allResultTexts) {
            const text = el.textContent || '';
            const phoneMatch = text.match(/\+?[0-9]{10,15}/);
            if (phoneMatch) {
                return phoneMatch[0].replace(/[^\d+]/g, '');
            }
        }

        return null;
    }

    /**
     * Alternative: Check CTM softphone banner
     */
    function extractPhoneFromBanner() {
        const banner = document.querySelector('.banner[data-type="answer"]');
        if (!banner || banner.style.display === 'none') return null;

        const infoBody = banner.querySelector('.info-body');
        const infoTitle = banner.querySelector('.info-title');
        
        for (const el of [infoBody, infoTitle]) {
            if (el) {
                const text = el.textContent || '';
                const phoneMatch = text.match(/\+?[0-9]{10,15}/);
                if (phoneMatch) {
                    return phoneMatch[0].replace(/[^\d+]/g, '');
                }
            }
        }
        return null;
    }

    /**
     * Check if call is active (by checking for ringing or active elements)
     */
    function isCallActive() {
        // Check for party-options with participants
        const partyOptions = document.querySelector('.frame.party-options');
        if (partyOptions) {
            const participants = partyOptions.querySelectorAll('.participant');
            return participants.length > 0;
        }

        // Check for answer banner
        const banner = document.querySelector('.banner[data-type="answer"]');
        if (banner && banner.style.display !== 'none') return true;

        // Check for ringing indicators
        const ringing = document.querySelector('.ringing, .incoming, [data-state="ringing"]');
        return !!ringing;
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
     * Fetch call from API by phone number
     */
    async function findCallByPhone(phone) {
        try {
            const response = await fetch(`${SERVER_URL}/api/ctm/calls?limit=10&hours=2`);
            if (!response.ok) return null;
            const calls = await response.json();
            
            // Find most recent call with matching phone
            const matchingCall = calls.find(call => {
                const callPhone = (call.phone || '').replace(/\D/g, '');
                return callPhone.includes(phone) || phone.includes(callPhone);
            });
            
            return matchingCall || null;
        } catch (error) {
            console.error('[CTM-DOM] Error fetching calls:', error);
            return null;
        }
    }

    /**
     * Poll for transcript after call ends
     */
    async function pollForTranscript(callId, phone) {
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes

        if (transcriptTimer) clearInterval(transcriptTimer);

        transcriptTimer = setInterval(async () => {
            attempts++;
            
            if (attempts > maxAttempts) {
                clearInterval(transcriptTimer);
                console.log('[CTM-DOM] Transcript poll timeout');
                return;
            }

            try {
                const response = await fetch(`${SERVER_URL}/api/ctm/calls/${callId}/transcript`);
                if (!response.ok) return;

                const data = await response.json();
                
                if (data.available && data.transcript && data.transcript.length > 10) {
                    clearInterval(transcriptTimer);
                    console.log('[CTM-DOM] Transcript available, analyzing...');
                    await analyzeAndShow(data.transcript, phone, callId);
                }
            } catch (error) {
                console.error('[CTM-DOM] Transcript poll error:', error);
            }
        }, API_POLL_INTERVAL);
    }

    /**
     * Analyze transcript and show overlay
     */
    async function analyzeAndShow(transcript, phone, callId) {
        if (isAnalyzing) return;
        isAnalyzing = true;

        try {
            // Try /api/analyze endpoint
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

            const analysis = await response.json();
            showOverlay(analysis, phone);

        } catch (error) {
            console.error('[CTM-DOM] Analysis error:', error);
            showError(phone);
        } finally {
            isAnalyzing = false;
        }
    }

    /**
     * Show analysis overlay
     */
    function showOverlay(analysis, phone) {
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
                <span class="ats-title">ATS Call Analysis</span>
                <button class="ats-close-btn">×</button>
            </div>
            <div class="ats-overlay-content">
                <div class="ats-header-section">
                    <div class="ats-phone-icon">
                        <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path></svg>
                    </div>
                    <span class="ats-phone-number">${formatPhone(phone)}</span>
                    <div class="ats-status-row">
                        <span class="ats-score-badge ${scoreClass}">${score}</span>
                        <span class="ats-status-label ${scoreClass}">${statusLabel}</span>
                    </div>
                </div>
                <div class="ats-card">
                    <div class="ats-card-header">
                        <div class="ats-card-title">Key Details</div>
                    </div>
                    <div class="ats-card-body">
                        <div class="ats-info-list">
                            <div class="ats-info-item">
                                <span class="ats-info-label">Tags:</span>
                                <span class="ats-info-value">${tags || 'None'}</span>
                            </div>
                            <div class="ats-info-item">
                                <span class="ats-info-label">Sentiment:</span>
                                <span class="ats-info-value">${sentiment}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ats-card">
                    <div class="ats-card-header">
                        <div class="ats-card-title">Summary</div>
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
                    <button class="ats-button-primary" data-action="new-lead">New Lead</button>
                    <button class="ats-button-secondary" data-action="existing-lead">Existing Lead</button>
                    <button class="ats-button-fill-sf" data-action="fill-salesforce">Fill Salesforce</button>
                </div>
            </div>
        `;

        addStyles();
        document.body.appendChild(overlay);

        overlay.querySelector('.ats-close-btn').addEventListener('click', () => overlay.remove());
        
        const copyBtn = document.getElementById('ats-copy-notes');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(summary);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => copyBtn.textContent = 'Copy Notes', 2000);
            });
        }

        // Also send to popup
        sendToPopup({ type: 'analysis', analysis, phone });
    }

    /**
     * Show error overlay
     */
    function showError(phone) {
        const existing = document.getElementById('ats-automation-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'ats-automation-overlay';
        overlay.innerHTML = `
            <div class="ats-overlay-header">
                <span class="ats-title">ATS Call Monitor</span>
                <button class="ats-close-btn">×</button>
            </div>
            <div class="ats-overlay-content">
                <div class="ats-header-section">
                    <div class="ats-phone-icon error">
                        <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path></svg>
                    </div>
                    <span class="ats-phone-number">${formatPhone(phone)}</span>
                </div>
                <div class="ats-error-message">
                    Analysis unavailable. Check API connection.
                </div>
            </div>
        `;

        addStyles();
        document.body.appendChild(overlay);

        overlay.querySelector('.ats-close-btn').addEventListener('click', () => overlay.remove());
    }

    /**
     * Send message to popup
     */
    function sendToPopup(message) {
        try {
            chrome.runtime.sendMessage(message);
        } catch (e) {
            // Extension context may not be available
        }
    }

    /**
     * Add overlay CSS styles
     */
    function addStyles() {
        if (document.getElementById('ats-dom-overlay-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'ats-dom-overlay-styles';
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
            .ats-phone-icon svg { width: 100%; height: 100%; fill: #667eea; }
            .ats-phone-icon.error svg { fill: #e74c3c; }
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
            .ats-card-header { padding: 12px; background: #f8f9fa; }
            .ats-card-title { font-weight: 600; font-size: 14px; }
            .ats-card-body { padding: 12px; }
            .ats-info-list { display: flex; flex-direction: column; gap: 8px; }
            .ats-info-item { display: flex; gap: 8px; font-size: 13px; }
            .ats-info-label { font-weight: 500; color: #666; }
            .ats-info-value { color: #333; }
            .ats-salesforce-notes { font-size: 14px; line-height: 1.5; color: #333; margin-bottom: 12px; }
            .ats-copy-notes-btn {
                background: #f0f0f0; border: none; padding: 8px 16px;
                border-radius: 4px; cursor: pointer; font-size: 12px;
            }
            .ats-copy-notes-btn:hover { background: #e0e0e0; }
            .ats-error-message { text-align: center; padding: 20px; color: #e74c3c; }
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

    /**
     * Main monitoring loop
     */
    async function monitorLoop() {
        // Try both extraction methods
        let phone = extractPhoneFromPartyOptions();
        
        if (!phone) {
            phone = extractPhoneFromBanner();
        }

        if (phone && phone !== lastPhoneNumber) {
            console.log('[CTM-DOM] New call detected:', phone);
            lastPhoneNumber = phone;
            lastCallStart = Date.now();

            // Find the call in API and wait for transcript
            const call = await findCallByPhone(phone);
            if (call && call.call_id) {
                console.log('[CTM-DOM] Found call in API:', call.call_id);
                pollForTranscript(call.call_id, phone);
            }
        }

        // Check if call ended (no active elements)
        if (!phone && lastPhoneNumber && (Date.now() - lastCallStart) > 5000) {
            console.log('[CTM-DOM] Call ended:', lastPhoneNumber);
            // Call ended, transcript polling will handle analysis
            // lastPhoneNumber = null; // Keep for reference
        }
    }

    /**
     * Start monitoring
     */
    function startMonitoring() {
        console.log('[CTM-DOM] Starting DOM-based CTM monitoring...');
        
        // Initial check
        monitorLoop();
        
        // Start polling
        pollTimer = setInterval(monitorLoop, POLL_INTERVAL);

        // Also use MutationObserver for dynamic content
        const observer = new MutationObserver((mutations) => {
            // Check on any DOM change
            monitorLoop();
        });

        observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    }

    /**
     * Stop monitoring
     */
    function stopMonitoring() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        if (transcriptTimer) {
            clearInterval(transcriptTimer);
            transcriptTimer = null;
        }
        console.log('[CTM-DOM] Stopped monitoring');
    }

    // Start when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
        startMonitoring();
    }

    // Expose for debugging
    window.ctmDomMonitor = {
        stop: stopMonitoring,
        start: startMonitoring,
        extractPhone: extractPhoneFromPartyOptions
    };

})();
