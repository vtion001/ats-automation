/**
 * Test Panel Component
 * Handles test/analysis functionality in the popup
 */

class TestPanel {
    constructor() {
        this.currentTestType = null;
        this.overlayUI = null;
    }

    setOverlayUI(overlayUI) {
        this.overlayUI = overlayUI;
    }

    /**
     * Initialize test panel
     */
    init() {
        this.bindEvents();
    }

    /**
     * Bind UI events
     */
    bindEvents() {
        const testNewLeadBtn = document.getElementById('testNewLeadBtn');
        const testExistingLeadBtn = document.getElementById('testExistingLeadBtn');
        const runAnalysisBtn = document.getElementById('runAnalysisBtn');

        if (testNewLeadBtn) {
            testNewLeadBtn.addEventListener('click', () => {
                this.currentTestType = 'new-lead';
                this.showTestInput();
                this.clearFields();
            });
        }

        if (testExistingLeadBtn) {
            testExistingLeadBtn.addEventListener('click', () => {
                this.currentTestType = 'existing';
                this.showTestInput();
                this.clearFields();
            });
        }

        if (runAnalysisBtn) {
            runAnalysisBtn.addEventListener('click', () => this.runAnalysis());
        }
    }

    showTestInput() {
        const testInputArea = document.getElementById('testInputArea');
        const testStatus = document.getElementById('testStatus');
        
        if (testInputArea) testInputArea.style.display = 'block';
        if (testStatus) testStatus.style.display = 'none';
    }

    clearFields() {
        const transcriptionInput = document.getElementById('transcriptionInput');
        const testPhoneInput = document.getElementById('testPhoneInput');
        const testClientSelect = document.getElementById('testClientSelect');
        const audioFileInput = document.getElementById('audioFileInput');

        if (transcriptionInput) transcriptionInput.value = '';
        if (testPhoneInput) testPhoneInput.value = '';
        if (testClientSelect) testClientSelect.value = 'flyland';
        if (audioFileInput) audioFileInput.value = '';
    }

    /**
     * Run analysis on input
     */
    async runAnalysis() {
        const audioFileInput = document.getElementById('audioFileInput');
        const transcriptionInput = document.getElementById('transcriptionInput');
        const testPhoneInput = document.getElementById('testPhoneInput');
        const testClientSelect = document.getElementById('testClientSelect');

        const audioFile = audioFileInput?.files[0];
        let transcription = transcriptionInput?.value.trim() || '';
        const client = testClientSelect?.value || 'flyland';
        let phone = testPhoneInput?.value.trim() || '';

        // Sanitize phone
        if (phone) {
            phone = phone.replace(/[^\d+]/g, '');
            if (phone.startsWith('+')) {
                phone = '+' + phone.replace(/\D/g, '');
            } else if (phone.length > 0) {
                phone = phone.replace(/\D/g, '');
            }
        }

        if (!transcriptionInput?.value.trim() && !audioFile) {
            this.showTestStatus('Please upload audio or enter transcription', 'error');
            return;
        }

        // Get server URL
        const serverUrl = await this.getAIServerUrl();
        const actualUrl = serverUrl.includes('localhost') 
            ? 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io' 
            : serverUrl;

        // Transcribe audio if provided
        if (audioFile) {
            this.showTestStatus('Transcribing audio...', 'loading');
            
            try {
                transcription = await this.transcribeAudio(actualUrl, audioFile);
                if (transcriptionInput) transcriptionInput.value = transcription;
            } catch (error) {
                this.showTestStatus('Transcription error: ' + error.message, 'error');
                return;
            }
        }

        this.showTestStatus('Running AI Analysis...', 'loading');

        try {
            const analysis = await this.analyzeWithAI(actualUrl, transcription, phone, client);
            const action = await this.determineAction(actualUrl, transcription, analysis, phone, client);

            const fullResult = {
                ...analysis,
                ...action,
                phone: phone,
                callerName: analysis.caller_name || null,
                testType: this.currentTestType
            };

            this.showTestStatus('Analysis complete!', 'success');
            this.displayResults(fullResult, phone);

        } catch (error) {
            console.error('Test analysis error:', error);
            this.showTestStatus('Error: ' + error.message, 'error');
        }
    }

    async getAIServerUrl() {
        if (window.StatusService) {
            return window.StatusService.getAIServerUrl();
        }
        
        // Fallback
        const result = await chrome.storage.local.get('aiServerUrl');
        return result.aiServerUrl || 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
    }

    async transcribeAudio(serverUrl, audioFile) {
        const formData = new FormData();
        formData.append('file', audioFile);

        const response = await fetch(`${serverUrl}/api/transcribe`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Transcription failed');
        }

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        // Update phone if extracted
        if (result.phone) {
            const testPhoneInput = document.getElementById('testPhoneInput');
            if (testPhoneInput && !testPhoneInput.value) {
                testPhoneInput.value = result.phone;
            }
        }

        return result.transcription;
    }

    async analyzeWithAI(serverUrl, transcription, phone, client) {
        let lastError = null;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(`${serverUrl}/api/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        transcription,
                        phone,
                        client
                    }),
                    signal: AbortSignal.timeout(60000)
                });

                if (response.ok) return await response.json();
                lastError = `HTTP ${response.status}: ${response.statusText}`;

            } catch (netError) {
                lastError = netError.message;
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 2000 * attempt));
                }
            }
        }

        throw new Error(lastError || 'AI Server unreachable after retries');
    }

    async determineAction(serverUrl, transcription, analysis, phone, client) {
        const response = await fetch(`${serverUrl}/api/determine-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcription,
                analysis,
                phone,
                client
            }),
            signal: AbortSignal.timeout(60000)
        });

        if (!response.ok) {
            throw new Error('Failed to determine action');
        }

        return await response.json();
    }

    displayResults(fullResult, phone) {
        if (!this.overlayUI) return;

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

        const getStringValue = (value) => {
            if (typeof value === 'string') return value;
            if (typeof value === 'object' && value !== null) {
                return value.text || value.name || value.value || String(value);
            }
            return String(value || '');
        };

        if (fullResult.detected_state) {
            callerInfoDisplay.push({
                label: 'State',
                value: getStringValue(fullResult.detected_state),
                confidence: fullResult.state_confidence || 0.7,
                source: 'ai',
                isHighConfidence: (fullResult.state_confidence || 0.7) >= 0.8
            });
        }

        if (fullResult.detected_insurance) {
            callerInfoDisplay.push({
                label: 'Insurance',
                value: getStringValue(fullResult.detected_insurance),
                confidence: fullResult.insurance_confidence || 0.6,
                source: 'ai',
                isHighConfidence: (fullResult.insurance_confidence || 0.6) >= 0.7
            });
        }

        this.overlayUI.showCallerInfo(callerInfoDisplay, {
            qualificationScore: fullResult.qualification_score || 0,
            recommended_department: fullResult.transfer_department || fullResult.recommended_department,
            action: fullResult.action,
            callNotes: fullResult.call_notes,
            fullTranscription: fullResult.full_transcription || '',
            mentionedNames: fullResult.mentioned_names || [],
            mentionedLocations: fullResult.mentioned_locations || [],
            mentionedPhones: fullResult.mentioned_phones || [],
            otherCustomerInfo: fullResult.other_customer_info || '',
            salesforceNotes: fullResult.salesforce_notes || '',
            scoringBreakdown: fullResult.scoring_breakdown || {},
            scoringExplanation: fullResult.scoring_explanation || ''
        }, phone);
    }

    showTestStatus(message, status) {
        const testStatus = document.getElementById('testStatus');
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
}

// Export
if (typeof window !== 'undefined') {
    window.TestPanel = TestPanel;
}
