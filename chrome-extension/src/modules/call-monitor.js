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
        
        this.currentCall = null;
        this.currentAnalysis = null;
        this.isMonitoring = false;
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
        
        // Initialize caller info from CTM
        await this.callerInfoService.initFromCTM(this.currentCall);
        
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

    // Handle call end - BUTTON TRIGGER FLOW (not auto-run)
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
