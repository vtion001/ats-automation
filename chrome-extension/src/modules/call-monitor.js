/**
 * Call Monitor Module
 * Main module that orchestrates CTM monitoring, transcription, and Salesforce search
 * Handles button-trigger flow for New Lead / Existing Lead
 */

class CallMonitor {
    constructor() {
        this.ctmService = new CTMService();
        this.salesforceService = new SalesforceService();
        this.salesforceContactService = new SalesforceContactService();
        this.salesforceActionService = new SalesforceActionService();
        this.transcriptionService = new TranscriptionService();
        this.aiService = new AIService();
        this.callerInfoService = new CallerInfoService();
        this.audioCaptureService = new AudioCaptureService();
        this.webhookPollInterval = null;
        
        this.currentCall = null;
        this.currentAnalysis = null;
        this.isMonitoring = false;
        this.callStartTime = null;
    }

    // Set extension icon badge color (via background script)
    setBadge(color, text) {
        // Send message to background to set badge
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({
                    action: 'SET_BADGE',
                    color: color,
                    text: text || ''
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        // Background might not be available, try direct
                        console.log('[Badge] Background not available');
                    }
                });
            }
        } catch (e) {
            console.log('[Badge] Could not set badge:', e.message);
        }
    }

    // Show status notification to user
    showStatus(message, type = 'info') {
        const colors = {
            'recording': '#22c55e',  // green
            'waiting': '#eab308',     // yellow
            'success': '#22c55e',     // green
            'error': '#ef4444',       // red
            'info': '#3b82f6'         // blue
        };
        
        // Set badge color
        this.setBadge(colors[type] || colors['info'], message);
        
        // Also log to console for debugging
        console.log('[Status:' + type + '] ' + message);
        
        // Also send to overlay for display
        ATS.sendMessage({
            type: ATS.Messages.SHOW_NOTIFICATION,
            payload: { message: message, type: type }
        });
        
        ATS.logger.info('[Status:' + type + '] ' + message);
    }

    // Initialize all services
    async init() {
        ATS.logger.info('Initializing Call Monitor...');
        
        await ATS.init();
        await this.salesforceService.init();
        await this.salesforceContactService.init();
        await this.salesforceActionService.init();
        await this.aiService.init();
        
        // Set up transcription callbacks
        this.transcriptionService.onTranscriptUpdate = (transcript, isFinal) => {
            if (isFinal) {
                ATS.logger.debug('Transcript updated');
            }
        };
        
        this.transcriptionService.onError = (error) => {
            ATS.logger.error('Transcription error:', error);
        };
        
        ATS.logger.info('Call Monitor initialized');
    }

    // Start monitoring for calls
    start() {
        if (this.isMonitoring) {
            ATS.logger.warn('Already monitoring');
            return;
        }

        this.isMonitoring = true;
        
        // Start CTM monitoring
        this.ctmService.startMonitoring(async (event) => {
            await this.handleCallEvent(event);
        });
        
        ATS.logger.info('Call monitoring started');
    }

    // Stop monitoring
    stop() {
        this.isMonitoring = false;
        this.ctmService.stopMonitoring();
        this.transcriptionService.stop();
        this.stopWebhookPolling();
        ATS.logger.info('Call monitoring stopped');
    }

    // Check for CTM webhook results via server
    async checkWebhookResults(phoneNumber) {
        try {
            const serverUrl = this.aiService.serverUrl;
            const response = await fetch(serverUrl + '/api/webhook-results?phone=' + encodeURIComponent(phoneNumber), {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Handle the response format - could be direct result or wrapped in results array
                let result = null;
                
                if (data.results && data.results.length > 0) {
                    // Results are in an array, find by phone
                    result = data.results.find(r => r.phone === phoneNumber);
                } else if (data.phone === phoneNumber || data.analysis) {
                    // Direct result format
                    result = data;
                }
                
                if (result && result.analysis) {
                    ATS.logger.info('[Webhook] Analysis received:', result.analysis.tags || []);
                    return result;
                }
            }
        } catch (e) {
            ATS.logger.debug('[Webhook] Poll error:', e.message);
        }
        return null;
    }

    // Start polling for webhook results after call ends
    startWebhookPolling(phoneNumber) {
        let attempts = 0;
        const maxAttempts = 30;
        const self = this;
        
        ATS.logger.info('[Webhook] Starting polling for:', phoneNumber);
        
        this.webhookPollInterval = setInterval(async () => {
            attempts++;
            
            const result = await self.checkWebhookResults(phoneNumber);
            
            if (result && result.analysis) {
                clearInterval(self.webhookPollInterval);
                self.webhookPollInterval = null;
                
                self.showStatus('ANALYSIS', 'success');
                ATS.logger.info('[Webhook] ★ Result received!');
                
                self.currentAnalysis = result.analysis;
                self.callerInfoService.updateFromAI(result.analysis);
                
                ATS.sendMessage({
                    type: ATS.Messages.SHOW_CALL_SUMMARY,
                    payload: {
                        callerInfo: self.callerInfoService.getDisplayInfo(),
                        analysis: result.analysis,
                        phone: phoneNumber,
                        showButtons: true,
                        transcript: result.transcript
                    }
                });
            } else if (attempts >= maxAttempts) {
                clearInterval(self.webhookPollInterval);
                self.webhookPollInterval = null;
                self.showStatus('NO-WEBHOOK', 'error');
                ATS.logger.warn('[Webhook] ★ Polling timeout - no webhook result');
            }
        }, 2000);
    }

    // Stop webhook polling
    stopWebhookPolling() {
        if (this.webhookPollInterval) {
            clearInterval(this.webhookPollInterval);
            this.webhookPollInterval = null;
        }
    }

    // Handle call events
    async handleCallEvent(event) {
        ATS.logger.info('Call event:', event.type, event);
        
        if (event.type === 'call_started') {
            await this.handleCallStart(event);
        } else if (event.type === 'call_ended') {
            await this.handleCallEnd();
        } else {
            ATS.logger.warn('Unknown call event type:', event.type);
        }
    }

    // Handle call start
    async handleCallStart(event) {
        this.currentCall = {
            ...event,
            startTime: new Date().toISOString()
        };
        
        ATS.logger.info('★ Call started:', this.currentCall);
        
        // Debug: Log config values
        ATS.logger.info('★ Config - autoSearchSF:', ATS.config.autoSearchSF, 'transcriptionEnabled:', ATS.config.transcriptionEnabled);
        
        // Set badge to show call in progress
        this.showStatus('CALL', 'recording');
        
        // Show call in progress UI with Start Recording button
        ATS.sendMessage({
            type: ATS.Messages.SHOW_CALL_IN_PROGRESS,
            payload: {
                phoneNumber: this.currentCall.phoneNumber,
                callerName: this.currentCall.callerName
            }
        });
        
        // Initialize caller info from CTM
        await this.callerInfoService.initFromCTM(this.currentCall);
        
        // Notify background script
        ATS.sendMessage({
            type: ATS.Messages.CTM_CALL_EVENT,
            payload: { ...this.currentCall, event: 'call_started' }
        });
        
        // Auto-search Salesforce
        if (ATS.config.autoSearchSF && this.currentCall.phoneNumber) {
            ATS.logger.info('★ Starting Salesforce search for:', this.currentCall.phoneNumber);
            await this.salesforceService.search(this.currentCall.phoneNumber);
            ATS.logger.info('★ Salesforce search completed');
        } else {
            ATS.logger.warn('★ Salesforce search skipped - autoSearchSF:', ATS.config.autoSearchSF, 'phoneNumber:', this.currentCall.phoneNumber);
        }
        
        // Start transcription (Web Speech API)
        if (ATS.config.transcriptionEnabled) {
            ATS.logger.info('★ Starting transcription (Web Speech)...');
            this.transcriptionService.start();
        }
        
        // NOTE: Audio capture is now triggered by user clicking "Start Recording" button
        // This is required because Chrome Desktop Capture API requires user gesture
        ATS.logger.info('[Audio] Waiting for user to click Start Recording button');
    }

    // Handle call end - BUTTON TRIGGER FLOW (not auto-run)
    async handleCallEnd() {
        if (!this.currentCall) {
            ATS.logger.warn('★ handleCallEnd called but no currentCall');
            return;
        }
        
        this.currentCall.endTime = new Date().toISOString();
        
        ATS.logger.info('★ Call ended:', { 
            phoneNumber: this.currentCall.phoneNumber,
            startTime: this.currentCall.startTime,
            endTime: this.currentCall.endTime 
        });
        
        // Clear the call badge
        this.setBadge(null, '');
        
        // Stop transcription
        this.transcriptionService.stop();
        
        // Stop CTM audio recording
        ATS.logger.info('[Audio] Stopping CTM audio recording...');
        const audioBlob = await this.audioCaptureService.stopRecording();
        
        if (audioBlob) {
            ATS.logger.info('[Audio] ★ Audio captured, size:', audioBlob.size);
            this.showStatus('AUDIO OK', 'success');
        } else {
            ATS.logger.warn('[Audio] ★ No audio captured');
            this.showStatus('NO-AUDIO', 'error');
        }
        
        // Get transcript before saving
        const transcript = this.transcriptionService.getTranscript();
        ATS.logger.info('★ Transcript length:', transcript ? transcript.length : 0, 'chars');
        
        // Save transcription
        let markdown = '';
        if (ATS.config.saveMarkdown) {
            markdown = this.transcriptionService.saveToMarkdown(this.currentCall);
            ATS.logger.info('★ Markdown saved, length:', markdown.length);
        }
        
        // Notify background
        ATS.sendMessage({
            type: ATS.Messages.CTM_CALL_EVENT,
            payload: { ...this.currentCall, event: 'call_ended' }
        });

        // Start webhook polling as alternative to audio capture
        // CTM will send webhook with transcript, we'll poll for results
        // This is the PRIMARY path - webhook provides transcript + analysis
        if (ATS.config.aiAnalysisEnabled && this.currentCall.phoneNumber) {
            ATS.logger.info('[Webhook] Starting webhook polling for:', this.currentCall.phoneNumber);
            this.showStatus('WEBHOOK', 'waiting');
            // Start webhook polling but DON'T run local analysis yet
            // The webhook polling will handle showing the popup when results arrive
            this.startWebhookPolling(this.currentCall.phoneNumber);
            
            // NOTE: We don't run local AI analysis here because:
            // 1. Webhook is the primary source for transcripts
            // 2. Webhook polling handles showing the popup
            // 3. If webhook times out, the polling will log a warning
            
            ATS.logger.info('[Webhook] Waiting for webhook results - skipping local analysis');
            return; // Exit early - let webhook handle the popup
        }
        
        // Fallback: If no phone number, try local analysis (shouldn't happen normally)
        // This is only for edge cases where phone number is missing

        // Also try local audio capture as fallback
        // (original audio capture code continues below)
        if (ATS.config.aiAnalysisEnabled) {
            ATS.logger.info('★ Starting AI analysis...');
            
            const analysis = await this.aiService.analyze(
                transcript,
                this.currentCall.phoneNumber,
                ATS.config.activeClient
            );
            
            ATS.logger.info('★ AI Analysis complete:', analysis ? 'Success' : 'Failed');
            
            // Store analysis
            this.currentAnalysis = analysis;
            
            // Update caller info with AI results
            this.callerInfoService.updateFromAI(analysis);
            
            ATS.logger.info('AI Analysis:', analysis);
            
            // Show overlay with BUTTONS instead of auto-executing
            ATS.sendMessage({
                type: ATS.Messages.SHOW_CALL_SUMMARY,
                payload: {
                    callerInfo: this.callerInfoService.getDisplayInfo(),
                    analysis: analysis,
                    phone: this.currentCall.phoneNumber,
                    showButtons: true
                }
            });
        }
        
        // Don't nullify currentCall - wait for button click
        // this.currentCall = null;
    }

    // Handle "New Lead" button click
    async handleNewLead() {
        ATS.logger.info('New Lead button clicked');
        
        try {
            // Prepare contact data from caller info
            const contactData = this.callerInfoService.prepareContactData(this.currentAnalysis);
            
            if (!contactData) {
                ATS.logger.error('No caller info available for contact creation');
                return;
            }
            
            // Create Contact in Salesforce
            const result = await this.salesforceContactService.createContact(contactData);
            
            ATS.logger.info('Contact creation result:', result);
            
            // Show notification
            ATS.sendMessage({
                type: ATS.Messages.SHOW_NOTIFICATION,
                payload: { 
                    message: 'Contact form opened - please review and save' 
                }
            });
            
        } catch (error) {
            ATS.logger.error('Error creating contact:', error);
        }
    }

    // Handle "Existing Lead" button click
    async handleExistingLead() {
        ATS.logger.info('Existing Lead button clicked');
        
        try {
            // Search Salesforce by phone
            const searchResult = await this.salesforceContactService.searchByPhone(this.currentCall.phoneNumber);
            
            if (searchResult) {
                ATS.logger.info('Search initiated for phone:', this.currentCall.phoneNumber);
                
                // Show notification to select record
                ATS.sendMessage({
                    type: ATS.Messages.SHOW_NOTIFICATION,
                    payload: { 
                        message: 'Please select the existing Lead/Contact in Salesforce' 
                    }
                });
                
                // Wait for record selection, then create log/task
                await this.waitForRecordSelection();
            }
            
        } catch (error) {
            ATS.logger.error('Error in existing lead flow:', error);
        }
    }

    // Wait for user to select a record in Salesforce, then create log/task
    async waitForRecordSelection() {
        ATS.logger.info('Waiting for user to select Salesforce record...');
        
        const checkInterval = setInterval(async () => {
            const currentRecord = await this.salesforceContactService.getCurrentRecord();
            
            if (currentRecord && currentRecord.recordId) {
                clearInterval(checkInterval);
                ATS.logger.info('Record selected:', currentRecord.recordId);
                
                // Execute the action (log call or task)
                if (this.currentAnalysis) {
                    await this.salesforceActionService.executeWithNavigation(
                        currentRecord.recordId, 
                        this.currentAnalysis
                    );
                    
                    ATS.sendMessage({
                        type: ATS.Messages.SHOW_NOTIFICATION,
                        payload: { 
                            message: '✓ Log/Task completed for selected record' 
                        }
                    });
                }
            }
        }, 2000);
        
        // Timeout after 30 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            ATS.logger.info('Record selection timeout');
        }, 30000);
    }

    // Manual search
    async searchSalesforce(phoneNumber) {
        await this.salesforceService.search(phoneNumber);
    }
}

window.CallMonitor = CallMonitor;
