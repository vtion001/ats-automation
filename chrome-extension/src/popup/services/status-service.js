/**
 * Status Service - Tests all services and connections
 */

const StatusService = {
    async getAIServerUrl() {
        const result = await StorageService.get('aiServerUrl');
        return result.aiServerUrl || 'http://localhost:8000';
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
            const result = await StorageService.get('ctmSelectors');
            return !!result.ctmSelectors;
        } catch(e) {
            return false;
        }
    },

    async runAllTests() {
        const results = {
            storage: false,
            aiServer: false,
            salesforce: false,
            background: false,
            ctmMonitor: false
        };

        results.storage = await StorageService.testStorage();
        results.aiServer = await this.testAIServer();
        results.salesforce = await this.testSalesforce();
        results.background = await this.testBackground();
        results.ctmMonitor = await this.testCTM();

        return results;
    }
};

window.StatusService = StatusService;
