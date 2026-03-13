/**
 * AGS Popup - Main extension popup (refactored)
 * This file only wires together the modules
 */

// UI Helper functions
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
    const services = ['storage', 'aiServer', 'salesforce', 'background', 'ctm'];
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

function updateStats() {
    StorageService.getStats().then(stats => {
        document.getElementById('callsCount').textContent = stats.calls || 0;
        document.getElementById('searchesCount').textContent = stats.searches || 0;
        document.getElementById('analysisCount').textContent = stats.analysis || 0;
    });
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Popup] Loading...');
    
    // Get elements
    const clientSelect = document.getElementById('clientSelect');
    const callMonitorToggle = document.getElementById('callMonitorToggle');
    const sfSyncToggle = document.getElementById('sfSyncToggle');
    const aiToggle = document.getElementById('aiToggle');
    const testBtn = document.getElementById('testBtn');
    const configBtn = document.getElementById('configBtn');
    const serverStatus = document.getElementById('serverStatus');
    
    // Load settings
    const config = await StorageService.getConfig();
    
    if (config.activeClient) clientSelect.value = config.activeClient;
    if (config.callMonitorEnabled !== undefined) callMonitorToggle.checked = config.callMonitorEnabled;
    if (config.sfSyncEnabled !== undefined) sfSyncToggle.checked = config.sfSyncEnabled;
    if (config.aiEnabled !== undefined) aiToggle.checked = config.aiEnabled;
    
    // Check server connection
    checkServerConnection();
    
    // Initialize service statuses
    updateServiceStatus('storage', true);
    updateServiceStatus('background', true);
    updateServiceStatus('ctm', true);
    
    // Initialize Notes and Qualification
    const currentClient = clientSelect?.value || 'flyland';
    await NotesManager.load(currentClient);
    await QualificationManager.loadKnowledgeBase(currentClient);
    
    // Event delegation for note actions
    const notesContainer = document.getElementById('notesContainer');
    if (notesContainer) {
        notesContainer.addEventListener('click', async (e) => {
            const btn = e.target.closest('.note-action-btn');
            if (!btn) return;
            
            const action = btn.dataset.action;
            const index = parseInt(btn.dataset.index);
            
            switch(action) {
                case 'edit': NotesManager.editNote(index); break;
                case 'delete': NotesManager.deleteNote(index); break;
                case 'save': NotesManager.saveEdit(index); break;
                case 'cancel': NotesManager.cancelEdit(index); break;
            }
        });
    }
    
    // Add note button
    const addNoteBtn = document.getElementById('addNoteBtn');
    const noteInput = document.getElementById('noteInput');
    
    if (addNoteBtn && noteInput) {
        addNoteBtn.addEventListener('click', async () => {
            const text = noteInput.value.trim();
            if (text) {
                await NotesManager.addNote(text, 'manual');
                noteInput.value = '';
            }
        });
    }
    
    // Client change
    if (clientSelect) {
        clientSelect.addEventListener('change', async (e) => {
            await StorageService.saveConfig({ activeClient: e.target.value });
            await NotesManager.load(e.target.value);
            await QualificationManager.loadKnowledgeBase(e.target.value);
        });
    }
    
    // Toggle event listeners
    if (callMonitorToggle) {
        callMonitorToggle.addEventListener('change', async (e) => {
            await StorageService.saveConfig({ callMonitorEnabled: e.target.checked });
            showStatus(e.target.checked ? 'Call monitoring enabled' : 'Call monitoring disabled', e.target.checked);
        });
    }
    
    if (sfSyncToggle) {
        sfSyncToggle.addEventListener('change', async (e) => {
            await StorageService.saveConfig({ sfSyncEnabled: e.target.checked });
            showStatus(e.target.checked ? 'Salesforce sync enabled' : 'Salesforce sync disabled', e.target.checked);
        });
    }
    
    if (aiToggle) {
        aiToggle.addEventListener('change', async (e) => {
            await StorageService.saveConfig({ aiEnabled: e.target.checked });
            showStatus(e.target.checked ? 'AI analysis enabled' : 'AI analysis disabled', e.target.checked);
        });
    }
    
    // Test button - uses StatusService
    testBtn.addEventListener('click', async () => {
        updateAllServiceStatus('checking');
        
        const results = await StatusService.runAllTests();
        
        updateServiceStatus('storage', results.storage);
        updateServiceStatus('aiServer', results.aiServer);
        updateServiceStatus('salesforce', results.salesforce);
        updateServiceStatus('background', results.background);
        updateServiceStatus('ctm', results.ctmMonitor);
        
        const allPassed = results.storage && results.aiServer && results.salesforce && results.background && results.ctmMonitor;
        
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
    
    // Config button
    configBtn.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('config/config.html'), '_blank');
    });
    
    // Check server connection
    async function checkServerConnection() {
        try {
            const serverUrl = await StatusService.getAIServerUrl();
            const response = await fetch(`${serverUrl}/health`, { 
                method: 'GET', 
                signal: AbortSignal.timeout(3000) 
            });
            if (response.ok) {
                updateMainStatus(true);
                updateServiceStatus('aiServer', true);
                serverStatus.textContent = serverUrl.replace('http://', '').replace('https://', '');
            } else {
                updateMainStatus(false);
                updateServiceStatus('aiServer', false);
                serverStatus.textContent = 'Connection failed';
            }
        } catch (error) {
            updateMainStatus(false);
            updateServiceStatus('aiServer', false);
            serverStatus.textContent = 'Not connected';
        }
    }
    
    console.log('[Popup] Ready');
});
