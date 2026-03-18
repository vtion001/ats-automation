/**
 * AGS Popup - Main Extension Popup
 * Thin orchestrator that wires together modular components
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Popup] Initializing...');
    
    // Initialize components
    const toastManager = new ToastManager();
    toastManager.init();
    window.ToastManager = toastManager;
    window.ToastManagerInstance = toastManager;
    
    const statusManager = new StatusManager();
    const qualificationDisplay = new QualificationDisplay();
    qualificationDisplay.init();
    window.qualificationDisplay = qualificationDisplay;
    
    const testPanel = new TestPanel();
    const overlayUI = new OverlayUI();
    testPanel.setOverlayUI(overlayUI);
    
    // Initialize modules
    await StorageService.init();
    await initCollapsibleSections();
    await loadSettings();
    await initNotesAndQualification();
    
    // Check if first time load
    const isFirstLoad = await checkFirstLoad();
    
    // Show initializing state only on first load
    if (isFirstLoad) {
        statusManager.showStatus('Initializing...', null);
        statusManager.setAllInitializing();
    }
    
    // Initialize services and start auto-refresh
    await runAllServiceChecks(statusManager, !isFirstLoad);
    startServiceAutoRefresh(statusManager);
    
    // Start recording state monitoring (for background recording indicator)
    startRecordingMonitor(statusManager);
    
    // Listen for analysis results from service worker (background processing)
    listenForAnalysisResults(testPanel);
    
    // Bind all events
    bindClientEvents();
    bindToggleEvents(statusManager);
    bindPinButton();
    bindTestButtons(testPanel);
    bindConfigButton();
    bindDebugButton();
    
    // Expose globals
    window.overlayUI = overlayUI;
    window.StatusService = StatusService;
    window.NotesManager = NotesManager;
    window.QualificationManager = QualificationManager;
    window.StatusManager = statusManager;
    
    console.log('[Popup] Ready');
});

// ============ Helper Functions ============

async function initCollapsibleSections() {
    try {
        document.querySelectorAll('.section.collapsible .section-header').forEach(header => {
            header.addEventListener('click', function() {
                const section = this.closest('.collapsible');
                section.classList.toggle('collapsed');
                const sectionId = section.id;
                if (sectionId) {
                    StorageService.set({ ['collapsed_' + sectionId]: section.classList.contains('collapsed') });
                }
            });
        });
        
        const collapsedSections = document.querySelectorAll('.section.collapsible');
        const collapsedKeys = {};
        collapsedSections.forEach(s => collapsedKeys['collapsed_' + s.id] = null);
        
        const collapsedStates = await StorageService.get(collapsedKeys);
        Object.entries(collapsedStates).forEach(([key, value]) => {
            if (value === true) {
                const sectionId = key.replace('collapsed_', '');
                document.getElementById(sectionId)?.classList.add('collapsed');
            }
        });
    } catch(e) { console.error('[Popup] Collapsible error:', e); }
}

async function loadSettings() {
    try {
        const config = await StorageService.getConfig();
        const setIf = (el, val) => { if (el) el.value = val; };
        const setCheck = (el, val) => { if (el) el.checked = val; };
        
        setIf(ge('clientSelect'), config.activeClient);
        setCheck(ge('callMonitorToggle'), config.callMonitorEnabled);
        setCheck(ge('autoAnalyzeToggle'), config.autoAnalyzeEnabled);
        setCheck(ge('sfSyncToggle'), config.sfSyncEnabled);
        setCheck(ge('aiToggle'), config.aiEnabled);
    } catch(e) { console.error('[Popup] Load settings error:', e); }
}

async function initNotesAndQualification() {
    try {
        const client = ge('clientSelect')?.value || 'flyland';
        await NotesManager.load(client);
        await QualificationManager.loadKnowledgeBase(client);
    } catch(e) { console.error('[Popup] Notes init error:', e); }
}

async function checkServerConnection(statusManager) {
    try {
        const serverUrl = await StatusService.getAIServerUrl();
        const response = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(3000) });
        
        if (response.ok) {
            statusManager.updateMainStatus(true);
            statusManager.updateServiceStatus('aiServer', true);
            const el = ge('serverStatus');
            if (el) el.textContent = serverUrl.replace(/^https?:\/\//, '');
        } else {
            statusManager.updateMainStatus(false);
            statusManager.updateServiceStatus('aiServer', false);
        }
    } catch {
        statusManager.updateMainStatus(false);
        statusManager.updateServiceStatus('aiServer', false);
    }
}

async function runAllServiceChecks(statusManager, skipStatus = false) {
    try {
        if (!skipStatus) {
            statusManager.showStatus('Checking services...', null);
        }
        
        const results = await StatusService.runAllTests();
        
        // Update each service status
        const services = ['storage', 'aiServer', 'salesforce', 'background', 'ctm'];
        services.forEach(s => {
            if (s === 'ctm') {
                const isOnline = results.ctmMonitor;
                const label = StatusService.getCTMStatusText(results.ctmStatus);
                statusManager.updateServiceStatus(s, isOnline, label);
            } else if (s === 'salesforce') {
                const sfResult = results.salesforce;
                const isOnline = sfResult.connected;
                const label = StatusService.getSalesforceStatusText(sfResult);
                statusManager.updateServiceStatus(s, isOnline, label);
            } else {
                statusManager.updateServiceStatus(s, results[s]);
            }
        });
        
        // Core services that must pass for main status to be "Ready"
        const coreServices = ['storage', 'aiServer', 'background'];
        const corePassed = coreServices.every(s => results[s]);
        statusManager.updateMainStatus(corePassed);
        
        if (!skipStatus) {
            statusManager.showStatus(corePassed ? 'Ready' : 'Issues detected', corePassed);
        }
        
    } catch(e) {
        console.error('[Popup] Service check error:', e);
        if (!skipStatus) {
            statusManager.showStatus('Error checking services', false);
        }
    }
}

async function checkFirstLoad() {
    try {
        const result = await StorageService.get('popupInitialized');
        if (result.popupInitialized) {
            return false;
        }
        // Mark as initialized
        await StorageService.set({ popupInitialized: true });
        return true;
    } catch(e) {
        return true; // First load if error
    }
}

let autoRefreshInterval = null;

function startServiceAutoRefresh(statusManager) {
    // Run immediately (skip status since we're already initialized)
    runAllServiceChecks(statusManager, true);
    
    // Then refresh every 30 seconds
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        runAllServiceChecks(statusManager, true);
    }, 30000);
    
    console.log('[Popup] Auto-refresh started (30s)');
}

// Shortcut for getElementById
function ge(id) { return document.getElementById(id); }

// ============ Event Binding ============

function bindClientEvents() {
    // Client change
    ge('clientSelect')?.addEventListener('change', async (e) => {
        await StorageService.saveConfig({ activeClient: e.target.value });
        await NotesManager.load(e.target.value);
        await QualificationManager.loadKnowledgeBase(e.target.value);
    });
    
    // Note actions
    ge('notesContainer')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.note-action-btn');
        if (!btn) return;
        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index);
        const actions = { edit: 'editNote', delete: 'deleteNote', save: 'saveEdit', cancel: 'cancelEdit' };
        NotesManager[actions[action]]?.(index);
    });
    
    // Add note
    ge('addNoteBtn')?.addEventListener('click', addNote);
    ge('noteInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); }
        if (e.key === 'Escape') e.target.blur();
    });
}

function addNote() {
    const input = ge('noteInput');
    if (input?.value.trim()) {
        NotesManager.addNote(input.value.trim(), 'manual');
        input.value = '';
        window.ToastManager.success('Note added');
    }
}

function bindToggleEvents(statusManager) {
    const toggles = [
        { id: 'callMonitorToggle', key: 'callMonitorEnabled', msg: (v) => v ? 'Call monitoring enabled' : 'Call monitoring disabled' },
        { id: 'autoAnalyzeToggle', key: 'autoAnalyzeEnabled', msg: (v) => v ? 'Auto-analyze enabled' : 'Auto-analyze disabled' },
        { id: 'sfSyncToggle', key: 'sfSyncEnabled', msg: (v) => v ? 'Salesforce sync enabled' : 'Salesforce sync disabled' },
        { id: 'aiToggle', key: 'aiEnabled', msg: (v) => v ? 'AI analysis enabled' : 'AI analysis disabled' }
    ];
    
    toggles.forEach(({ id, key, msg }) => {
        ge(id)?.addEventListener('change', async (e) => {
            await StorageService.saveConfig({ [key]: e.target.checked });
            statusManager.showStatus(msg(e.target.checked), e.target.checked);
        });
    });
}

function bindPinButton() {
    const btn = ge('pinBtn');
    if (!btn) return;
    
    btn.addEventListener('click', async () => {
        const isPinned = btn.classList.contains('pinned');
        
        if (isPinned) {
            btn.classList.remove('pinned');
            await StorageService.set({ popupFloatEnabled: false });
            window.ToastManager.success('Floating mode disabled');
        } else {
            btn.classList.add('pinned');
            await StorageService.set({ popupFloatEnabled: true });
            
            chrome.windows.create({
                url: chrome.runtime.getURL('popup/popup.html'),
                type: 'popup',
                width: 400,
                height: 700,
                focused: true
            }).then(() => window.ToastManager.success('Floating window opened'))
              .catch(err => { console.error(err); window.ToastManager.error('Failed to open window'); });
        }
    });
    
    StorageService.get('popupFloatEnabled').then(r => { if (r.popupFloatEnabled) btn.classList.add('pinned'); });
}

function bindTestButtons(testPanel) {
    // Test all services
    ge('testBtn')?.addEventListener('click', async () => {
        window.StatusManager.updateAllServiceStatus('checking');
        window.ToastManager.info('Testing all services...');
        
        try {
            const results = await StatusService.runAllTests();
            
            // Update each service status
            const services = ['storage', 'aiServer', 'salesforce', 'background', 'ctm'];
            services.forEach(s => {
                if (s === 'ctm') {
                    const label = StatusService.getCTMStatusText(results.ctmStatus);
                    window.StatusManager.updateServiceStatus(s, results.ctmMonitor, label);
                } else if (s === 'salesforce') {
                    const sfResult = results.salesforce;
                    const label = StatusService.getSalesforceStatusText(sfResult);
                    window.StatusManager.updateServiceStatus(s, sfResult.connected, label);
                } else {
                    window.StatusManager.updateServiceStatus(s, results[s]);
                }
            });
            
            // Core services that must pass: storage, aiServer, background
            const coreServices = ['storage', 'aiServer', 'background'];
            const corePassed = coreServices.every(s => results[s]);
            window.StatusManager.showStatus(corePassed ? 'Core services online!' : 'Core issues detected', corePassed);
            window.StatusManager.updateMainStatus(corePassed);
            window.StatusManager.updateStats();
        } catch(e) { window.ToastManager.error('Test failed: ' + e.message); }
    });
    
    // Test New Lead
    ge('testNewLeadBtn')?.addEventListener('click', () => testPanel.handleNewLeadClick());
    
    // Test Existing Lead
    ge('testExistingLeadBtn')?.addEventListener('click', () => testPanel.handleExistingLeadClick());
    
    // Run Analysis
    ge('runAnalysisBtn')?.addEventListener('click', () => testPanel.runAnalysis());
    
    // Hide quick test
    if (ge('quickTestBtn')) ge('quickTestBtn').style.display = 'none';
}

function bindConfigButton() {
    ge('configBtn')?.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('config/config.html'), '_blank');
    });
    
    // Tab capture button - opens tab selector
    ge('tabCaptureBtn')?.addEventListener('click', async () => {
        // Open tab selector in new window
        window.open(chrome.runtime.getURL('popup/tab-selector.html'), '_blank', 'width=450,height=600');
    });
}

// Debug button to test overlay
function bindDebugButton() {
    const debugBtn = document.getElementById('debugOverlayBtn');
    if (debugBtn) {
        debugBtn.addEventListener('click', function() {
            if (window.overlayUI) {
                window.overlayUI.showCallAnalysis({
                    phone: '+15551234567',
                    caller_id: '+15551234567',
                    callerName: 'Test Caller',
                    tags: ['hot_lead', 'treatment'],
                    sentiment: 'positive',
                    qualificationScore: 85,
                    summary: 'Test call - caller interested in addiction treatment services.',
                    suggestedDisposition: 'Qualified',
                    followUpRequired: true,
                    recommendedDepartment: 'intake',
                    testType: 'debug',
                    isLiveCall: true
                });
            }
        });
    }
}

// ============ Recording Monitor ============

let recordingMonitorInterval = null;

async function checkRecordingState(statusManager) {
    try {
        // Check service worker recording state (with timeout for cold SW)
        const response = await new Promise(resolve => {
            const timeout = setTimeout(() => resolve(null), 3000);
            chrome.runtime.sendMessage({ type: 'GET_CAPTURE_STATUS' }, (r) => {
                clearTimeout(timeout);
                resolve(r);
            });
        });
        
        if (response && response.recording) {
            statusManager.updateServiceStatus('recording', true, 'Recording');
            return;
        }
        
        // Also check storage state
        const stateResult = await new Promise(resolve => {
            chrome.storage.local.get('ats_recording_state', resolve);
        });
        
        if (stateResult?.ats_recording_state?.recording) {
            statusManager.updateServiceStatus('recording', true, 'Recording');
            return;
        }
        
        // Check if analysis result is waiting
        const analysisResult = await new Promise(resolve => {
            const timeout = setTimeout(() => resolve(null), 3000);
            chrome.runtime.sendMessage({ type: 'GET_ANALYSIS_RESULT' }, (r) => {
                clearTimeout(timeout);
                resolve(r);
            });
        });
        
        if (analysisResult?.result) {
            statusManager.updateServiceStatus('recording', true, 'Processing');
            return;
        }
        
        // No recording active
        statusManager.updateServiceStatus('recording', false);
        
    } catch (e) {
        console.log('[Popup] Recording check error:', e);
    }
}

function startRecordingMonitor(statusManager) {
    checkRecordingState(statusManager);
    
    if (recordingMonitorInterval) clearInterval(recordingMonitorInterval);
    recordingMonitorInterval = setInterval(() => {
        checkRecordingState(statusManager);
    }, 2000);
    
    console.log('[Popup] Recording monitor started');
}

function listenForAnalysisResults(testPanel) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'ANALYSIS_READY' && message.result) {
            console.log('[Popup] Analysis ready from background:', message.result);
            
            // Check if there's an existing analysis result
            chrome.runtime.sendMessage({ type: 'GET_ANALYSIS_RESULT' }, (response) => {
                if (response?.result) {
                    window.ToastManager?.success('Call Analysis Ready!');
                    
                    // Show the test panel with the result
                    const qualResult = document.getElementById('qualResult');
                    if (qualResult) {
                        testPanel.displayAnalysisResult(response.result);
                    }
                    
                    // Clear the result after showing
                    setTimeout(() => {
                        chrome.runtime.sendMessage({ type: 'CLEAR_ANALYSIS_RESULT' });
                    }, 5000);
                }
            });
        }
        return false;
    });
}
