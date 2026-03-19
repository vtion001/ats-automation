/**
 * CTM Live Call Monitor - Real-time guidance during calls
 * 
 * Monitors CTM softphone DOM for call state changes and provides:
 * 1. Live call detection and phone number extraction
 * 2. Post-call transcription via CTM API
 * 3. AI-powered guidance during calls based on call context
 * 
 * Architecture:
 * 1. Detect incoming/active call from DOM
 * 2. Extract phone number and caller info
 * 3. Show live guidance overlay
 * 4. When call ends, fetch transcript from CTM API
 * 5. Show complete analysis
 */

(function() {
    'use strict';

    const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
    const POLL_INTERVAL = 1000; // Check DOM every second
    const TRANSCRIPT_POLL_INTERVAL = 5000; // Poll for transcript after call

    let lastCallState = 'idle';
    let lastPhoneNumber = null;
    let currentCallId = null;
    let pollTimer = null;
    let transcriptPollTimer = null;
    let isAnalyzing = false;

    /**
     * Extract call state and info from CTM DOM
     */
    function getCallInfo() {
        const info = {
            state: 'idle',
            phone: null,
            direction: null,
            callerName: null,
            duration: null
        };

        // Check for various call states
        const notReady = document.querySelector('.agent-status-picker');
        const inbound = document.querySelector('.agent-status-inbound');
        const outbound = document.querySelector('.agent-status-outbound');
        const connecting = document.querySelector('.agent-status-connecting');
        const wrapup = document.querySelector('.agent-status-wrapup');
        
        // Ringing banner
        const ringingBanner = document.querySelector('.banner[data-type="answer"]');
        const isRinging = ringingBanner && ringingBanner.style.display !== 'none';

        // Determine state
        if (isRinging || (inbound && inbound.style.display !== 'none')) {
            info.state = 'ringing';
        } else if (connecting && connecting.style.display !== 'none') {
            info.state = 'connecting';
        } else if (outbound && outbound.style.display !== 'none') {
            info.state = 'active';
            info.direction = 'outbound';
        } else if (inbound && inbound.style.display !== 'none') {
            info.state = 'active';
            info.direction = 'inbound';
        } else if (wrapup && wrapup.style.display !== 'none') {
            info.state = 'wrapup';
        }

        // Extract phone number from various sources
        info.phone = extractPhoneNumber();

        // Get caller name if available
        info.callerName = extractCallerName();

        // Get call duration if in progress
        const timerElement = document.querySelector('.timer-status');
        if (timerElement && info.state === 'active') {
            info.duration = timerElement.textContent;
        }

        return info;
    }

    /**
     * Extract phone number from CTM DOM
     */
    function extractPhoneNumber() {
        // Try incoming call banner
        const incomingBanner = document.querySelector('.banner[data-type="answer"]');
        if (incomingBanner) {
            const infoBody = incomingBanner.querySelector('.info-body');
            const infoTitle = incomingBanner.querySelector('.info-title');
            
            const text = (infoBody?.textContent || infoTitle?.textContent || '');
            const match = text.match(/\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
            if (match) {
                return match[0].replace(/[^\d+]/g, '');
            }
        }

        // Try party info in call
        const partyInfo = document.querySelector('.party-info .phone_number');
        if (partyInfo) {
            const text = partyInfo.textContent || '';
            const match = text.match(/\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
            if (match) {
                return match[0].replace(/[^\d+]/g, '');
            }
        }

        // Try dialer header
        const dialerPhone = document.querySelector('.dialer-header .from_number_display');
        if (dialerPhone) {
            const text = dialerPhone.textContent || '';
            const match = text.match(/\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
            if (match) {
                return match[0].replace(/[^\d+]/g, '');
            }
        }

        // Try phone input
        const phoneInput = document.querySelector('.phone-number');
        if (phoneInput) {
            const text = phoneInput.value || phoneInput.textContent || '';
            const match = text.match(/\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
            if (match) {
                return match[0].replace(/[^\d+]/g, '');
            }
        }

        return null;
    }

    /**
     * Extract caller name from CTM DOM
     */
    function extractCallerName() {
        // Try full name element
        const fullNameEl = document.querySelector('.party-info .full_name');
        if (fullNameEl && fullNameEl.textContent?.trim()) {
            return fullNameEl.textContent.trim();
        }

        // Try info title
        const infoTitle = document.querySelector('.banner[data-type="answer"] .info-title');
        if (infoTitle) {
            const text = infoTitle.textContent || '';
            // Name is often in quotes or before phone number
            const nameMatch = text.match(/"([^"]+)"/) || text.match(/^([A-Za-z\s]+)\s*\d/);
            if (nameMatch) {
                return nameMatch[1].trim();
            }
        }

        return null;
    }

    /**
     * Fetch recent calls to find matching call ID
     */
    async function findMatchingCall(phoneNumber) {
        try {
            const response = await fetch(`${SERVER_URL}/api/ctm/calls?limit=20&hours=24`);
            if (!response.ok) return null;
            
            const calls = await response.json();
            
            // Find most recent call with matching phone
            const matching = calls.find(call => {
                const callPhone = call.phone || '';
                return callPhone.includes(phoneNumber) || phoneNumber.includes(callPhone);
            });
            
            return matching || null;
        } catch (error) {
            console.error('[CTM-Monitor] Failed to fetch calls:', error);
            return null;
        }
    }

    /**
     * Poll for transcript after call ends
     */
    async function pollForTranscript(callId, phone) {
        if (transcriptPollTimer) {
            clearInterval(transcriptPollTimer);
        }

        let attempts = 0;
        const maxAttempts = 60; // 5 minutes of polling

        transcriptPollTimer = setInterval(async () => {
            attempts++;
            
            if (attempts > maxAttempts) {
                clearInterval(transcriptPollTimer);
                return;
            }

            try {
                const response = await fetch(`${SERVER_URL}/api/ctm/calls/${callId}/transcript`);
                if (!response.ok) return;

                const data = await response.json();
                
                if (data.available && data.transcript && data.transcript.length > 10) {
                    clearInterval(transcriptPollTimer);
                    // Analyze and show results
                    await analyzeAndShow(data.transcript, phone);
                }
            } catch (error) {
                console.error('[CTM-Monitor] Transcript poll error:', error);
            }
        }, TRANSCRIPT_POLL_INTERVAL);
    }

    /**
     * Analyze transcript and show overlay
     */
    async function analyzeAndShow(transcript, phone) {
        if (isAnalyzing) return;
        isAnalyzing = true;

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

            if (!response.ok) throw new Error('Analysis failed');

            const analysis = await response.json();
            showCompleteOverlay(analysis, phone, transcript);

        } catch (error) {
            console.error('[CTM-Monitor] Analysis error:', error);
        } finally {
            isAnalyzing = false;
        }
    }

    /**
     * Create/Update live guidance overlay during call
     */
    function showLiveOverlay(callInfo) {
        let overlay = document.getElementById('ats-automation-overlay');
        
        if (!overlay) {
            overlay = createOverlay(callInfo);
        }

        // Update phone number
        const phoneEl = overlay.querySelector('.ats-phone-number');
        if (phoneEl && callInfo.phone) {
            phoneEl.textContent = formatPhone(callInfo.phone);
        }

        // Update state indicator
        const stateEl = overlay.querySelector('.ats-call-state');
        if (stateEl) {
            let stateText = 'Waiting...';
            let stateClass = 'idle';
            
            if (callInfo.state === 'ringing') {
                stateText = 'Incoming Call';
                stateClass = 'ringing';
            } else if (callInfo.state === 'connecting') {
                stateText = 'Connecting...';
                stateClass = 'connecting';
            } else if (callInfo.state === 'active') {
                stateText = callInfo.direction === 'outbound' ? 'Outbound Call' : 'On Call';
                stateClass = 'active';
            } else if (callInfo.state === 'wrapup') {
                stateText = 'Wrap-up';
                stateClass = 'wrapup';
            }
            
            stateEl.textContent = stateText;
            stateEl.className = `ats-call-state ${stateClass}`;
        }

        // Update guidance based on call context
        updateGuidance(overlay, callInfo);
    }

    /**
     * Update guidance based on call state and detected context
     */
    function updateGuidance(overlay, callInfo) {
        const guidanceEl = overlay.querySelector('.ats-guidance-text');
        if (!guidanceEl) return;

        let guidance = '';

        if (callInfo.state === 'ringing') {
            guidance = 'Answer the call or let it go to voicemail';
        } else if (callInfo.state === 'connecting') {
            guidance = 'Call is connecting... Be ready with caller info';
        } else if (callInfo.state === 'active') {
            // Provide contextual guidance based on what we can detect
            guidance = getContextualGuidance(callInfo);
        } else if (callInfo.state === 'wrapup') {
            guidance = 'Call ended. Completing analysis...';
        }

        guidanceEl.textContent = guidance;
    }

    /**
     * Get contextual guidance based on available info
     */
    function getContextualGuidance(callInfo) {
        // This is where we'd integrate with CTM's call data
        // For now, provide general guidance
        const direction = callInfo.direction === 'outbound' ? 'outbound' : 'inbound';
        
        if (direction === 'inbound') {
            return 'Listen to caller need. Ask qualifying questions if needed.';
        } else {
            return 'Introduce yourself and state the purpose of the call.';
        }
    }

    /**
     * Show complete analysis overlay after call
     */
    function showCompleteOverlay(analysis, phone, transcript) {
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
                        <div class="ats-phone-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
                            </svg>
                        </div>
                        <span class="ats-phone-number">${formatPhone(phone) || 'Unknown'}</span>
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
        addOverlayStyles();

        document.body.appendChild(overlay);

        // Event handlers
        overlay.querySelector('.ats-close-btn').addEventListener('click', () => overlay.remove());
        
        const copyBtn = document.getElementById('ats-copy-notes');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(summary);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => copyBtn.textContent = 'Copy Notes', 2000);
            });
        }
    }

    /**
     * Create initial overlay
     */
    function createOverlay(callInfo) {
        const overlay = document.createElement('div');
        overlay.id = 'ats-automation-overlay';
        overlay.innerHTML = `
            <div class="ats-overlay-header">
                <span class="ats-title">ATS Live Guidance</span>
                <button class="ats-close-btn">×</button>
            </div>
            <div class="ats-overlay-content">
                <div class="ats-header-section">
                    <div class="ats-header-info">
                        <div class="ats-phone-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
                            </svg>
                        </div>
                        <span class="ats-phone-number">${formatPhone(callInfo.phone) || 'Detecting...'}</span>
                    </div>
                    <div class="ats-status-row">
                        <span class="ats-call-state idle">Waiting...</span>
                    </div>
                </div>
                <div class="ats-card">
                    <div class="ats-card-header">
                        <div class="ats-card-title">Live Guidance</div>
                    </div>
                    <div class="ats-card-body">
                        <div class="ats-guidance-text">Waiting for call to start...</div>
                    </div>
                </div>
            </div>
        `;

        addOverlayStyles();

        overlay.querySelector('.ats-close-btn').addEventListener('click', () => {
            overlay.remove();
        });

        document.body.appendChild(overlay);
        return overlay;
    }

    /**
     * Format phone number for display
     */
    function formatPhone(phone) {
        if (!phone) return null;
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 11 && digits[0] === '1') {
            return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
        } else if (digits.length === 10) {
            return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
        }
        return phone;
    }

    /**
     * Add overlay CSS styles
     */
    function addOverlayStyles() {
        if (document.getElementById('ats-overlay-styles')) return;
        
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
            .ats-phone-icon svg { width: 100%; height: 100%; fill: #667eea; }
            .ats-phone-number { font-size: 20px; font-weight: 600; display: block; margin-top: 8px; }
            .ats-status-row { display: flex; justify-content: center; gap: 12px; margin-top: 12px; }
            .ats-call-state {
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 500;
            }
            .ats-call-state.idle { background: #e0e0e0; color: #666; }
            .ats-call-state.ringing { background: #f39c12; color: white; animation: pulse 1s infinite; }
            .ats-call-state.connecting { background: #3498db; color: white; }
            .ats-call-state.active { background: #27ae60; color: white; }
            .ats-call-state.wrapup { background: #9b59b6; color: white; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
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
            .ats-info-item { display: flex; gap: 8px; font-size: 13px; }
            .ats-info-label { font-weight: 500; color: #666; }
            .ats-info-value { color: #333; }
            .ats-guidance-text { font-size: 14px; line-height: 1.5; color: #333; }
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

    /**
     * Main monitoring loop
     */
    function monitorLoop() {
        const callInfo = getCallInfo();
        
        // State changed
        if (callInfo.state !== lastCallState) {
            console.log('[CTM-Monitor] Call state changed:', lastCallState, '->', callInfo.state);
            
            if (callInfo.state === 'active' && callInfo.phone) {
                // Call started
                lastPhoneNumber = callInfo.phone;
                showLiveOverlay(callInfo);
                
                // Find call ID for transcript polling
                findMatchingCall(callInfo.phone).then(matchingCall => {
                    if (matchingCall) {
                        currentCallId = matchingCall.call_id;
                        console.log('[CTM-Monitor] Found call ID:', currentCallId);
                    }
                });
            }
            else if (callInfo.state === 'wrapup' && lastPhoneNumber) {
                // Call ended - start polling for transcript
                showLiveOverlay(callInfo);
                
                if (currentCallId) {
                    pollForTranscript(currentCallId, lastPhoneNumber);
                }
            }
            else if (callInfo.state === 'idle') {
                // Clear everything
                const overlay = document.getElementById('ats-automation-overlay');
                if (overlay && !isAnalyzing) {
                    // Keep overlay for a moment in case analysis is coming
                    setTimeout(() => {
                        if (!isAnalyzing) overlay.remove();
                    }, 5000);
                }
                currentCallId = null;
            }
            
            lastCallState = callInfo.state;
        }
        
        // Update live overlay if call is active
        if (callInfo.state === 'active' || callInfo.state === 'ringing' || callInfo.state === 'connecting') {
            showLiveOverlay(callInfo);
        }
    }

    /**
     * Start monitoring
     */
    function startMonitoring() {
        console.log('[CTM-Monitor] Starting CTM call monitoring...');
        monitorLoop();
        pollTimer = setInterval(monitorLoop, POLL_INTERVAL);
    }

    /**
     * Stop monitoring
     */
    function stopMonitoring() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        if (transcriptPollTimer) {
            clearInterval(transcriptPollTimer);
            transcriptPollTimer = null;
        }
        console.log('[CTM-Monitor] Stopped monitoring');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
        startMonitoring();
    }

    // Expose for debugging
    window.ctmCallMonitor = {
        getCallInfo,
        stop: stopMonitoring,
        start: startMonitoring
    };

})();