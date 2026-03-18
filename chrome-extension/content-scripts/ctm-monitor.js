/**
 * CTM Monitor - Webhook-only Version with Remote Logging & Multi-Client Support
 * 
 * Architecture:
 * - Polls server webhook endpoint for analyzed call data
 * - Remote logs to shared webhook endpoint (tagged: source="ctm")
 * - Account-specific branching for all six client accounts
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
    // MONITORING LIFECYCLE
    // =============================================================================
    function startMonitoring() {
        if (isInitialized) return;
        
        logInfo('CTM Webhook Monitor starting', { client: CONFIG.activeClient });
        isInitialized = true;
        
        // Poll server for webhook results
        monitorInterval = setInterval(() => {
            checkForNewCalls();
        }, CONFIG.pollInterval);
        
        // Check immediately after startup
        setTimeout(checkForNewCalls, 2000);
    }

    function stopMonitoring() {
        if (monitorInterval) {
            clearInterval(monitorInterval);
            monitorInterval = null;
        }
        isInitialized = false;
        logInfo('CTM Webhook Monitor stopped', { client: CONFIG.activeClient });
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
