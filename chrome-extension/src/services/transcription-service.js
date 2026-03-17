/**
 * Transcription Service - Enhanced
 * Handles call transcription using Web Speech API with better error handling
 */

class TranscriptionService {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.transcript = '';
        this.onTranscriptUpdate = null;
        this.onError = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    isSupported() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    init() {
        if (!this.isSupported()) {
            ATS.logger.warn('Speech recognition not supported in this browser');
            this.notifyError('not-supported');
            return false;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            this.retryCount = 0; // Reset on any result
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    if (transcript.trim()) {
                        this.transcript += transcript + ' ';
                        ATS.logger.info('★ Final transcript received:', transcript.substring(0, 50));
                        
                        if (this.onTranscriptUpdate) {
                            this.onTranscriptUpdate(this.transcript, true);
                        }
                    }
                } else {
                    interimTranscript += transcript;
                }
            }
        };

        this.recognition.onerror = (event) => {
            ATS.logger.error('★ Speech recognition error:', event.error);
            
            // Handle specific errors
            switch (event.error) {
                case 'no-speech':
                    ATS.logger.warn('No speech detected - this is normal if caller is silent');
                    // Don't treat as critical error - just log
                    break;
                case 'audio-capture':
                    this.notifyError('microphone-denied');
                    ATS.logger.error('Microphone not available or denied');
                    break;
                case 'not-allowed':
                    this.notifyError('permission-denied');
                    ATS.logger.error('Microphone permission denied');
                    break;
                case 'network':
                    this.notifyError('network-error');
                    ATS.logger.error('Network error');
                    break;
                default:
                    ATS.logger.error('Speech recognition error:', event.error);
            }
            
            if (this.onError) {
                this.onError(event.error);
            }
        };

        this.recognition.onend = () => {
            this.isRecording = false;
            ATS.logger.info('★ Speech recognition ended, transcript length:', this.transcript.length);
            
            // Auto-restart if ended unexpectedly but we have retry count
            if (this.retryCount < this.maxRetries && this.transcript === '') {
                this.retryCount++;
                ATS.logger.info('★ Retrying transcription, attempt:', this.retryCount);
                setTimeout(() => this.start(), 1000);
            }
        };

        this.recognition.onstart = () => {
            ATS.logger.info('★ Speech recognition started');
            this.retryCount = 0;
        };

        ATS.logger.info('Transcription service initialized');
        return true;
    }

    notifyError(errorType) {
        // Send message to popup/background
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
                type: 'TRANSCRIPTION_ERROR',
                payload: { error: errorType }
            });
        }
    }

    start() {
        ATS.logger.info('★ Transcription start() called');
        
        if (!this.recognition) {
            ATS.logger.info('★ Recognition not initialized, initializing now...');
            this.init();
        }
        
        if (!this.recognition) {
            ATS.logger.error('Cannot start transcription - not initialized');
            return false;
        }

        try {
            this.transcript = '';
            this.recognition.start();
            this.isRecording = true;
            ATS.logger.info('★ Transcription start() successful');
            return true;
        } catch (e) {
            ATS.logger.error('★ Error starting transcription:', e.message);
            return false;
        }
    }

    stop() {
        if (!this.recognition || !this.isRecording) {
            return;
        }

        try {
            this.recognition.stop();
            this.isRecording = false;
            ATS.logger.info('Transcription stopped');
        } catch (e) {
            ATS.logger.error('Error stopping transcription:', e);
        }
    }

    getTranscript() {
        return this.transcript;
    }

    generateMarkdown(callData) {
        const markdown = `# Call Transcription - ${new Date().toISOString()}

## Call Info
- **Phone:** ${callData.phoneNumber || 'Unknown'}
- **Caller Name:** ${callData.callerName || 'Unknown'}
- **Status:** ${callData.status || 'Unknown'}
- **Start Time:** ${callData.startTime || 'Unknown'}
- **End Time:** ${new Date().toISOString()}

## Transcription

${this.transcript || 'No transcription available'}

## Notes

---

*Generated by ATS Automation*
`;
        return markdown;
    }

    saveToMarkdown(callData) {
        const markdown = this.generateMarkdown(callData);
        
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `call_${Date.now()}_${callData.phoneNumber || 'unknown'}.md`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        ATS.logger.info('Transcription saved to markdown');
        
        return markdown;
    }
}

window.TranscriptionService = TranscriptionService;
