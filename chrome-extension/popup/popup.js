/**
 * AGS Popup - Main extension popup (refactored)
 * This file only wires together the modules
 */

// UI Helper functions

// Toast Notification System
const ToastManager = {
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    show(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
            error: '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
            warning: '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
            info: '<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        };
        
        toast.innerHTML = `
            ${icons[type] || icons.info}
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;
        
        container.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 250);
        }, duration);
    },
    
    success(message) { this.show(message, 'success'); },
    error(message) { this.show(message, 'error'); },
    warning(message) { this.show(message, 'warning'); },
    info(message) { this.show(message, 'info'); }
};

function showStatus(message, success) {
    // Also show toast notification for better UX
    if (success === true) {
        ToastManager.success(message);
    } else if (success === false) {
        ToastManager.error(message);
    } else {
        ToastManager.info(message);
    }
    
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
        const callsEl = document.getElementById('callsCount');
        const searchesEl = document.getElementById('searchesCount');
        const analysisEl = document.getElementById('analysisCount');
        
        if (callsEl) callsEl.textContent = stats.calls || 0;
        if (searchesEl) searchesEl.textContent = stats.searches || 0;
        if (analysisEl) analysisEl.textContent = stats.analysis || 0;
    });
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Popup] Loading...');
    
    try {
        // Initialize storage with defaults if empty
        await StorageService.init();
        
        // Initialize collapsible sections
        document.querySelectorAll('.section.collapsible .section-header').forEach(header => {
            header.addEventListener('click', function() {
                const section = this.closest('.collapsible');
                section.classList.toggle('collapsed');
                
                // Save state to storage
                const sectionId = section.id;
                if (sectionId) {
                    StorageService.set({ ['collapsed_' + sectionId]: section.classList.contains('collapsed') });
                }
            });
        });
        
        // Restore collapsed states from storage
        const collapsibleSections = document.querySelectorAll('.section.collapsible');
        const collapsedKeys = {};
        collapsibleSections.forEach(s => {
            collapsedKeys['collapsed_' + s.id] = null;
        });
        const collapsedStates = await StorageService.get(collapsedKeys);
        Object.entries(collapsedStates).forEach(([key, value]) => {
            if (value === true) {
                const sectionId = key.replace('collapsed_', '');
                const section = document.getElementById(sectionId);
                if (section) {
                    section.classList.add('collapsed');
                }
            }
        });
    } catch(e) {
        console.error('[Popup] Error initializing collapsible sections:', e);
    }
    
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
    try {
        const config = await StorageService.getConfig();
        
        if (config.activeClient && clientSelect) clientSelect.value = config.activeClient;
        if (config.callMonitorEnabled !== undefined && callMonitorToggle) callMonitorToggle.checked = config.callMonitorEnabled;
        if (config.autoAnalyzeEnabled !== undefined && autoAnalyzeToggle) autoAnalyzeToggle.checked = config.autoAnalyzeEnabled;
        if (config.sfSyncEnabled !== undefined && sfSyncToggle) sfSyncToggle.checked = config.sfSyncEnabled;
        if (config.aiEnabled !== undefined && aiToggle) aiToggle.checked = config.aiEnabled;
    } catch(e) {
        console.error('[Popup] Error loading config:', e);
    }
    
    // Check server connection
    checkServerConnection();
    
    // Initialize service statuses
    updateServiceStatus('storage', true);
    updateServiceStatus('background', true);
    updateServiceStatus('ctm', true);
    
    // Initialize Notes and Qualification
    try {
        const currentClient = clientSelect?.value || 'flyland';
        await NotesManager.load(currentClient);
        await QualificationManager.loadKnowledgeBase(currentClient);
    } catch(e) {
        console.error('[Popup] Error loading notes/qualification:', e);
    }
    
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
                ToastManager.success('Note added');
            }
        });
        
        // Keyboard shortcut: Enter to add note (Shift+Enter for new line)
        noteInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = noteInput.value.trim();
                if (text) {
                    await NotesManager.addNote(text, 'manual');
                    noteInput.value = '';
                    ToastManager.success('Note added');
                }
            }
            if (e.key === 'Escape') {
                noteInput.blur();
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
    
    // Auto-Analyze toggle
    const autoAnalyzeToggle = document.getElementById('autoAnalyzeToggle');
    if (autoAnalyzeToggle) {
        autoAnalyzeToggle.addEventListener('change', async (e) => {
            await StorageService.saveConfig({ autoAnalyzeEnabled: e.target.checked });
            showStatus(e.target.checked ? 'Auto-analyze enabled - calls will be analyzed automatically' : 'Auto-analyze disabled', e.target.checked);
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
    
    // Pin/Float button - opens popup as standalone window
    const pinBtn = document.getElementById('pinBtn');
    if (pinBtn) {
        pinBtn.addEventListener('click', async () => {
            const isPinned = pinBtn.classList.contains('pinned');
            
            if (isPinned) {
                pinBtn.classList.remove('pinned');
                await StorageService.set({ popupFloatEnabled: false });
                showStatus('Floating mode disabled', true);
            } else {
                pinBtn.classList.add('pinned');
                await StorageService.set({ popupFloatEnabled: true });
                
                chrome.windows.create({
                    url: chrome.runtime.getURL('popup/popup.html'),
                    type: 'popup',
                    width: 400,
                    height: 700,
                    focused: true
                }).then((window) => {
                    showStatus('Floating window opened', true);
                }).catch((err) => {
                    console.error('Failed to create window:', err);
                    ToastManager.error('Failed to open floating window');
                });
            }
        });
        
        StorageService.get('popupFloatEnabled').then(result => {
            if (result.popupFloatEnabled) {
                pinBtn.classList.add('pinned');
            }
        });
    }
    
    // Test button - uses StatusService
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            updateAllServiceStatus('checking');
            ToastManager.info('Testing all services...');
            
            try {
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
                    // Build detailed status message
                    const issues = [];
                    if (!results.storage) issues.push('Storage');
                    if (!results.aiServer) issues.push('AI Server');
                    if (!results.salesforce) issues.push('Salesforce');
                    if (!results.background) issues.push('Background');
                    
                    // CTM gets special message
                    const ctmStatusText = StatusService.getCTMStatusText(results.ctmStatus);
                    if (!results.ctmMonitor) {
                        issues.push('CTM (' + ctmStatusText + ')');
                    }
                    
                    showStatus('Issues: ' + issues.join(', '), false);
                    updateMainStatus(false);
                }
                
                updateStats();
            } catch(e) {
                console.error('[Popup] Test error:', e);
                ToastManager.error('Test failed: ' + e.message);
            }
        });
    }
    
    // Config button
    if (configBtn) {
        configBtn.addEventListener('click', () => {
            window.open(chrome.runtime.getURL('config/config.html'), '_blank');
        });
    }
    
    // ====== Test Analysis Section ======
    const testNewLeadBtn = document.getElementById('testNewLeadBtn');
    const testExistingLeadBtn = document.getElementById('testExistingLeadBtn');
    const testInputArea = document.getElementById('testInputArea');
    const testStatus = document.getElementById('testStatus');
    const transcriptionInput = document.getElementById('transcriptionInput');
    const testPhoneInput = document.getElementById('testPhoneInput');
    const testClientSelect = document.getElementById('testClientSelect');
    const runAnalysisBtn = document.getElementById('runAnalysisBtn');
    const audioFileInput = document.getElementById('audioFileInput');
    
    let currentTestType = null;
    
    // Test New Lead button
    if (testNewLeadBtn) {
        testNewLeadBtn.addEventListener('click', () => {
            currentTestType = 'new-lead';
            if (testInputArea) testInputArea.style.display = 'block';
            if (testStatus) testStatus.style.display = 'none';
            
            // Clear fields - user will upload audio or paste transcription
            if (transcriptionInput) transcriptionInput.value = '';
            if (testPhoneInput) testPhoneInput.value = '';
            if (testClientSelect) testClientSelect.value = 'flyland';
            if (audioFileInput) audioFileInput.value = '';
        });
    }
    
    // Test Existing Lead button
    if (testExistingLeadBtn) {
        testExistingLeadBtn.addEventListener('click', () => {
            currentTestType = 'existing';
            if (testInputArea) testInputArea.style.display = 'block';
            if (testStatus) testStatus.style.display = 'none';
            
            // Clear fields - user will upload audio or paste transcription
            if (transcriptionInput) transcriptionInput.value = '';
            if (testPhoneInput) testPhoneInput.value = '';
            if (testClientSelect) testClientSelect.value = 'flyland';
            if (audioFileInput) audioFileInput.value = '';
        });
    }
    
    // Run Analysis button
    if (runAnalysisBtn) {
        runAnalysisBtn.addEventListener('click', async () => {
        const audioFile = audioFileInput.files[0];
        let transcription = transcriptionInput.value.trim();
        const client = testClientSelect.value;
        let phone = testPhoneInput.value.trim();
        
        // Sanitize phone number: keep only digits and + symbol
        if (phone) {
            phone = phone.replace(/[^\d+]/g, '');
            // Ensure + is at the start if present
            if (phone.startsWith('+')) {
                phone = '+' + phone.replace(/\D/g, '');
            } else if (phone.length > 0) {
                // If no + but has digits, strip any leading 1 (country code) if 11 digits
                phone = phone.replace(/\D/g, '');
            }
        }
        
        const serverUrl = await StatusService.getAIServerUrl();
        const actualUrl = serverUrl.includes('localhost') ? 'https://ags-ai-server.azurewebsites.net' : serverUrl;
        
        console.log('[Test Analysis] Server URL:', actualUrl);
        
        // If audio file provided, transcribe first
        if (audioFile) {
            showTestStatus('Transcribing audio...', 'loading');
            
            try {
                console.log('[Transcribe] Proceeding to upload audio file...');
                
                const formData = new FormData();
                formData.append('file', audioFile);
                
                const transcribeResponse = await fetch(`${actualUrl}/api/transcribe`, {
                    method: 'POST',
                    body: formData
                });
                
                console.log('[Transcribe] Response status:', transcribeResponse.status);
                
                if (!transcribeResponse.ok) {
                    const err = await transcribeResponse.json();
                    throw new Error(err.error || 'Transcription failed');
                }
                
                const transcribeResult = await transcribeResponse.json();
                console.log('[Transcribe] Result:', transcribeResult);
                
                // Check if transcription returned an error
                if (transcribeResult.error) {
                    throw new Error(transcribeResult.error);
                }
                
                transcription = transcribeResult.transcription;
                transcriptionInput.value = transcription;
                
                // Use extracted phone if available, otherwise keep manual entry
                if (transcribeResult.phone && !phone) {
                    phone = transcribeResult.phone;
                    testPhoneInput.value = phone;
                }
                
                showTestStatus('Transcription complete! Running analysis...', 'loading');
                
            } catch (error) {
                console.error('[Transcribe] Error:', error);
                showTestStatus('Transcription error: ' + error.message, 'error');
                return;
            }
        }
        
        if (!transcriptionInput.value.trim()) {
            showTestStatus('Please upload audio or enter transcription', 'error');
            return;
        }
        
        showTestStatus('Running AI Analysis...', 'loading');
        
        try {
            // Get AI Server URL - use Azure as default
            const serverUrl = await StatusService.getAIServerUrl();
            const actualUrl = serverUrl.includes('localhost') ? 'https://ags-ai-server.azurewebsites.net' : serverUrl;
            console.log('[Test Analysis] Using URL:', actualUrl);
            
            // Send to AI server for analysis with retry logic
            let response;
            let lastError = null;
            const maxRetries = 3;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`[Test Analysis] Attempt ${attempt}/${maxRetries}...`);
                    response = await fetch(`${actualUrl}/api/analyze`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            transcription: transcriptionInput.value.trim(),
                            phone: phone,
                            client: client
                        }),
                        signal: AbortSignal.timeout(60000)
                    });
                    
                    if (response.ok) break;
                    lastError = `HTTP ${response.status}: ${response.statusText}`;
                    
                } catch (netError) {
                    lastError = netError.message;
                    console.log(`[Test Analysis] Attempt ${attempt} failed:`, netError.message);
                    if (attempt < maxRetries) {
                        await new Promise(r => setTimeout(r, 2000 * attempt)); // Increased backoff
                    }
                }
            }
            
            if (!response || !response.ok) {
                throw new Error(lastError || 'AI Server unreachable after retries');
            }
            
            const analysis = await response.json();
            
            // Now get the action determination
            const actionResponse = await fetch(`${actualUrl}/api/determine-action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcription: transcriptionInput.value.trim(),
                    analysis: analysis,
                    phone: phone,
                    client: client
                }),
                signal: AbortSignal.timeout(60000)
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
                        value: String(phone),
                        confidence: 1.0,
                        source: 'ctm',
                        isHighConfidence: true
                    });
                }
                
                // Helper to safely extract string values from AI response
                const getStringValue = (value) => {
                    if (typeof value === 'string') return value;
                    if (typeof value === 'object' && value !== null) {
                        // Handle nested objects like { text: "value" } or { name: "value" }
                        return value.text || value.name || value.value || String(value);
                    }
                    return String(value || '');
                };
                
                // Helper to format salesforceNotes (handle object → string conversion)
                const formatSalesforceNotes = (notes) => {
                    if (typeof notes === 'string') return notes;
                    if (typeof notes === 'object' && notes !== null) {
                        const parts = [];
                        if (notes.phone) parts.push(`Phone: ${notes.phone}`);
                        if (notes.state) parts.push(`State: ${notes.state}`);
                        if (notes.insurance) parts.push(`Insurance: ${notes.insurance}`);
                        if (notes.sober_days) parts.push(`Sober Days: ${notes.sober_days}`);
                        if (notes.summary) parts.push(`Summary: ${notes.summary}`);
                        // Include any other properties
                        for (const [key, value] of Object.entries(notes)) {
                            if (!['phone', 'state', 'insurance', 'sober_days', 'summary'].includes(key) && value) {
                                parts.push(`${key}: ${value}`);
                            }
                        }
                        return parts.join(' | ') || String(notes);
                    }
                    return String(notes || '');
                };
                
                if (analysis.detected_state) {
                    const stateValue = getStringValue(analysis.detected_state);
                    callerInfoDisplay.push({
                        label: 'State',
                        value: stateValue,
                        confidence: analysis.state_confidence || 0.7,
                        source: 'ai',
                        isHighConfidence: (analysis.state_confidence || 0.7) >= 0.8
                    });
                }
                
                if (analysis.detected_insurance) {
                    const insuranceValue = getStringValue(analysis.detected_insurance);
                    callerInfoDisplay.push({
                        label: 'Insurance',
                        value: insuranceValue,
                        confidence: analysis.insurance_confidence || 0.6,
                        source: 'ai',
                        isHighConfidence: (analysis.insurance_confidence || 0.6) >= 0.7
                    });
                }
                
                if (analysis.detected_sober_days) {
                    const soberValue = typeof analysis.detected_sober_days === 'object' 
                        ? getStringValue(analysis.detected_sober_days)
                        : String(analysis.detected_sober_days);
                    callerInfoDisplay.push({
                        label: 'Sober',
                        value: `${soberValue} days`,
                        confidence: analysis.sober_confidence || 0.7,
                        source: 'ai',
                        isHighConfidence: (analysis.sober_confidence || 0.7) >= 0.7
                    });
                }
                
                window.overlayUI.showCallerInfo(callerInfoDisplay, {
                    qualificationScore: analysis.qualification_score || 0,
                    recommended_department: action.transfer_department || analysis.recommended_department,
                    action: action.action,
                    callNotes: action.call_notes,
                    // NEW: Full transcription and key details
                    fullTranscription: analysis.full_transcription || '',
                    mentionedNames: analysis.mentioned_names || [],
                    mentionedLocations: analysis.mentioned_locations || [],
                    mentionedPhones: analysis.mentioned_phones || [],
                    otherCustomerInfo: analysis.other_customer_info || '',
                    salesforceNotes: formatSalesforceNotes(analysis.salesforce_notes),
                    // NEW: Scoring breakdown
                    scoringBreakdown: analysis.scoring_breakdown || {},
                    scoringExplanation: analysis.scoring_explanation || ''
                }, phone);
            }
            
        } catch (error) {
            console.error('Test analysis error:', error);
            console.error('Server URL was:', actualUrl);
            showTestStatus('Error: ' + error.message, 'error');
        }
    });
    }
    
    // Quick Test button - runs analysis with sample data (DISABLED - using real data only)
    // NOTE: Quick Test disabled per user request - use "Run Analysis" with real transcription or MP3 file
    const quickTestBtn = document.getElementById('quickTestBtn');
    if (quickTestBtn) {
        quickTestBtn.style.display = 'none'; // Hide for now
    }
    
    function showTestStatus(message, status) {
        if (!testStatus) return;
        
        testStatus.style.display = 'block';
        testStatus.className = 'test-status ' + status;
        
        const existingText = testStatus.querySelector('.test-status-text');
        if (existingText) existingText.remove();
        
        const span = document.createElement('span');
        span.className = 'test-status-text';
        span.textContent = message;
        testStatus.appendChild(span);
    }
    
    // Make overlayUI globally accessible
    window.overlayUI = overlayUI;
    window.StatusService = StatusService;
    window.NotesManager = NotesManager;
    window.QualificationManager = QualificationManager;
    
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
    
    // Run initial test after a short delay
    setTimeout(() => {
        checkServerConnection();
    }, 500);
    
    console.log('[Popup] Ready');
});
