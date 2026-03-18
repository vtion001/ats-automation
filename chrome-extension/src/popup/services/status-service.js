/**
 * Status Service - Tests all services and connections
 */

const StatusService = {
    async getAIServerUrl() {
        const result = await StorageService.get('aiServerUrl');
        const url = result.aiServerUrl || 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
        console.log('[StatusService] AI Server URL:', url);
        return url;
    },

    async testAIServer() {
        try {
            const serverUrl = await this.getAIServerUrl();
            const response = await fetch(`${serverUrl}/health`, { 
                method: 'GET', 
                signal: AbortSignal.timeout(5000) 
            });
            return response.ok;
        } catch(e) {
            console.log('[StatusService] AI Server test failed:', e.message);
            return false;
        }
    },

    async testSalesforce() {
        try {
            const result = await StorageService.get('salesforceUrl');
            const sfUrl = result.salesforceUrl;
            if (!sfUrl) {
                return { configured: false, status: 'not_configured', connected: false };
            }
            const response = await fetch(`${sfUrl}/services/data/`, { 
                method: 'GET', 
                signal: AbortSignal.timeout(5000),
                credentials: 'include'
            });
            return { configured: true, status: response.ok || response.status === 401 ? 'connected' : 'error', connected: response.ok || response.status === 401 };
        } catch(e) {
            console.log('[StatusService] Salesforce test failed:', e.message);
            return { configured: false, status: 'not_configured', connected: false };
        }
    },

    async testBackground() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve(false);
            }, 8000);

            chrome.runtime.sendMessage({ action: 'PING' }, (response) => {
                clearTimeout(timeout);
                resolve(response && response.pong === true);
            });
        });
    },

    async testCTM() {
        try {
            const tabs = await new Promise(resolve => {
                chrome.tabs.query({ url: '*://*.calltrackingmetrics.com/calls/phone*' }, resolve);
            });

            if (tabs.length === 0) {
                return { status: 'no_tab', connected: false, tabId: null, reason: 'no_ctm_tab' };
            }

            const tabId = tabs[0].id;

            const result = await new Promise(resolve => {
                const timeout = setTimeout(() => {
                    resolve({ error: 'timeout' });
                }, 5000);

                chrome.tabs.sendMessage(tabId, { type: 'GET_CTM_MONITOR_STATE' }, (response) => {
                    clearTimeout(timeout);
                    if (chrome.runtime.lastError) {
                        resolve({ error: chrome.runtime.lastError.message });
                    } else {
                        resolve(response);
                    }
                });
            });

            if (result && result.state) {
                const stateMap = {
                    'monitoring': 'monitoring',
                    'call_active': 'call_active',
                    'recording': 'recording',
                    'processing': 'processing',
                    'idle': 'connected',
                    'error': 'error'
                };
                return {
                    status: stateMap[result.state] || result.state,
                    connected: result.initialized || false,
                    tabId: tabId,
                    phone: result.phone || null,
                    state: result.state,
                    reason: 'ctm_tab_open'
                };
            }

            return { status: 'no_response', connected: false, tabId: tabId, reason: 'no_monitor_response' };

        } catch(e) {
            console.log('[StatusService] CTM test error:', e.message);
            return { status: 'error', connected: false, error: e.message, reason: 'exception' };
        }
    },

    async runAllTests() {
        const results = {
            storage: false,
            aiServer: false,
            salesforce: { configured: false, status: 'not_configured', connected: false },
            background: false,
            ctmMonitor: false,
            ctmStatus: null,
            ctmReason: null
        };

        results.storage = await StorageService.testStorage();
        results.aiServer = await this.testAIServer();
        const sfResult = await this.testSalesforce();
        results.salesforce = sfResult;
        results.background = await this.testBackground();
        
        const ctmResult = await this.testCTM();
        results.ctmMonitor = ctmResult.connected;
        results.ctmStatus = ctmResult.status;
        results.ctmReason = ctmResult.reason || ctmResult.error || null;

        return results;
    },
    
    getCTMStatusText(status) {
        switch(status) {
            case 'monitoring': return 'Monitoring';
            case 'call_active': return 'Call Active';
            case 'recording': return 'Recording';
            case 'processing': return 'Processing';
            case 'idle': return 'Ready';
            case 'connected': return 'Connected';
            case 'opening': return 'Opening CTM...';
            case 'tab_open': return 'Tab open';
            case 'no_tab': return 'Open CTM tab';
            case 'no_response': return 'No response';
            case 'error': return 'Error';
            default: return 'Not connected';
        }
    },

    getSalesforceStatusText(result) {
        if (!result.configured) return 'Not configured';
        if (result.status === 'connected') return 'Connected';
        return 'Error';
    },
};

window.StatusService = StatusService;
