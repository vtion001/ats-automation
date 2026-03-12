// ATS Automation - Background Service Worker

const ATS = {
    config: {},
    serverUrl: null,
    apiKey: null,

    init: function() {
        this.loadConfig();
        this.setupListeners();
        console.log('[ATS] Background worker initialized');
    },

    loadConfig: function() {
        chrome.storage.sync.get(['atsConfig'], (result) => {
            if (result.atsConfig) {
                this.config = result.atsConfig;
                this.serverUrl = result.atsConfig.serverUrl;
                this.apiKey = result.atsConfig.apiKey;
            }
        });
    },

    setupListeners: function() {
        // Listen for messages from content scripts
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true;
        });

        // Daily config sync
        chrome.alarms.create('configSync', { periodInMinutes: 60 });
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'configSync') {
                this.syncConfig();
            }
        });
    },

    handleMessage: function(message, sender, sendResponse) {
        console.log('[ATS] Received message:', message.action);

        switch (message.action) {
            case 'newCall':
                this.onNewCall(message.data);
                break;
            case 'lookupSF':
                this.lookupSF(message.data);
                break;
            case 'logEvent':
                this.logEvent(message.data);
                break;
        }
    },

    onNewCall: function(callData) {
        console.log('[ATS] New call:', callData);
        
        // Show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Incoming Call',
            message: `Phone: ${callData.phone}`
        });

        // If server is configured, sync call data
        if (this.serverUrl) {
            this.syncCallData(callData);
        }
    },

    lookupSF: function(data) {
        // Open Salesforce search in new tab
        const sfBaseUrl = this.config.sfBaseUrl || 'https://login.salesforce.com';
        const searchUrl = `${sfBaseUrl}/lightning/setup/FindRecords?term=${encodeURIComponent(data.phone)}`;
        chrome.tabs.create({ url: searchUrl });
    },

    syncCallData: async function(callData) {
        if (!this.serverUrl || !this.apiKey) return;

        try {
            const response = await fetch(`${this.serverUrl}/api/logs/call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(callData)
            });
            console.log('[ATS] Call data synced:', response.ok);
        } catch (e) {
            console.error('[ATS] Failed to sync call data:', e);
        }
    },

    syncConfig: async function() {
        if (!this.serverUrl || !this.apiKey) return;

        try {
            const response = await fetch(`${this.serverUrl}/api/config/sync`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            
            if (response.ok) {
                const config = await response.json();
                chrome.storage.sync.set({ atsConfig: config });
                console.log('[ATS] Config synced from server');
            }
        } catch (e) {
            console.error('[ATS] Failed to sync config:', e);
        }
    },

    logEvent: function(eventData) {
        // Store locally and optionally sync
        chrome.storage.local.get(['eventLogs'], (result) => {
            const logs = result.eventLogs || [];
            logs.push({
                ...eventData,
                timestamp: new Date().toISOString()
            });
            
            // Keep last 1000 events
            if (logs.length > 1000) {
                logs.splice(0, logs.length - 1000);
            }
            
            chrome.storage.local.set({ eventLogs: logs });
        });
    }
};

// Initialize when extension loads
ATS.init();
