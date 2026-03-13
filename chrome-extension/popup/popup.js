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
    
    // Initialize OverlayUI for test analysis
    const overlayUI = new OverlayUI();
    
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
    
    // ====== Test Analysis Section ======
    const testNewLeadBtn = document.getElementById('testNewLeadBtn');
    const testExistingLeadBtn = document.getElementById('testExistingLeadBtn');
    const testInputArea = document.getElementById('testInputArea');
    const testStatus = document.getElementById('testStatus');
    const transcriptionInput = document.getElementById('transcriptionInput');
    const testPhoneInput = document.getElementById('testPhoneInput');
    const testClientSelect = document.getElementById('testClientSelect');
    const runAnalysisBtn = document.getElementById('runAnalysisBtn');
    
    let currentTestType = null;
    
    // Test New Lead button
    testNewLeadBtn.addEventListener('click', () => {
        currentTestType = 'new-lead';
        testInputArea.style.display = 'block';
        testStatus.style.display = 'none';
        
        // Pre-fill with mock transcription for testing
        transcriptionInput.value = `Hello, I'm calling because I'm looking for help. I've been struggling with addiction and I really need to get into a program. I have about 3 days clean now. I have Blue Cross insurance through my employer. I'm located in Florida. I want to know what options I have for treatment. My name is John Smith. I'm really ready to get help.`;
        testPhoneInput.value = '+15551234567';
        testClientSelect.value = 'flyland';
    });
    
    // Test Existing Lead button
    testExistingLeadBtn.addEventListener('click', () => {
        currentTestType = 'existing';
        testInputArea.style.display = 'block';
        testStatus.style.display = 'none';
        
        // Pre-fill with mock transcription for testing
        transcriptionInput.value = `Hi, this is Sarah Johnson. I've been a patient with you guys before. I completed the program last year. I'm calling because I need to schedule a follow-up appointment. I have some questions about my insurance coverage. Also, I've been feeling some cravings lately and I wanted to talk to someone. Can you help me?`;
        testPhoneInput.value = '+15559876543';
        testClientSelect.value = 'flyland';
    });
    
    // Run Analysis button
    runAnalysisBtn.addEventListener('click', async () => {
        const transcription = transcriptionInput.value.trim();
        const phone = testPhoneInput.value.trim();
        const client = testClientSelect.value;
        
        if (!transcription) {
            showTestStatus('Please enter or select a transcription', 'error');
            return;
        }
        
        showTestStatus('Running AI Analysis...', 'loading');
        
        try {
            // Get AI Server URL
            const config = await ATS.getConfig();
            const serverUrl = config.aiServerUrl || 'http://localhost:8000';
            
            // Send to AI server for analysis
            const response = await fetch(`${serverUrl}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcription: transcription,
                    phone: phone,
                    client: client
                })
            });
            
            if (!response.ok) {
                throw new Error(`AI Server error: ${response.status}`);
            }
            
            const analysis = await response.json();
            
            // Now get the action determination
            const actionResponse = await fetch(`${serverUrl}/api/determine-action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcription: transcription,
                    analysis: analysis,
                    phone: phone,
                    client: client
                })
            });
            
            const action = await actionResponse.json();
            
            // Combine results
            const fullResult = {
                ...analysis,
                ...action,
                phone: phone,
                callerName: analysis.caller_name || null,
                testType: currentTestType
            };
            
            showTestStatus('Analysis complete!', 'success');
            
            // Send to overlay to display results
            if (window.overlayUI) {
                // Build caller info display data
                const callerInfoDisplay = [];
                
                if (phone) {
                    callerInfoDisplay.push({
                        label: 'Phone',
                        value: phone,
                        confidence: 1.0,
                        source: 'ctm',
                        isHighConfidence: true
                    });
                }
                
                if (analysis.detected_state) {
                    callerInfoDisplay.push({
                        label: 'State',
                        value: analysis.detected_state,
                        confidence: analysis.state_confidence || 0.7,
                        source: 'ai',
                        isHighConfidence: (analysis.state_confidence || 0.7) >= 0.8
                    });
                }
                
                if (analysis.detected_insurance) {
                    callerInfoDisplay.push({
                        label: 'Insurance',
                        value: analysis.detected_insurance,
                        confidence: analysis.insurance_confidence || 0.6,
                        source: 'ai',
                        isHighConfidence: (analysis.insurance_confidence || 0.6) >= 0.7
                    });
                }
                
                if (analysis.detected_sober_days) {
                    callerInfoDisplay.push({
                        label: 'Sober',
                        value: `${analysis.detected_sober_days} days`,
                        confidence: analysis.sober_confidence || 0.7,
                        source: 'ai',
                        isHighConfidence: (analysis.sober_confidence || 0.7) >= 0.7
                    });
                }
                
                window.overlayUI.showCallerInfo(callerInfoDisplay, {
                    qualificationScore: analysis.qualification_score || 0,
                    recommended_department: action.transfer_department || analysis.recommended_department,
                    action: action.action,
                    callNotes: action.call_notes
                }, phone);
            }
            
        } catch (error) {
            console.error('Test analysis error:', error);
            showTestStatus('Error: ' + error.message, 'error');
        }
    });
    
    function showTestStatus(message, status) {
        testStatus.style.display = 'block';
        testStatus.className = 'test-status ' + status;
        testStatus.querySelector('.test-status-text')?.remove();
        
        const span = document.createElement('span');
        span.className = 'test-status-text';
        span.textContent = message;
        testStatus.appendChild(span);
    }
    
    // Make overlayUI globally accessible
    window.overlayUI = overlayUI;
    
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
