/**
 * CTM Monitor - DOM-Based Call Detection with Auto-Record Pipeline
 *
 * Architecture:
 * - MutationObserver + periodic DOM checks for call detection (no webhooks needed)
 * - Auto-start tab recording when call is detected in DOM
 * - Auto-stop recording when call ends, send audio to /api/transcribe
 * - AI analysis displayed in overlay via showCallAnalysis()
 * - Status broadcasting to service worker for popup status indicators
 * - Webhook polling reduced to 60s interval (fallback only)
 *
 * Client Accounts: flyland, banyan, element, takami, tbt, legacy
 */

(function() {
    'use strict';

    // =============================================================================
    // CLIENT CONFIGURATIONS
    // =============================================================================
    const CLIENT_CONFIGS = {
        flyland: {
            name: 'Flyland Recovery',
            dispositionTags: ['payment', 'callback', 'voicemail', 'sale', 'no_sale'],
            sfMappings: {
                phone: 'Phone',
                state: 'State__c',
                insurance: 'Insurance__c',
                disposition: 'Call_Disposition__c'
            },
            triggers: {
                autoSearchSF: true,
                autoFillWrapup: true,
                tagOnDisconnect: ['voicemail']
            }
        },
        banyan: {
            name: 'Banyan',
            dispositionTags: ['callback', 'sale', 'info_request', 'not_interested'],
            sfMappings: {
                phone: 'Phone',
                state: 'State__c',
                disposition: 'Call_Result__c'
            },
            triggers: {
                autoSearchSF: true,
                autoFillWrapup: false,
                tagOnDisconnect: []
            }
        },
        element: {
            name: 'Element',
            dispositionTags: ['callback', 'sale', 'follow_up', 'unqualified'],
            sfMappings: {
                phone: 'Phone',
                state: 'Billing_State__c',
                disposition: 'Call_Outcome__c'
            },
            triggers: {
                autoSearchSF: true,
                autoFillWrapup: true,
                tagOnDisconnect: ['follow_up']
            }
        },
        takami: {
            name: 'Takami Health',
            dispositionTags: ['appointment', 'callback', 'info', 'not_qualified'],
            sfMappings: {
                phone: 'Phone',
                state: 'State',
                disposition: 'Call_Disposition__c'
            },
            triggers: {
                autoSearchSF: true,
                autoFillWrapup: true,
                tagOnDisconnect: []
            }
        },
        tbt: {
            name: 'TBT',
            dispositionTags: ['callback', 'sale', 'transfer', 'hangup'],
            sfMappings: {
                phone: 'Phone',
                state: 'State__c',
                disposition: 'Call_Result__c'
            },
            triggers: {
                autoSearchSF: true,
                autoFillWrapup: false,
                tagOnDisconnect: ['hangup']
            }
        },
        legacy: {
            name: 'Legacy',
            dispositionTags: ['callback', 'sale', 'info', 'other'],
            sfMappings: {
                phone: 'Phone',
                state: 'State__c',
                disposition: 'Call_Disposition__c'
            },
            triggers: {
                autoSearchSF: true,
                autoFillWrapup: true,
                tagOnDisconnect: []
            }
        }
    };

    // =============================================================================
    // CONFIGURATION
    // =============================================================================
    const CONFIG = {
        pollInterval: 5000,        // Poll every 5 seconds
        webhookEndpoint: '/api/webhook-results',
        activeClient: 'flyland'     // Default client
    };
    
    let monitorInterval = null;
    let lastCallId = null;
    let isInitialized = false;

    // =============================================================================
    // DOM MONITORING STATE
    // =============================================================================
    let domObserver = null;
    let domCheckInterval = null;
    let lastInboundState = false;
    let lastOutboundState = false;
    let currentCallId = null;
    let callStartTime = null;
    let recordedChunks = [];
    let mediaRecorder = null;
    let recordingStream = null;

    // Monitoring state for status indicator
    const MONITOR_STATE = {
        MONITORING: 'monitoring',
        CALL_ACTIVE: 'call_active',
        RECORDING: 'recording',
        PROCESSING: 'processing',
        IDLE: 'idle',
        ERROR: 'error'
    };
    let currentMonitorState = MONITOR_STATE.IDLE;
    let monitorStateListeners = [];

    // =============================================================================
    // MONITOR STATE BROADCASTING
    // =============================================================================
    function broadcastMonitorState(state, extra = {}) {
        currentMonitorState = state;
        chrome.runtime.sendMessage({
            type: 'CTM_MONITOR_STATE',
            payload: {
                state: state,
                timestamp: Date.now(),
                phone: currentCallId ? extractPhoneFromState() : null,
                ...extra
            }
        }).catch(() => {});
        monitorStateListeners.forEach(cb => {
            try { cb(state, extra); } catch(e) {}
        });
        logInfo('Monitor state: ' + state, extra);
    }

    function addMonitorStateListener(cb) {
        monitorStateListeners.push(cb);
    }

    // =============================================================================
    // DOM OBSERVER FOR CALL DETECTION
    // =============================================================================
    function isElementVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0' &&
               el.offsetParent !== null;
    }

    function isOnSoftphonePage() {
        try {
            const url = window.location.href;
            const pathname = new URL(url).pathname;
            return pathname === '/calls/phone' || pathname.endsWith('/calls/phone');
        } catch(e) {
            return false;
        }
    }

    function getCallerPhoneFromDOM() {
        const incomingPhone = document.querySelector('#incoming-call-info .info-body');
        if (incomingPhone && isElementVisible(incomingPhone)) {
            return cleanPhone(incomingPhone.textContent);
        }
        const activePhone = document.querySelector('.calling_number .phone_number');
        if (activePhone && isElementVisible(activePhone)) {
            return cleanPhone(activePhone.textContent);
        }
        const ringInfo = document.querySelector('.ringing-info .phone-number');
        if (ringInfo && isElementVisible(ringInfo)) {
            return cleanPhone(ringInfo.textContent);
        }
        return null;
    }

    function getCallerNameFromDOM() {
        const incomingName = document.querySelector('#incoming-call-info .info-title');
        if (incomingName && isElementVisible(incomingName)) {
            return incomingName.textContent.trim();
        }
        const activeName = document.querySelector('.calling_number .full_name');
        if (activeName && isElementVisible(activeName)) {
            return activeName.textContent.trim();
        }
        return null;
    }

    function cleanPhone(phone) {
        if (!phone) return null;
        return phone.replace(/[^0-9+]/g, '');
    }

    function extractPhoneFromState() {
        return getCallerPhoneFromDOM() || currentCallId;
    }

    function startDOMObserver() {
        const observer = new MutationObserver(() => {
            checkDOMCallState();
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'data-status']
        });
        domObserver = observer;

        domCheckInterval = setInterval(() => {
            checkDOMCallState();
        }, 1000);
    }

    function stopDOMObserver() {
        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }
        if (domCheckInterval) {
            clearInterval(domCheckInterval);
            domCheckInterval = null;
        }
    }

    function checkDOMCallState() {
        if (!isOnSoftphonePage()) return;

        const inboundEl = document.querySelector('.agent-status-inbound');
        const outboundEl = document.querySelector('.agent-status-outbound');
        const inboundVisible = isElementVisible(inboundEl);
        const outboundVisible = isElementVisible(outboundEl);
        const mainStatus = document.querySelector('main[data-status]');
        const mainStatusVal = mainStatus?.getAttribute('data-status');

        const phone = getCallerPhoneFromDOM();
        const callerName = getCallerNameFromDOM();

        // Call START detected
        if (inboundVisible && !lastInboundState) {
            logInfo('DOM: Inbound call START detected', { phone, callerName });
            handleCallStart(phone, 'inbound', callerName);
        } else if (outboundVisible && !lastOutboundState) {
            logInfo('DOM: Outbound call START detected', { phone, callerName });
            handleCallStart(phone, 'outbound', callerName);
        }

        // Call END detected
        const wasInCall = lastInboundState || lastOutboundState;
        const isInCall = inboundVisible || outboundVisible;
        if (wasInCall && !isInCall) {
            const endState = mainStatusVal === 'ready' || mainStatusVal === 'offline' || !mainStatusVal;
            if (endState) {
                logInfo('DOM: Call END detected', { mainStatus: mainStatusVal });
                handleCallEnd();
            }
        }

        lastInboundState = inboundVisible;
        lastOutboundState = outboundVisible;
    }

    // =============================================================================
    // AUTO-RECORD PIPELINE
    // =============================================================================
    async function handleCallStart(phone, direction, callerName) {
        if (currentMonitorState === MONITOR_STATE.RECORDING) {
            logInfo('Already recording, ignoring call start');
            return;
        }

        currentCallId = phone || 'call_' + Date.now();
        callStartTime = Date.now();

        broadcastMonitorState(MONITOR_STATE.CALL_ACTIVE, {
            phone: currentCallId,
            direction,
            callerName
        });

        // Auto-start recording
        await startAutoRecording();
    }

    async function handleCallEnd() {
        if (currentMonitorState !== MONITOR_STATE.RECORDING) {
            broadcastMonitorState(MONITOR_STATE.IDLE);
            currentCallId = null;
            return;
        }

        broadcastMonitorState(MONITOR_STATE.PROCESSING);
        await stopAutoRecording();
    }

    async function startAutoRecording() {
        if (currentMonitorState === MONITOR_STATE.RECORDING) return;
        if (!chrome.tabCapture) {
            logWarn('Tab capture not available');
            return;
        }

        try {
            logInfo('Starting auto recording...');
            recordedChunks = [];

            recordingStream = await chrome.tabCapture.capture({
                audio: true,
                video: false
            });

            if (!recordingStream) {
                logWarn('Tab capture returned null stream');
                return;
            }

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            mediaRecorder = new MediaRecorder(recordingStream, { mimeType });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.start(1000);
            broadcastMonitorState(MONITOR_STATE.RECORDING, {
                phone: currentCallId,
                duration: 0
            });
            logInfo('Recording started');

        } catch(e) {
            logError('Auto recording failed: ' + e.message);
            broadcastMonitorState(MONITOR_STATE.ERROR, { error: e.message });
        }
    }

    async function stopAutoRecording() {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            currentCallId = null;
            broadcastMonitorState(MONITOR_STATE.IDLE);
            return;
        }

        try {
            mediaRecorder.stop();
            if (recordingStream) {
                recordingStream.getTracks().forEach(t => t.stop());
            }

            await new Promise(r => setTimeout(r, 500));

            if (recordedChunks.length > 0) {
                const duration = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : null;
                logInfo(`Recording stopped, chunks: ${recordedChunks.length}, duration: ${duration}s`);
                await processRecording(duration);
            } else {
                logWarn('No audio chunks captured');
            }

        } catch(e) {
            logError('Stop recording failed: ' + e.message);
        }

        mediaRecorder = null;
        recordingStream = null;
        recordedChunks = [];
        currentCallId = null;
        callStartTime = null;
    }

    async function processRecording(duration) {
        try {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            const reader = new FileReader();

            const audioBase64 = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            const base64Data = audioBase64.split(',')[1];
            const serverUrl = await getServerUrl();

            logInfo('Sending audio to transcription API...', { size: blob.size, duration });

            const response = await fetch(`${serverUrl}/api/transcribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audio: base64Data,
                    phone: getCallerPhoneFromDOM() || null,
                    client: CONFIG.activeClient,
                    format: 'webm',
                    duration: duration
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'Server error' }));
                throw new Error(err.error || `HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.error) {
                logWarn('Transcription failed, showing manual input');
                showManualTranscriptPrompt(result.transcription || '');
                return;
            }

            // Format and display results
            const phone = getCallerPhoneFromDOM() || currentCallId || 'Unknown';
            const callerName = getCallerNameFromDOM() || '';

            const analysis = result.analysis || {};
            const displayResult = {
                phone: phone,
                callerName: callerName,
                transcript: result.transcription || '',
                summary: analysis.summary || '',
                salesforceNotes: analysis.salesforce_notes || '',
                qualificationScore: analysis.qualification_score || 0,
                suggestedDisposition: analysis.suggested_disposition || 'New',
                tags: analysis.tags || [],
                sentiment: analysis.sentiment || 'neutral',
                detectedState: analysis.detected_state || '',
                detectedInsurance: analysis.detected_insurance || '',
                callId: 'dom_' + Date.now(),
                timestamp: Date.now(),
                client: CONFIG.activeClient
            };

            showCallAnalysis(displayResult);
            handleAccountSpecificActions(analysis);

            chrome.runtime.sendMessage({ type: 'INCREMENT_STAT', payload: { stat: 'calls' } });
            chrome.runtime.sendMessage({ type: 'INCREMENT_STAT', payload: { stat: 'analysis' } });

            broadcastMonitorState(MONITOR_STATE.IDLE);

        } catch(e) {
            logError('Process recording failed: ' + e.message);
            broadcastMonitorState(MONITOR_STATE.ERROR, { error: e.message });
        }
    }

    function showManualTranscriptPrompt(existingTranscript) {
        const overlay = document.getElementById('ats-manual-transcript');
        if (overlay) overlay.remove();

        const el = document.createElement('div');
        el.id = 'ats-manual-transcript';
        el.style.cssText = 'position:fixed;bottom:20px;right:20px;width:320px;background:#1e1e1e;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);z-index:999999;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:16px;color:#fff;font-size:13px;';
        el.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <strong style="font-size:14px;">Call Ended - Enter Transcript</strong>
                <button id="ats-mt-close" style="background:none;border:none;color:#888;font-size:20px;cursor:pointer;">&times;</button>
            </div>
            <textarea id="ats-mt-text" placeholder="Paste transcript here..." rows="4" style="width:100%;background:#2a2a2a;border:1px solid #444;border-radius:6px;padding:8px;color:#ccc;font-size:12px;resize:vertical;box-sizing:border-box;">${existingTranscript || ''}</textarea>
            <button id="ats-mt-submit" style="margin-top:8px;width:100%;padding:10px;background:#22c55e;border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer;font-size:13px;">Analyze Transcript</button>
        `;

        document.body.appendChild(el);

        el.querySelector('#ats-mt-close').addEventListener('click', () => el.remove());
        el.querySelector('#ats-mt-submit').addEventListener('click', async () => {
            const transcript = el.querySelector('#ats-mt-text').value.trim();
            if (!transcript) return;

            el.querySelector('#ats-mt-submit').disabled = true;
            el.querySelector('#ats-mt-submit').textContent = 'Analyzing...';

            try {
                const serverUrl = await getServerUrl();
                const resp = await fetch(`${serverUrl}/api/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        transcription: transcript,
                        phone: getCallerPhoneFromDOM() || null,
                        client: CONFIG.activeClient
                    })
                });

                if (resp.ok) {
                    const analysis = await resp.json();
                    const result = {
                        phone: getCallerPhoneFromDOM() || 'Unknown',
                        callerName: getCallerNameFromDOM() || '',
                        transcript: transcript,
                        summary: analysis.summary || '',
                        salesforceNotes: analysis.salesforce_notes || '',
                        qualificationScore: analysis.qualification_score || 0,
                        suggestedDisposition: analysis.suggested_disposition || 'New',
                        tags: analysis.tags || [],
                        sentiment: analysis.sentiment || 'neutral',
                        detectedState: analysis.detected_state || '',
                        detectedInsurance: analysis.detected_insurance || '',
                        callId: 'dom_' + Date.now(),
                        timestamp: Date.now(),
                        client: CONFIG.activeClient
                    };
                    showCallAnalysis(result);
                    handleAccountSpecificActions(analysis);
                    el.remove();
                }
            } catch(e) {
                logError('Manual transcript analysis failed: ' + e.message);
            }

            broadcastMonitorState(MONITOR_STATE.IDLE);
        });
    }

    // =============================================================================
    // REMOTE LOGGING
    // =============================================================================
    async function remoteLog(level, message, data = {}) {
        try {
            const serverUrl = await getServerUrl();
            
            const logEntry = {
                source: 'ctm',
                level: level,
                message: message,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                client: CONFIG.activeClient,
                ...data
            };
            
            // Send to AI server logging endpoint (if configured)
            fetch(`${serverUrl}/api/logs/${CONFIG.activeClient}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logEntry)
            }).catch(() => {});
            
            // Also log locally for debugging
            const logFn = level === 'error' ? console.error : 
                         level === 'warn' ? console.warn : console.log;
            logFn(`[ATS][${level.toUpperCase()}] ${message}`, data);
            
        } catch (e) {
            // Silent fail for logging
        }
    }

    function logInfo(message, data) { remoteLog('log', message, data); }
    function logWarn(message, data) { remoteLog('warn', message, data); }
    function logError(message, data) { remoteLog('error', message, data); }

    // =============================================================================
    // CLIENT CONFIG HELPERS
    // =============================================================================
    function getClientConfig() {
        return CLIENT_CONFIGS[CONFIG.activeClient] || CLIENT_CONFIGS.flyland;
    }

    function getSfMapping(field) {
        const config = getClientConfig();
        return config.sfMappings[field] || field;
    }

    // =============================================================================
    // CONFIG LOADING
    // =============================================================================
    async function loadConfig() {
        try {
            const keys = ['activeClient', 'aiServerUrl', 'salesforceUrl', 'remoteLogUrl'];
            const result = await chrome.storage.local.get(keys);
            
            if (result.activeClient) {
                CONFIG.activeClient = result.activeClient;
            }
            
            logInfo('Config loaded', { 
                client: CONFIG.activeClient
            });
            
        } catch (e) {
            logWarn('Config load failed, using defaults', { error: e.message });
        }
    }

    async function getServerUrl() {
        try {
            const result = await chrome.storage.local.get('aiServerUrl');
            return result.aiServerUrl || 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
        } catch (e) {
            return 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
        }
    }

    // =============================================================================
    // WEBHOOK FETCHING
    // =============================================================================
    async function fetchWebhookResults() {
        try {
            const serverUrl = await getServerUrl();
            
            const response = await fetch(`${serverUrl}${CONFIG.webhookEndpoint}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(10000)
            });
            
            if (!response.ok) {
                logWarn('Webhook fetch failed', { status: response.status });
                return null;
            }
            
            const data = await response.json();
            logInfo('Webhook results fetched', { hasData: !!data, client: CONFIG.activeClient });
            return data;
            
        } catch (error) {
            logWarn('Webhook fetch error', { error: error.message });
            return null;
        }
    }

    // =============================================================================
    // CALL HANDLING
    // =============================================================================
    function broadcastCallEvent(data) {
        try {
            chrome.runtime.sendMessage({
                type: 'CTM_CALL_EVENT',
                payload: { ...data, client: CONFIG.activeClient }
            });
        } catch (e) {
            // Silent fail
        }
    }

    function handleAccountSpecificActions(result) {
        const clientConfig = getClientConfig();
        
        logInfo('Processing account-specific actions', { 
            client: CONFIG.activeClient, 
            disposition: result.suggestedDisposition 
        });

        // Trigger based on disposition
        if (result.suggestedDisposition) {
            const disp = result.suggestedDisposition.toLowerCase();
            
            // Auto-tag based on disposition
            if (clientConfig.triggers.tagOnDisconnect.includes(disp)) {
                logInfo('Tag triggered by disposition', { tag: disp });
                // Notify background to apply tag
                chrome.runtime.sendMessage({
                    type: 'APPLY_CTM_TAG',
                    payload: { tag: disp, phone: result.phone }
                });
            }
        }

        // Search Salesforce
        if (clientConfig.triggers.autoSearchSF && result.phone) {
            chrome.runtime.sendMessage({
                type: 'SEARCH_SALESFORCE',
                payload: { 
                    phone: result.phone,
                    client: CONFIG.activeClient,
                    mapping: clientConfig.sfMappings
                }
            });
        }
    }

    function showCallAnalysis(result) {
        logInfo('Showing call analysis', { phone: result.phone, client: CONFIG.activeClient });
        
        // Send to background to show overlay
        chrome.runtime.sendMessage({
            type: 'SHOW_CALL_ANALYSIS',
            payload: { ...result, client: CONFIG.activeClient }
        });
        
        // Handle account-specific actions
        handleAccountSpecificActions(result);
        
        // Broadcast event
        broadcastCallEvent({
            phoneNumber: result.phone,
            callerName: result.callerName || result.phone,
            status: 'analyzed',
            event: 'call_analyzed',
            timestamp: Date.now(),
            client: CONFIG.activeClient
        });
    }

    async function checkForNewCalls() {
        const data = await fetchWebhookResults();
        
        if (!data) return;
        
        // Get results array
        let results = [];
        if (data.results && Array.isArray(data.results)) {
            results = data.results;
        } else if (data.phone || data.call_id) {
            results = [data];
        }
        
        if (results.length === 0) return;
        
        // Get the most recent result
        const latest = results[0];
        
        // Skip if we've already processed this call
        const callId = latest.call_id || latest.id || latest.phone + '_' + (latest.timestamp || Date.now());
        
        if (callId === lastCallId) {
            return; // Already processed
        }
        
        // Check if this result has analysis (transcript was processed)
        if (!latest.transcript && !latest.analysis) {
            logInfo('Waiting for transcript', { callId });
            return;
        }
        
        logInfo('New call detected', { 
            phone: latest.phone, 
            callId: callId,
            client: CONFIG.activeClient 
        });
        
        lastCallId = callId;
        
        // Format the result for display
        const analysis = latest.analysis || {};
        
        const result = {
            phone: latest.phone,
            callerName: latest.caller_name || analysis.caller_name || null,
            transcript: latest.transcript || '',
            summary: analysis.summary || '',
            salesforceNotes: analysis.salesforce_notes || '',
            qualificationScore: analysis.qualification_score || 0,
            suggestedDisposition: analysis.suggested_disposition || 'New',
            tags: analysis.tags || [],
            sentiment: analysis.sentiment || 'neutral',
            detectedState: analysis.detected_state || null,
            detectedInsurance: analysis.detected_insurance || null,
            callId: callId,
            timestamp: latest.timestamp || Date.now(),
            client: CONFIG.activeClient
        };
        
        showCallAnalysis(result);
        
        // Increment stats
        chrome.runtime.sendMessage({ type: 'INCREMENT_STAT', payload: { stat: 'calls' } });
        chrome.runtime.sendMessage({ type: 'INCREMENT_STAT', payload: { stat: 'analysis' } });
    }

    // =============================================================================
    // MESSAGE LISTENER (for service worker communication)
    // =============================================================================
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
            case 'PING':
                sendResponse({
                    pong: true,
                    monitorState: currentMonitorState,
                    phone: currentCallId,
                    initialized: isInitialized
                });
                break;
            case 'GET_CTM_MONITOR_STATE':
                sendResponse({
                    state: currentMonitorState,
                    phone: currentCallId,
                    initialized: isInitialized
                });
                break;
            case 'STOP_DOM_MONITORING':
                stopDOMObserver();
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
                if (recordingStream) {
                    recordingStream.getTracks().forEach(t => t.stop());
                }
                broadcastMonitorState(MONITOR_STATE.IDLE);
                sendResponse({ success: true });
                break;
        }
        return true;
    });

    // =============================================================================
    // MONITORING LIFECYCLE
    // =============================================================================
    function startMonitoring() {
        if (isInitialized) return;

        logInfo('CTM DOM Monitor starting', { client: CONFIG.activeClient });
        isInitialized = true;

        startDOMObserver();
        broadcastMonitorState(MONITOR_STATE.MONITORING);

        // Reduce webhook polling to occasional backup (every 60s instead of 5s)
        if (monitorInterval) clearInterval(monitorInterval);
        monitorInterval = setInterval(() => {
            // Only poll if not recording and not in a call
            if (currentMonitorState === MONITOR_STATE.IDLE ||
                currentMonitorState === MONITOR_STATE.MONITORING) {
                checkForNewCalls();
            }
        }, 60000);

        setTimeout(checkForNewCalls, 2000);
    }

    function stopMonitoring() {
        stopDOMObserver();
        if (monitorInterval) {
            clearInterval(monitorInterval);
            monitorInterval = null;
        }
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        if (recordingStream) {
            recordingStream.getTracks().forEach(t => t.stop());
        }
        isInitialized = false;
        broadcastMonitorState(MONITOR_STATE.IDLE);
        logInfo('CTM DOM Monitor stopped', { client: CONFIG.activeClient });
    }

    // =============================================================================
    // URL VALIDATION - Only run on the live softphone page
    // =============================================================================
    const CTM_SOFTPHONE_PATH = '/calls/phone';
    
    function isOnSoftphonePage() {
        const url = window.location.href;
        const pathname = new URL(url).pathname;
        return pathname === CTM_SOFTPHONE_PATH || pathname.endsWith('/calls/phone');
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    async function init() {
        // Only run on the CTM live softphone page (/calls/phone)
        if (!isOnSoftphonePage()) {
            console.log('[ATS] Not on CTM softphone page (/calls/phone), skipping monitor');
            return;
        }
        
        await loadConfig();
        
        logInfo('CTM Monitor initializing', { 
            client: CONFIG.activeClient,
            clientName: getClientConfig().name
        });
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startMonitoring);
        } else {
            startMonitoring();
        }
    }

    // Start
    init();

    // Cleanup on unload
    window.addEventListener('unload', stopMonitoring);
})();
