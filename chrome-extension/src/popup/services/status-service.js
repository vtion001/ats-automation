/**
 * Status Service - Tests all services and connections
 */

const StatusService = {
    async getAIServerUrl() {
        const result = await StorageService.get('aiServerUrl');
        const url = result.aiServerUrl || 'http://ags-ai-server.eastus.azurecontainer.io:8000';
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
            // Check if CTM tab is open
            const tabs = await new Promise(resolve => {
                chrome.tabs.query({ url: '*://*.calltrackingmetrics.com/*' }, resolve);
            });
            
            if (tabs.length === 0) {
                console.log('[StatusService] CTM: No tab open, creating...');
                // Open CTM tab automatically
                const newTab = await new Promise((resolve, reject) => {
                    chrome.tabs.create({ 
                        url: 'https://www.calltrackingmetrics.com',
                        active: false
                    }, (tab) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(tab);
                        }
                    });
                });
                console.log('[StatusService] CTM: Opening tab:', newTab.id);
                return { status: 'opening', connected: false, tabId: newTab.id };
            }
            
            // Tab exists, check if content script is loaded
            try {
                await new Promise((resolve, reject) => {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'PING' }, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(response);
                        }
                    });
                });
                console.log('[StatusService] CTM: Connected');
                return { status: 'connected', connected: true, tabId: tabs[0].id };
            } catch(e) {
                console.log('[StatusService] CTM: Tab open, content script not ready');
                return { status: 'tab_open', connected: false, tabId: tabs[0].id };
            }
        } catch(e) {
            console.log('[StatusService] CTM test error:', e.message);
            return { status: 'error', connected: false };
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
            case 'connected': return 'Connected';
            case 'opening': return 'Opening CTM...';
            case 'tab_open': return 'Tab open';
            case 'error': return 'Error';
            default: return 'Not connected';
        }
    },
};

window.StatusService = StatusService;
