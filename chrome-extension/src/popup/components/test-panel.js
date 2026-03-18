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
     * Handle Test New Lead button click
     */
    handleNewLeadClick() {
        this.currentTestType = 'new-lead';
        
        const testInputArea = document.getElementById('testInputArea');
        const testStatus = document.getElementById('testStatus');
        
        if (testInputArea) testInputArea.style.display = 'block';
        if (testStatus) testStatus.style.display = 'none';
        
        this.clearFields();
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

        // Get server URLs to try
        const urlsToTry = await this.getServerUrls();
        
        // Transcribe audio if provided
        if (audioFile) {
            this.showTestStatus('Transcribing audio...', 'loading');
            
            try {
                transcription = await this.transcribeAudio(urlsToTry, audioFile, testPhoneInput);
                if (transcriptionInput) transcriptionInput.value = transcription;
            } catch (error) {
                this.showTestStatus('Transcription error: ' + error.message, 'error');
                return;
            }
        }

        this.showTestStatus('Running AI Analysis...', 'loading');

        try {
            // Try each server URL
            const analysis = await this.analyzeWithMultiUrl(urlsToTry, transcription, phone, client);
            const action = await this.determineAction(urlsToTry[0], transcription, analysis, phone, client);

            const fullResult = {
                ...analysis,
                ...action,
                phone: phone,
                callerName: analysis.caller_name || null,
                testType: this.currentTestType
            };

            this.showTestStatus('Analysis complete!', 'success');
            this.displayResults(fullResult, phone);
            
            // Show overlay with full analysis
            if (this.overlayUI) {
                this.overlayUI.showCallAnalysis(fullResult);
            }
            
            // Update stats
            if (window.StorageService) {
                await window.StorageService.incrementAnalysis();
            }

        } catch (error) {
            console.error('Test analysis error:', error);
            this.showTestStatus('Error: ' + error.message, 'error');
        }
    }

    async getServerUrls() {
        let serverUrl = await this.getAIServerUrl();
        
        const urls = [
            serverUrl,
            'http://localhost:8000',
            'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io'
        ];
        
        return [...new Set(urls)].map(url => {
            if (!url) return null;
            let normalized = url.trim();
            if (!normalized.startsWith('http')) {
                normalized = 'https://' + normalized;
            }
            return normalized;
        }).filter(Boolean);
    }

    async transcribeAudio(urls, audioFile, phoneInputEl) {
        for (const serverUrl of urls) {
            try {
                const formData = new FormData();
                formData.append('file', audioFile);

                const response = await fetch(`${serverUrl}/api/transcribe`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) continue;

                const result = await response.json();
                if (result.error) throw new Error(result.error);

                // Update phone if extracted
                if (result.phone && phoneInputEl && !phoneInputEl.value) {
                    phoneInputEl.value = result.phone;
                }

                return result.transcription;
            } catch (e) {
                console.log('[Transcribe] Failed:', serverUrl, e.message);
                continue;
            }
        }
        throw new Error('All transcription servers failed');
    }

    async analyzeWithMultiUrl(urls, transcription, phone, client) {
        let lastError = null;

        for (const serverUrl of urls) {
            try {
                const response = await fetch(`${serverUrl}/api/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        transcription,
                        phone,
                        client
                    }),
                    signal: AbortSignal.timeout(30000)
                });

                if (response.ok) {
                    console.log('[Analysis] Success from:', serverUrl);
                    return await response.json();
                }
                lastError = `HTTP ${response.status}: ${response.statusText}`;
                console.log('[Analysis] Failed:', serverUrl, lastError);

            } catch (netError) {
                lastError = netError.message;
                console.log('[Analysis] Error:', serverUrl, netError.message);
                continue;
            }
        }

        throw new Error(lastError || 'AI Server unreachable');
    }

    async determineAction(serverUrl, transcription, analysis, phone, client) {
        try {
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
        } catch (e) {
            console.error('[determineAction] Error:', e);
            throw e;
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

    /**
     * Display analysis result from background recording
     */
    displayAnalysisResult(result) {
        const analysis = result.analysis || result;
        const transcription = result.transcription || '';
        
        const fullResult = {
            phone: null,
            callerName: analysis.caller_name || null,
            tags: analysis.tags || [],
            sentiment: analysis.sentiment || 'neutral',
            qualificationScore: analysis.qualification_score || 0,
            summary: analysis.summary || '',
            suggestedDisposition: analysis.suggested_disposition || 'New',
            followUpRequired: analysis.follow_up_required || false,
            salesforceNotes: analysis.salesforce_notes || '',
            detectedState: analysis.detected_state || '',
            detectedInsurance: analysis.detected_insurance || '',
            callType: analysis.call_type,
            recommendedDepartment: analysis.recommended_department,
            testType: 'background-recording',
            transcript: transcription
        };
        
        // Display in qualification section
        if (window.qualificationDisplay) {
            window.qualificationDisplay.display(fullResult);
        }
        
        // Show overlay
        if (this.overlayUI) {
            this.overlayUI.showCallAnalysis(fullResult);
        }
        
        // Expand test section
        const testSection = document.getElementById('testAnalysisSection');
        if (testSection) testSection.classList.remove('collapsed');
        
        this.showTestStatus('Background recording analysis complete!', 'success');
        
        // Update stats
        if (window.StorageService) {
            window.StorageService.incrementAnalysis?.();
            window.StorageService.incrementCalls?.();
        }
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

    /**
     * Handle Test Existing Lead button click - fetch from webhook results
     */
    async handleExistingLeadClick() {
        this.currentTestType = 'existing';
        
        const testInputArea = document.getElementById('testInputArea');
        const testStatus = document.getElementById('testStatus');
        
        if (testInputArea) testInputArea.style.display = 'none';
        if (testStatus) testStatus.style.display = 'block';
        
        this.showTestStatus('Fetching latest call data...', 'loading');
        
        try {
            const urls = await this.getServerUrls();
            const data = await this.fetchFromServers(urls, '/api/webhook-results');
            
            if (!data) {
                throw new Error('Could not connect to any server');
            }
            
            let results = [];
            if (data.results && Array.isArray(data.results)) {
                results = data.results;
            } else if (data.phone || data.call_id) {
                results = [data];
            }
            
            if (results.length === 0) {
                this.showTestStatus('No calls found. Make a call first or send a webhook.', 'error');
                return;
            }
            
            const result = results[0];
            const phone = result.phone || result.phone_number;
            const transcript = result.transcript || result.transcription || '';
            const analysis = result.analysis || {};
            
            if (!transcript) {
                this.showTestStatus('No transcript found in stored call data.', 'error');
                return;
            }
            
            this.showTestStatus('Analysis found! Displaying results...', 'success');
            
            const fullResult = {
                phone: phone,
                callerName: analysis.caller_name || null,
                tags: analysis.tags || result.tags || [],
                sentiment: analysis.sentiment || result.sentiment || 'neutral',
                qualificationScore: analysis.qualification_score || result.qualification_score || 0,
                summary: analysis.summary || result.summary || '',
                suggestedDisposition: analysis.suggested_disposition || result.suggested_disposition || 'New',
                followUpRequired: analysis.follow_up_required || result.follow_up_required || false,
                salesforceNotes: analysis.salesforce_notes || result.salesforce_notes || '',
                detectedState: analysis.detected_state,
                detectedInsurance: analysis.detected_insurance,
                callType: analysis.call_type,
                recommendedDepartment: analysis.recommended_department,
                testType: 'existing',
                transcript: transcript
            };
            
            // Display results
            if (window.qualificationDisplay) {
                window.qualificationDisplay.display(fullResult);
            }
            
            if (this.overlayUI) {
                this.overlayUI.showCallAnalysis(fullResult);
            }
            
            this.showTestStatus('Call analysis loaded!', 'success');
            
            // Update stats
            if (window.StorageService) {
                await window.StorageService.incrementAnalysis();
                await window.StorageService.incrementCalls();
            }
            
        } catch (error) {
            console.error('[Test Existing Lead] Error:', error);
            this.showTestStatus('Error: ' + error.message, 'error');
        }
    }

    async fetchFromServers(urls, endpoint) {
        for (const url of urls) {
            try {
                console.log('[Fetch] Trying:', url);
                const response = await fetch(`${url}${endpoint}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(8000)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('[Fetch] Success from:', url);
                    return data;
                }
            } catch (error) {
                console.log('[Fetch] Failed:', url, error.message);
                continue;
            }
        }
        return null;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.TestPanel = TestPanel;
}
