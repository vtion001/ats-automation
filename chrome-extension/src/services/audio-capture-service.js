/**
 * Audio Capture Service
 * Captures CTM call audio using Chrome Desktop Capture API
 */

class AudioCaptureService {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
        this.audioBlob = null;
        this.capturedPhoneNumber = null;
    }

    // Get available desktop capture sources
    async getDesktopSources() {
        return new Promise((resolve, reject) => {
            if (typeof chrome === 'undefined' || !chrome.desktopCapture) {
                reject(new Error('Desktop capture not available'));
                return;
            }

            chrome.desktopCapture.getSources({
                types: ['tab', 'window'],
                thumbnailSize: { width: 150, height: 150 }
            }, (sources) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(sources);
            });
        });
    }

    // Find CTM tab from available sources
    async findCTMTabSource() {
        const sources = await this.getDesktopSources();
        
        // Look for CTM tab
        const ctmSource = sources.find(source => 
            source.name.toLowerCase().includes('calltrackingmetrics') ||
            source.name.toLowerCase().includes('ctm') ||
            source.name.toLowerCase().includes('call tracking')
        );

        if (ctmSource) {
            ATS.logger.info('Found CTM source:', ctmSource.name);
            return ctmSource.id;
        }

        // Fallback: return first tab source
        const firstTab = sources.find(source => source.id.startsWith('tab:'));
        if (firstTab) {
            ATS.logger.warn('CTM source not found, using first tab:', firstTab.name);
            return firstTab.id;
        }

        throw new Error('No CTM tab source found');
    }

    // Start recording CTM audio
    async startRecording(phoneNumber = null) {
        try {
            ATS.logger.info('★ Starting audio capture...');
            
            this.capturedPhoneNumber = phoneNumber;
            this.audioChunks = [];
            this.audioBlob = null;

            // Get CTM tab source
            const sourceId = await this.findCTMTabSource();
            
            // Get audio stream from the tab
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId
                    }
                },
                video: false
            });

            // Create MediaRecorder for MP3-like format (WebM with Opus codec)
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus' 
                : 'audio/webm';

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType
            });

            // Collect audio chunks
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    ATS.logger.debug('Audio chunk received:', event.data.size);
                }
            };

            this.mediaRecorder.onstart = () => {
                this.isRecording = true;
                ATS.logger.info('★ Audio recording started');
            };

            this.mediaRecorder.onstop = () => {
                this.isRecording = false;
                ATS.logger.info('★ Audio recording stopped, chunks:', this.audioChunks.length);
            };

            this.mediaRecorder.onerror = (event) => {
                ATS.logger.error('★ MediaRecorder error:', event);
            };

            // Start recording with small interval to get data frequently
            this.mediaRecorder.start(1000); // Collect data every second
            
            return true;
        } catch (error) {
            ATS.logger.error('★ Failed to start audio capture:', error.message);
            return false;
        }
    }

    // Stop recording and get audio blob
    async stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || !this.isRecording) {
                ATS.logger.warn('No recording in progress');
                resolve(null);
                return;
            }

            ATS.logger.info('★ Stopping audio recording...');

            this.mediaRecorder.onstop = () => {
                // Create blob from chunks
                if (this.audioChunks.length > 0) {
                    this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    ATS.logger.info('★ Audio blob created, size:', this.audioBlob.size);
                } else {
                    this.audioBlob = null;
                    ATS.logger.warn('No audio chunks recorded');
                }

                // Stop all tracks
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }

                resolve(this.audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    // Get recorded audio blob
    getAudioBlob() {
        return this.audioBlob;
    }

    // Check if recording is active
    isRecordingActive() {
        return this.isRecording;
    }

    // Convert audio blob to base64 for API upload
    async getAudioAsBase64() {
        if (!this.audioBlob) {
            return null;
        }

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = () => {
                ATS.logger.error('Failed to convert audio to base64');
                resolve(null);
            };
            reader.readAsDataURL(this.audioBlob);
        });
    }

    // Upload audio to AI server for transcription
    async transcribeWithAI(serverUrl, phone, client) {
        const audioBase64 = await this.getAudioAsBase64();
        
        if (!audioBase64) {
            throw new Error('No audio recorded');
        }

        ATS.logger.info('★ Sending audio to AI server for transcription...');

        const response = await fetch(`${serverUrl}/api/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                audio: audioBase64,
                phone: phone,
                client: client,
                format: 'webm'
            })
        });

        if (!response.ok) {
            throw new Error(`Transcription failed: ${response.status}`);
        }

        const result = await response.json();
        ATS.logger.info('★ Transcription complete:', result);
        
        return result;
    }

    // Reset service state
    reset() {
        this.audioChunks = [];
        this.audioBlob = null;
        this.capturedPhoneNumber = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
}

// Export for use
window.AudioCaptureService = AudioCaptureService;
