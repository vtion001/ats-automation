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
                return false;
            }
            const response = await fetch(`${sfUrl}/services/data/`, { 
                method: 'GET', 
                signal: AbortSignal.timeout(5000),
                credentials: 'include'
            });
            return response.ok || response.status === 401;
        } catch(e) {
            console.log('[StatusService] Salesforce test failed:', e.message);
            return false;
        }
    },

    async testBackground() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'PING' }, (response) => {
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
                return { status: 'no_tab', connected: false, tabId: null };
            }

            const tabId = tabs[0].id;

            const result = await new Promise(resolve => {
                chrome.tabs.sendMessage(tabId, { type: 'GET_CTM_MONITOR_STATE' }, (response) => {
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
                    state: result.state
                };
            }

            return { status: 'no_response', connected: false, tabId: tabId };

        } catch(e) {
            console.log('[StatusService] CTM test error:', e.message);
            return { status: 'error', connected: false, error: e.message };
        }
    },

    async runAllTests() {
        const results = {
            storage: false,
            aiServer: false,
            salesforce: false,
            background: false,
            ctmMonitor: false,
            ctmStatus: null
        };

        results.storage = await StorageService.testStorage();
        results.aiServer = await this.testAIServer();
        results.salesforce = await this.testSalesforce();
        results.background = await this.testBackground();
        
        const ctmResult = await this.testCTM();
        results.ctmMonitor = ctmResult.connected;
        results.ctmStatus = ctmResult.status;

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
            case 'no_tab': return 'No CTM tab';
            case 'no_response': return 'No response';
            case 'error': return 'Error';
            default: return 'Not connected';
        }
    },
};

window.StatusService = StatusService;
