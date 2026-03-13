/**
 * AGS Popup - Main extension popup
 */

// ====== ATS FALLBACK - MUST BE FIRST ======
(function() {
    'use strict';
    
    // Create ATS object with ALL required methods
    window.ATS = {
        config: { 
            debug: true, 
            apiUrl: 'http://localhost:8000', 
            storageKey: 'ats_config' 
        },
        
        init: async function() {
            console.log('[AGS] Initializing...');
            try {
                const stored = await new Promise(resolve => {
                    chrome.storage.local.get(this.config.storageKey, resolve);
                });
                if (stored[this.config.storageKey]) {
                    Object.assign(this.config, stored[this.config.storageKey]);
                }
            } catch(e) {
                console.error('[AGS] Init error:', e);
            }
            return this;
        },
        
        getConfig: async function() {
            return new Promise(resolve => {
                chrome.storage.local.get(this.config.storageKey, result => {
                    resolve(result[this.config.storageKey] || {});
                });
            });
        },
        
        saveConfig: async function(config) {
            return new Promise(resolve => {
                chrome.storage.local.set({ [this.config.storageKey]: config }, () => {
                    resolve(true);
                });
            });
        },
        
        log: function(msg, data) {
            if (this.config.debug) {
                console.log('[AGS]', msg, data || '');
            }
        },
        
        error: function(msg, data) {
            console.error('[AGS ERROR]', msg, data || '');
        }
    };
    
    console.log('[AGS] ATS object created');
})();
// =========================================

// Helper functions
async function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['ats_config', 'ats_stats'], (result) => {
            const config = result.ats_config || {};
            const stats = result.ats_stats || { calls: 0, searches: 0, analysis: 0 };
            
            const els = ['callsCount', 'searchesCount', 'analysisCount'];
            const vals = [stats.calls || 0, stats.searches || 0, stats.analysis || 0];
            els.forEach((id, i) => {
                const el = document.getElementById(id);
                if (el) el.textContent = vals[i];
            });
            
            resolve(config);
        });
    });
}

async function saveSettings(updates) {
    return new Promise((resolve) => {
        chrome.storage.local.get('ats_config', (result) => {
            const config = result.ats_config || {};
            Object.assign(config, updates);
            chrome.storage.local.set({ ats_config: config }, resolve);
        });
    });
}

function showStatus(message, success) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    if (!statusDot || !statusText) return;
    
    const originalText = statusText.textContent;
    const originalClass = statusText.className;
    
    statusText.textContent = message;
    
    if (success === true) {
        statusText.classList.add('active');
        statusDot.classList.remove('inactive');
    } else if (success === false) {
        statusText.classList.remove('active');
    }
    
    setTimeout(() => {
        statusText.textContent = originalText;
        statusText.className = originalClass;
    }, 3000);
}

function getClientName(clientId) {
    const names = {
        'flyland': 'Flyland Recovery',
        'legacy': 'Legacy Services',
        'tbt': 'TBT Communications',
        'banyan': 'Banyan Health',
        'takami': 'Takahami Medical',
        'element': 'Element Medical'
    };
    return names[clientId] || clientId;
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[AGS] Popup loading...');
    
    // Initialize ATS first
    try {
        await window.ATS.init();
        console.log('[AGS] ATS initialized');
    } catch(e) {
        console.error('[AGS] ATS init failed:', e);
    }
    
    // Get elements
    const clientSelect = document.getElementById('clientSelect');
    const callMonitorToggle = document.getElementById('callMonitorToggle');
    const sfSyncToggle = document.getElementById('sfSyncToggle');
    const aiToggle = document.getElementById('aiToggle');
    const testBtn = document.getElementById('testBtn');
    const configBtn = document.getElementById('configBtn');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const serverStatus = document.getElementById('serverStatus');

    // Load settings
    const config = await loadSettings();
    
    if (config.activeClient) clientSelect.value = config.activeClient;
    if (config.callMonitorEnabled !== undefined) callMonitorToggle.checked = config.callMonitorEnabled;
    if (config.sfSyncEnabled !== undefined) sfSyncToggle.checked = config.sfSyncEnabled;
    if (config.aiEnabled !== undefined) aiToggle.checked = config.aiEnabled;

    // Check server
    checkServerConnection();
    
    // Initialize service statuses
    updateServiceStatus('storage', true);
    updateServiceStatus('background', true);
    updateServiceStatus('ctm', true);

    // Event listeners
    clientSelect.addEventListener('change', async (e) => {
        await saveSettings({ activeClient: e.target.value });
        showStatus('Switched to ' + getClientName(e.target.value), true);
        chrome.runtime.sendMessage({ action: 'CLIENT_CHANGED', client: e.target.value });
    });

    callMonitorToggle.addEventListener('change', async (e) => {
        await saveSettings({ callMonitorEnabled: e.target.checked });
        showStatus(e.target.checked ? 'Call monitoring enabled' : 'Call monitoring disabled', e.target.checked);
    });

    sfSyncToggle.addEventListener('change', async (e) => {
        await saveSettings({ sfSyncEnabled: e.target.checked });
        showStatus(e.target.checked ? 'Salesforce sync enabled' : 'Salesforce sync disabled', e.target.checked);
    });

    aiToggle.addEventListener('change', async (e) => {
        await saveSettings({ aiEnabled: e.target.checked });
        showStatus(e.target.checked ? 'AI analysis enabled' : 'AI analysis disabled', e.target.checked);
    });

    testBtn.addEventListener('click', async () => {
        updateAllServiceStatus('checking');
        
        const results = {
            storage: false,
            aiServer: false,
            background: false,
            ctmMonitor: true
        };
        
        try {
            const storageResult = await testStorage();
            results.storage = storageResult;
            updateServiceStatus('storage', storageResult);
        } catch(e) { 
            results.storage = false;
            updateServiceStatus('storage', false);
        }
        
        try {
            const aiResult = await testAIServer();
            results.aiServer = aiResult;
            updateServiceStatus('aiServer', aiResult);
        } catch(e) { 
            results.aiServer = false;
            updateServiceStatus('aiServer', false);
        }
        
        try {
            const bgResult = await testBackground();
            results.background = bgResult;
            updateServiceStatus('background', bgResult);
        } catch(e) { 
            results.background = false;
            updateServiceStatus('background', false);
        }
        
        try {
            const configResult = await testConfig();
            results.config = configResult;
        } catch(e) { results.config = false; }
        
        updateServiceStatus('ctm', results.ctmMonitor);
        
        const allPassed = results.storage && results.aiServer && results.background;
        
        if (allPassed) {
            showStatus('All services online!', true);
            updateMainStatus(true);
        } else {
            const failed = Object.entries(results).filter(([k,v]) => !v).map(([k]) => k).join(', ');
            showStatus('Issues: ' + failed, false);
            updateMainStatus(false);
        }
        
        updateStats();
    });
    
    function updateServiceStatus(service, isOnline) {
        const statusEl = document.getElementById(service + 'Status');
        if (!statusEl) return;
        
        const indicator = statusEl.querySelector('.status-indicator');
        statusEl.classList.remove('online', 'offline', 'checking');
        indicator.classList.remove('online', 'offline', 'checking');
        
        if (isOnline) {
            statusEl.classList.add('online');
            indicator.classList.add('online');
        } else {
            statusEl.classList.add('offline');
            indicator.classList.add('offline');
        }
    }
    
    function updateAllServiceStatus(status) {
        const services = ['storage', 'aiServer', 'background', 'ctm'];
        services.forEach(service => {
            const statusEl = document.getElementById(service + 'Status');
            if (!statusEl) return;
            
            const indicator = statusEl.querySelector('.status-indicator');
            statusEl.classList.remove('online', 'offline', 'checking');
            indicator.classList.remove('online', 'offline', 'checking');
            statusEl.classList.add(status);
            indicator.classList.add(status);
        });
    }
    
    function updateMainStatus(isOnline) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        if (!statusDot || !statusText) return;
        
        if (isOnline) {
            statusDot.classList.remove('inactive');
            statusText.classList.add('active');
            statusText.textContent = 'Ready';
        } else {
            statusDot.classList.add('inactive');
            statusText.classList.remove('active');
            statusText.textContent = 'Issues Detected';
        }
    }
    
    async function testAIServer() {
        try {
            const response = await fetch('http://localhost:8000/health', { 
                method: 'GET', 
                signal: AbortSignal.timeout(5000) 
            });
            return response.ok;
        } catch(e) {
            return false;
        }
    }
    
    async function testBackground() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'PING' }, (response) => {
                resolve(response && response.pong === true);
            });
        });
    }
    
    async function testConfig() {
        return new Promise((resolve) => {
            chrome.storage.local.get('ats_config', (result) => {
                resolve(true);
            });
        });
    }

    configBtn.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('config/config.html'), '_blank');
    });

    async function checkServerConnection() {
        try {
            const response = await fetch('http://localhost:8000/health', { 
                method: 'GET', 
                signal: AbortSignal.timeout(3000) 
            });
            if (response.ok) {
                updateMainStatus(true);
                updateServiceStatus('aiServer', true);
                serverStatus.textContent = 'localhost:8000';
            } else {
                updateMainStatus(false);
                updateServiceStatus('aiServer', false);
            }
        } catch (error) {
            updateMainStatus(false);
            updateServiceStatus('aiServer', false);
        }
    }

    function updateStats() {
        chrome.storage.local.get('ats_stats', (result) => {
            const stats = result.ats_stats || { calls: 0, searches: 0, analysis: 0 };
            document.getElementById('callsCount').textContent = stats.calls || 0;
            document.getElementById('searchesCount').textContent = stats.searches || 0;
            document.getElementById('analysisCount').textContent = stats.analysis || 0;
        });
    }
    
    console.log('[AGS] Popup ready');
});

async function testStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.set({ '__test_key': 'test_value' }, () => {
            chrome.storage.local.get('__test_key', (result) => {
                chrome.storage.local.remove('__test_key', () => {
                    resolve(result['__test_key'] === 'test_value');
                });
            });
        });
    });
}

async function testAIServer() {
    try {
        const response = await fetch('http://localhost:8000/health', { 
            method: 'GET', 
            signal: AbortSignal.timeout(5000) 
        });
        return response.ok;
    } catch(e) {
        return false;
    }
}

async function testBackground() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'PING' }, (response) => {
            resolve(response && response.pong === true);
        });
    });
}

async function testConfig() {
    return new Promise((resolve) => {
        chrome.storage.local.get('ats_config', (result) => {
            resolve(true);
        });
    });
}

    configBtn.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('config/config.html'), '_blank');
    });

    async function checkServerConnection() {
        try {
            const response = await fetch('http://localhost:8000/health', { 
                method: 'GET', 
                signal: AbortSignal.timeout(3000) 
            });
            if (response.ok) {
                updateMainStatus(true);
                updateServiceStatus('aiServer', true);
                serverStatus.textContent = 'localhost:8000';
            } else {
                updateMainStatus(false);
                updateServiceStatus('aiServer', false);
            }
        } catch (error) {
            updateMainStatus(false);
            updateServiceStatus('aiServer', false);
        }
    }

    function setOfflineStatus() {
        statusDot.classList.add('inactive');
        statusText.classList.remove('active');
        statusText.textContent = 'Server Offline';
        serverStatus.textContent = 'Not connected';
    }

    function updateStats() {
        chrome.storage.local.get('ats_stats', (result) => {
            const stats = result.ats_stats || { calls: 0, searches: 0, analysis: 0 };
            document.getElementById('callsCount').textContent = stats.calls || 0;
            document.getElementById('searchesCount').textContent = stats.searches || 0;
            document.getElementById('analysisCount').textContent = stats.analysis || 0;
        });
    }
