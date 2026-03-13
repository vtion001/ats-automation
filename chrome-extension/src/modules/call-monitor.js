/**
 * Call Monitor Module
 * Main module that orchestrates CTM monitoring, transcription, and Salesforce search
 */

class CallMonitor {
    constructor() {
        this.ctmService = new CTMService();
        this.salesforceService = new SalesforceService();
        this.salesforceActionsService = new SalesforceActionsService();
        this.transcriptionService = new TranscriptionService();
        this.aiService = new AIService();
        
        this.currentCall = null;
        this.isMonitoring = false;
    }

    // Initialize all services
    async init() {
        ATS.logger.info('Initializing Call Monitor...');
        
        await ATS.init();
        await this.salesforceService.init();
        await this.salesforceActionsService.init();
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
        ATS.logger.info('Call monitoring stopped');
    }

    // Handle call events
    async handleCallEvent(event) {
        ATS.logger.info('Call event:', event.type, event);
        
        if (event.type === 'call_started') {
            await this.handleCallStart(event);
        } else if (event.type === 'call_ended') {
            await this.handleCallEnd();
        }
    }

    // Handle call start
    async handleCallStart(event) {
        this.currentCall = {
            ...event,
            startTime: new Date().toISOString()
        };
        
        ATS.logger.info('Call started:', this.currentCall);
        
        // Notify background script
        ATS.sendMessage({
            type: ATS.Messages.CTM_CALL_EVENT,
            payload: { ...this.currentCall, event: 'call_started' }
        });
        
        // Auto-search Salesforce
        if (ATS.config.autoSearchSF && this.currentCall.phoneNumber) {
            await this.salesforceService.search(this.currentCall.phoneNumber);
        }
        
        // Start transcription
        if (ATS.config.transcriptionEnabled) {
            this.transcriptionService.start();
        }
    }

    // Handle call end - FULL AUTOMATED FLOW
    async handleCallEnd() {
        if (!this.currentCall) return;
        
        this.currentCall.endTime = new Date().toISOString();
        
        ATS.logger.info('Call ended:', this.currentCall);
        
        // Stop transcription
        this.transcriptionService.stop();
        
        // Save transcription
        let markdown = '';
        if (ATS.config.saveMarkdown) {
            markdown = this.transcriptionService.saveToMarkdown(this.currentCall);
        }
        
        // Notify background
        ATS.sendMessage({
            type: ATS.Messages.CTM_CALL_EVENT,
            payload: { ...this.currentCall, event: 'call_ended' }
        });

        // Analyze with AI
        if (ATS.config.aiAnalysisEnabled) {
            const transcript = this.transcriptionService.getTranscript();
            const analysis = await this.aiService.analyze(
                transcript,
                this.currentCall.phoneNumber,
                ATS.config.activeClient
            );
            
            // Store analysis with call data
            this.currentCall.analysis = analysis;
            
            ATS.logger.info('AI Analysis:', analysis);
            
            // Show analysis in overlay
            ATS.sendMessage({
                type: ATS.Messages.AI_ANALYSIS_RESULT,
                payload: {
                    ...analysis,
                    callerName: this.currentCall.callerName,
                    phone: this.currentCall.phoneNumber
                }
            });

            // AUTO-EXECUTE: Log to Salesforce based on AI decision
            await this.autoLogToSalesforce(analysis);
        }
        
        this.currentCall = null;
    }

    // Automatically log to Salesforce based on AI analysis
    async autoLogToSalesforce(analysis) {
        ATS.logger.info('Auto-logging to Salesforce with action:', analysis.action);
        
        try {
            // Get current Salesforce record (if user is on a Lead/Contact page)
            const currentRecord = await this.salesforceActionsService.getCurrentRecord();
            
            let recordId = null;
            
            if (currentRecord && currentRecord.recordId) {
                recordId = currentRecord.recordId;
                ATS.logger.info('Found current SF record:', recordId, currentRecord.objectType);
            } else {
                // Try to find record by phone number
                const searchResult = await this.salesforceActionsService.findRecordByPhone(this.currentCall.phoneNumber);
                
                if (searchResult) {
                    ATS.logger.info('Search initiated in Salesforce for phone:', this.currentCall.phoneNumber);
                    // Show notification asking user to select the record
                    ATS.sendMessage({
                        type: ATS.Messages.SHOW_NOTIFICATION,
                        payload: { 
                            message: 'Please select the correct Lead/Contact record in Salesforce, then the action will be auto-completed.' 
                        }
                    });
                    
                    // Set up listener for record selection
                    await this.waitForRecordSelection(analysis);
                    return;
                }
            }

            if (recordId) {
                // Execute the AI-determined action
                const actionResult = await this.salesforceActionsService.executeSfAction(recordId, analysis, this.currentCall.phoneNumber);
                
                ATS.logger.info('Auto-log result:', actionResult);
                
                // Show result notification
                const actionLabel = analysis.action === 'new_task' ? 'New Task' : 'Log a Call';
                ATS.sendMessage({
                    type: ATS.Messages.SHOW_NOTIFICATION,
                    payload: { 
                        message: `Auto-${actionLabel}: ${analysis.reason}` 
                    }
                });
            } else {
                ATS.logger.warn('No Salesforce record found to log to');
            }
        } catch (error) {
            ATS.logger.error('Error in auto-log to Salesforce:', error);
        }
    }

    // Wait for user to select a record in Salesforce
    async waitForRecordSelection(analysis) {
        ATS.logger.info('Waiting for user to select Salesforce record...');
        
        // Set up a one-time listener for SF record data
        const checkInterval = setInterval(async () => {
            const currentRecord = await this.salesforceActionsService.getCurrentRecord();
            
            if (currentRecord && currentRecord.recordId) {
                clearInterval(checkInterval);
                ATS.logger.info('Record selected:', currentRecord.recordId);
                
                // Execute the action
                await this.salesforceActionsService.executeSfAction(currentRecord.recordId, analysis, this.currentCall.phoneNumber);
                
                const actionLabel = analysis.action === 'new_task' ? 'New Task' : 'Log a Call';
                ATS.sendMessage({
                    type: ATS.Messages.SHOW_NOTIFICATION,
                    payload: { 
                        message: `✓ Auto-${actionLabel} completed for selected record` 
                    }
                });
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
