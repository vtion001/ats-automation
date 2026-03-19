/**
 * CTM Call Monitor - API-Based (No DOM Monitoring)
 * 
 * Uses CTM API to detect calls and fetch transcripts.
 * No dependency on CTM softphone UI.
 * 
 * Architecture:
 * 1. Poll /api/ctm/calls for recent calls
 * 2. Detect active/in-progress calls
 * 3. When call ends, fetch transcript from API
 * 4. Show analysis overlay with AI insights
 */

(function() {
    'use strict';

    const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
    const POLL_INTERVAL = 10000; // Poll API every 10 seconds
    const TRANSCRIPT_POLL_INTERVAL = 5000; // Poll for transcript after call

    let pollTimer = null;
    let transcriptPollTimer = null;
    let isAnalyzing = false;
    let activeCallIds = new Set();
    let processedCallIds = new Set();

    /**
     * Fetch recent calls from API
     */
    async function fetchCalls() {
        try {
            const response = await fetch(`${SERVER_URL}/api/ctm/calls?limit=20&hours=2`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('[CTM-API-Monitor] Failed to fetch calls:', error);
            return [];
        }
    }

    /**
     * Check if call is active (in progress)
     */
    function isCallActive(call) {
        const status = (call.status || '').toLowerCase();
        const activeStatuses = ['in-progress', 'active', 'ringing', 'connecting', 'in-progress'];
        return activeStatuses.includes(status) || call.duration === null;
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
                console.log('[CTM-API-Monitor] Transcript poll timeout for:', callId);
                return;
            }

            try {
                const response = await fetch(`${SERVER_URL}/api/ctm/calls/${callId}/transcript`);
                if (!response.ok) return;

                const data = await response.json();
                
                if (data.available && data.transcript && data.transcript.length > 10) {
                    clearInterval(transcriptPollTimer);
                    await analyzeAndShow(data.transcript, phone, callId);
                }
            } catch (error) {
                console.error('[CTM-API-Monitor] Transcript poll error:', error);
            }
        }, TRANSCRIPT_POLL_INTERVAL);
    }

    /**
     * Analyze transcript and show overlay
     */
    async function analyzeAndShow(transcript, phone, callId) {
        if (isAnalyzing) return;
        isAnalyzing = true;

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

            const analysis = await response.json();
            showCompleteOverlay(analysis, phone, transcript);

        } catch (error) {
            console.error('[CTM-API-Monitor] Analysis error:', error);
            showErrorOverlay(phone);
        } finally {
            isAnalyzing = false;
        }
    }

    /**
     * Show error overlay if analysis fails
     */
    function showErrorOverlay(phone) {
        const existing = document.getElementById('ats-automation-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'ats-automation-overlay';
        overlay.innerHTML = `
            <div class="ats-overlay-header">
                <span class="ats-title">ATS Automation</span>
                <button class="ats-close-btn">×</button>
            </div>
            <div class="ats-overlay-content">
                <div class="ats-header-section">
                    <div class="ats-phone-icon">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
                        </svg>
                    </div>
                    <span class="ats-phone-number">${formatPhone(phone) || 'Unknown'}</span>
                    <div class="ats-status-row">
                        <span class="ats-call-state">Analysis unavailable</span>
                    </div>
                </div>
                <div class="ats-error-message">
                    Transcript analysis failed. Please check API connectivity.
                </div>
            </div>
        `;

        addOverlayStyles();
        document.body.appendChild(overlay);
        
        overlay.querySelector('.ats-close-btn').addEventListener('click', () => overlay.remove());
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
                    <div class="ats-phone-icon">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
                        </svg>
                    </div>
                    <span class="ats-phone-number">${formatPhone(phone) || 'Unknown'}</span>
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
                            <div class="ats-info-item">
                                <span class="ats-info-label">Sentiment:</span>
                                <span class="ats-info-value">${sentiment}</span>
                            </div>
                            <div class="ats-info-item">
                                <span class="ats-info-label">Follow-up:</span>
                                <span class="ats-info-value">${analysis.follow_up_required ? 'Yes' : 'No'}</span>
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

        addOverlayStyles();
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
    }

    /**
     * Show waiting overlay while monitoring
     */
    function showWaitingOverlay() {
        let overlay = document.getElementById('ats-automation-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ats-automation-overlay';
            overlay.innerHTML = `
                <div class="ats-overlay-header">
                    <span class="ats-title">ATS Call Monitor</span>
                    <button class="ats-close-btn">×</button>
                </div>
                <div class="ats-overlay-content">
                    <div class="ats-header-section">
                        <div class="ats-phone-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
                            </svg>
                        </div>
                        <span class="ats-phone-number">Monitoring...</span>
                    </div>
                    <div class="ats-status-row">
                        <span class="ats-call-state idle">Waiting for calls</span>
                    </div>
                    <div class="ats-monitoring-info">
                        <small>API-based monitoring active</small>
                    </div>
                </div>
            `;
            
            addOverlayStyles();
            document.body.appendChild(overlay);
            
            overlay.querySelector('.ats-close-btn').addEventListener('click', () => overlay.remove());
        }
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
            .ats-call-state.active { background: #27ae60; color: white; }
            .ats-monitoring-info { margin-top: 12px; color: #999; font-size: 12px; }
            .ats-error-message { text-align: center; padding: 20px; color: #e74c3c; }
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
     * Main API polling loop
     */
    async function monitorLoop() {
        const calls = await fetchCalls();
        
        // Find new active calls
        const currentActiveIds = new Set();
        
        for (const call of calls) {
            const callId = call.call_id;
            currentActiveIds.add(callId);
            
            // New active call detected
            if (isCallActive(call) && !activeCallIds.has(callId)) {
                console.log('[CTM-API-Monitor] Active call detected:', callId, call.phone);
                activeCallIds.add(callId);
                showWaitingOverlay();
            }
            
            // Call ended (was active, now not)
            if (!isCallActive(call) && activeCallIds.has(callId) && !processedCallIds.has(callId)) {
                console.log('[CTM-API-Monitor] Call ended:', callId);
                activeCallIds.delete(callId);
                
                // Start polling for transcript
                if (call.phone || call.caller_name) {
                    processedCallIds.add(callId);
                    pollForTranscript(callId, call.phone || call.caller_name);
                }
            }
        }
        
        // Clean up old processed calls (keep last 100)
        if (processedCallIds.size > 100) {
            const toDelete = Array.from(processedCallIds).slice(0, 50);
            toDelete.forEach(id => processedCallIds.delete(id));
        }
    }

    /**
     * Start API polling
     */
    function startMonitoring() {
        console.log('[CTM-API-Monitor] Starting API-based call monitoring...');
        showWaitingOverlay();
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
        console.log('[CTM-API-Monitor] Stopped monitoring');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
        startMonitoring();
    }

    // Expose for debugging
    window.ctmApiMonitor = {
        stop: stopMonitoring,
        start: startMonitoring,
        fetchCalls
    };

})();
