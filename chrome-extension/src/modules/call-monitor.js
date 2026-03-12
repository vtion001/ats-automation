/**
 * Call Monitor Module
 * Main module that orchestrates CTM monitoring, transcription, and Salesforce search
 */

class CallMonitor {
    constructor() {
        this.ctmService = new CTMService();
        this.salesforceService = new SalesforceService();
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

    // Handle call end
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
            
            // Send analysis result
            ATS.sendMessage({
                type: ATS.Messages.AI_ANALYSIS_RESULT,
                payload: analysis
            });
            
            ATS.logger.info('AI Analysis:', analysis);
        }
        
        this.currentCall = null;
    }

    // Manual search
    async searchSalesforce(phoneNumber) {
        await this.salesforceService.search(phoneNumber);
    }
}

window.CallMonitor = CallMonitor;
