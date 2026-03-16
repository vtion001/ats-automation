/**
 * CTM Call Monitor - Enhanced Version
 * Detects calls, transcribes, auto-searches Salesforce, saves notes
 */

(function() {
    'use strict';

    const CONFIG = {
        pollInterval: 1000,
        transcriptionEnabled: true,
        autoSearchSF: true,
        autoAnalyze: true,  // Auto-analyze calls
        client: 'flyland',
        salesforceUrl: ''  // Will be loaded from storage
    };

    let lastCallState = null;
    let monitorInterval = null;
    let speechRecognition = null;
    let currentCallData = null;
    let transcriptionText = '';

    async function loadConfig() {
        try {
            const keys = ['transcriptionEnabled', 'autoSearchSF', 'autoAnalyze', 'activeClient', 'salesforceUrl', 'saveMarkdown'];
            const result = await chrome.storage.local.get(keys);
            
            if (result.transcriptionEnabled !== undefined) CONFIG.transcriptionEnabled = result.transcriptionEnabled;
            if (result.autoSearchSF !== undefined) CONFIG.autoSearchSF = result.autoSearchSF;
            if (result.autoAnalyze !== undefined) CONFIG.autoAnalyze = result.autoAnalyze;
            if (result.activeClient) CONFIG.client = result.activeClient;
            if (result.salesforceUrl) CONFIG.salesforceUrl = result.salesforceUrl;
            if (result.saveMarkdown !== undefined) CONFIG.saveMarkdown = result.saveMarkdown;
            
            console.log('[ATS] Config loaded:', CONFIG);
        } catch (e) {
            console.log('[ATS] Using default config');
        }
    }

    function initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log('[ATS] Speech recognition not supported');
            return null;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    transcriptionText += transcript + ' ';
                    console.log('[ATS] Final transcript:', transcript);
                } else {
                    interimTranscript += transcript;
                }
            }
        };

        recognition.onerror = (event) => {
            console.error('[ATS] Speech recognition error:', event.error);
        };

        recognition.onend = () => {
            console.log('[ATS] Speech recognition ended');
        };

        return recognition;
    }

    function detectCallEvent() {
        const selectors = [
            '.call-status',
            '.incoming-call', 
            '.outgoing-call',
            '.call-notification',
            '.active-call',
            '.call-info',
            '.caller-id',
            '[data-call-status]',
            '[class*="call-active"]',
            '[class*="inbound"]',
            '.ringing',
            '.incall'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const status = element.textContent?.trim() || element.getAttribute('data-call-status');
                if (status && status !== lastCallState && status.length < 50) {
                    lastCallState = status;
                    return { status, element };
                }
            }
        }
        return null;
    }

    function extractPhoneNumber() {
        const phoneSelectors = [
            '.caller-number',
            '.phone-number',
            '.call-from',
            '.phone-display',
            '[data-phone]',
            '.tel-number',
            '[class*="phone"]',
            '[class*="caller"]'
        ];

        for (const selector of phoneSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const phone = element.textContent?.trim() || element.getAttribute('data-phone');
                if (phone && phone.length >= 7 && phone.length <= 20) {
                    return cleanPhoneNumber(phone);
                }
            }
        }
        return null;
    }

    function extractCallerName() {
        const nameSelectors = [
            '.caller-name',
            '.contact-name',
            '.name-display',
            '[data-caller-name]',
            '[class*="caller"]'
        ];

        for (const selector of nameSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const name = element.textContent?.trim();
                if (name && name.length > 0 && name.length < 100) {
                    return name;
                }
            }
        }
        return null;
    }

    function cleanPhoneNumber(phone) {
        return phone.replace(/[^\d+]/g, '').replace(/^\+1/, '');
    }

    function broadcastCallEvent(data) {
        chrome.runtime.sendMessage({
            type: 'CTM_CALL_EVENT',
            payload: data
        });
    }

    function startTranscription() {
        if (!speechRecognition) return;
        
        transcriptionText = '';
        try {
            speechRecognition.start();
            console.log('[ATS] Transcription started');
        } catch (e) {
            console.log('[ATS] Transcription already running');
        }
    }

    function stopTranscription() {
        if (!speechRecognition) return;
        
        try {
            speechRecognition.stop();
            console.log('[ATS] Transcription stopped');
        } catch (e) {
            console.log('[ATS] Error stopping transcription');
        }
    }

    function saveTranscriptionToMarkdown(callData) {
        if (!CONFIG.saveMarkdown) {
            console.log('[ATS] Save to markdown disabled');
            chrome.runtime.sendMessage({
                type: 'TRANSCRIPTION_COMPLETE',
                payload: {
                    markdown: transcriptionText,
                    phone: callData.phoneNumber,
                    callerName: callData.callerName,
                    timestamp: new Date().toISOString()
                }
            });
            return;
        }

        const markdown = `# Call Transcription - ${new Date().toISOString()}

## Call Info
- **Phone:** ${callData.phoneNumber || 'Unknown'}
- **Caller Name:** ${callData.callerName || 'Unknown'}
- **Status:** ${callData.status}
- **Start Time:** ${callData.startTime}
- **End Time:** ${new Date().toISOString()}

## Transcription

${transcriptionText || 'No transcription available'}

## Notes

---

*Generated by ATS Automation*
`;

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `call_${Date.now()}_${callData.phoneNumber || 'unknown'}.md`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        console.log('[ATS] Transcription saved to markdown');
        
        chrome.runtime.sendMessage({
            type: 'TRANSCRIPTION_COMPLETE',
            payload: {
                markdown: markdown,
                phone: callData.phoneNumber,
                callerName: callData.callerName,
                timestamp: new Date().toISOString()
            }
        });
    }

    function handleCallStart(callData) {
        console.log('[ATS] Call started:', callData);
        currentCallData = { ...callData, startTime: new Date().toISOString() };
        
        // Auto-trigger AI analysis if enabled
        if (CONFIG.autoAnalyze && callData.phoneNumber) {
            console.log('[ATS] Auto-analyze enabled, triggering AI analysis...');
            triggerAutoAnalyze(callData);
        }
        
        if (CONFIG.transcriptionEnabled) {
            startTranscription();
        }

        if (CONFIG.autoSearchSF && callData.phoneNumber) {
            chrome.runtime.sendMessage({
                type: 'SEARCH_SALESFORCE',
                payload: { phone: callData.phoneNumber }
            });
        }

        broadcastCallEvent({ ...callData, event: 'call_started' });
    }
    
    // Auto-analyze: Send call data to AI server for analysis
    async function triggerAutoAnalyze(callData) {
        try {
            // Get AI server URL
            const result = await chrome.storage.local.get('aiServerUrl');
            const serverUrl = result.aiServerUrl || 'http://4.157.143.70:8000';
            
            // Prepare analysis request
            // Since we don't have transcription yet, we'll use the caller info
            const analysisData = {
                phone: callData.phoneNumber,
                client: CONFIG.client,
                callerName: callData.callerName,
                callStatus: callData.status
            };
            
            console.log('[ATS] Sending to AI server for analysis:', analysisData);
            
            // For now, we just send the phone number - the server will need transcription
            // In a real scenario, we'd wait for transcription or use CTM's call info
            chrome.runtime.sendMessage({
                type: 'CTM_CALL_DETECTED',
                payload: {
                    ...callData,
                    autoAnalyze: true,
                    serverUrl: serverUrl
                }
            });
            
            console.log('[ATS] Auto-analyze triggered for phone:', callData.phoneNumber);
            
        } catch (error) {
            console.error('[ATS] Auto-analyze error:', error);
        }
    }

    function handleCallEnd() {
        console.log('[ATS] Call ended');
        
        if (speechRecognition && transcriptionText) {
            stopTranscription();
            saveTranscriptionToMarkdown(currentCallData);
        }

        if (currentCallData) {
            broadcastCallEvent({ ...currentCallData, event: 'call_ended' });
        }
        
        lastCallState = null;
        currentCallData = null;
    }

    function startMonitoring() {
        console.log('[ATS] CTM Enhanced Monitor started');
        
        speechRecognition = initSpeechRecognition();

        let callActive = false;

        // Event Listener: MutationObserver for efficient DOM detection
        const observer = new MutationObserver((mutations) => {
            if (callActive) return;
            
            const callEvent = detectCallEvent();
            if (callEvent) {
                const phoneNumber = extractPhoneNumber();
                const callerName = extractCallerName();
                
                const callData = {
                    status: callEvent.status,
                    phoneNumber,
                    callerName,
                    timestamp: Date.now(),
                    url: window.location.href
                };
                
                handleCallStart(callData);
                callActive = true;
            }
        });
        
        // Start observing the body for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-call-status']
        });
        
        console.log('[ATS] DOM Event listeners started');

        // Fallback: polling interval
        monitorInterval = setInterval(() => {
            const callEvent = detectCallEvent();
            
            if (callEvent && !callActive) {
                const phoneNumber = extractPhoneNumber();
                const callerName = extractCallerName();
                
                const callData = {
                    status: callEvent.status,
                    phoneNumber,
                    callerName,
                    timestamp: Date.now(),
                    url: window.location.href
                };
                
                handleCallStart(callData);
                callActive = true;
            } else if (!callEvent && callActive) {
                handleCallEnd();
                callActive = false;
            }
        }, CONFIG.pollInterval);
    }

    function stopMonitoring() {
        if (monitorInterval) {
            clearInterval(monitorInterval);
            monitorInterval = null;
        }
        stopTranscription();
    }

    loadConfig().then(() => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startMonitoring);
        } else {
            startMonitoring();
        }
    });

    window.addEventListener('unload', stopMonitoring);
})();
