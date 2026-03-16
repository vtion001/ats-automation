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

    // Get available desktop capture sources via background script
    async getDesktopSources() {
        return new Promise((resolve, reject) => {
            if (typeof chrome === 'undefined' || !chrome.runtime) {
                reject(new Error('Chrome runtime not available'));
                return;
            }

            chrome.runtime.sendMessage({
                type: 'GET_DESKTOP_SOURCES',
                payload: {
                    types: ['tab', 'window'],
                    thumbnailSize: { width: 150, height: 150 }
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                if (response && response.success) {
                    resolve(response.sources);
                } else {
                    reject(new Error(response?.error || 'Failed to get desktop sources'));
                }
            });
        });
    }

    // Find CTM tab from available sources
    async findCTMTabSource() {
        const sources = await this.getDesktopSources();
        ATS.logger.info('[Audio] Found sources:', sources.map(s => s.name));
        
        // Look for CTM tab
        const ctmSource = sources.find(source => 
            source.name.toLowerCase().includes('calltrackingmetrics') ||
            source.name.toLowerCase().includes('ctm') ||
            source.name.toLowerCase().includes('call tracking') ||
            source.name.toLowerCase().includes('app.calltrackingmetrics')
        );

        if (ctmSource) {
            ATS.logger.info('[Audio] Found CTM source:', ctmSource.name);
            return ctmSource.id;
        }

        // Fallback: return first tab source
        const firstTab = sources.find(source => source.id.startsWith('tab:'));
        if (firstTab) {
            ATS.logger.warn('[Audio] CTM source not found, using first tab:', firstTab.name);
            return firstTab.id;
        }

        throw new Error('No CTM tab source found');
    }

    // Start recording CTM audio
    async startRecording(phoneNumber = null) {
        try {
            ATS.logger.info('[Audio] ★ Starting audio capture...');
            
            this.capturedPhoneNumber = phoneNumber;
            this.audioChunks = [];
            this.audioBlob = null;

            // Get CTM tab source
            const sourceId = await this.findCTMTabSource();
            ATS.logger.info('[Audio] Using source ID:', sourceId);
            
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

            ATS.logger.info('[Audio] ★ Got audio stream, tracks:', this.stream.getAudioTracks().length);

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
                    ATS.logger.debug('[Audio] Audio chunk received:', event.data.size);
                }
            };

            this.mediaRecorder.onstart = () => {
                this.isRecording = true;
                ATS.logger.info('[Audio] ★ Audio recording started');
            };

            this.mediaRecorder.onstop = () => {
                this.isRecording = false;
                ATS.logger.info('[Audio] ★ Audio recording stopped, chunks:', this.audioChunks.length);
            };

            this.mediaRecorder.onerror = (event) => {
                ATS.logger.error('[Audio] ★ MediaRecorder error:', event);
            };

            // Start recording with small interval to get data frequently
            this.mediaRecorder.start(1000); // Collect data every second
            
            return true;
        } catch (error) {
            ATS.logger.error('[Audio] ★ Failed to start audio capture:', error.message);
            ATS.logger.error('[Audio] ★ Error details:', error.stack);
            return false;
        }
    }

    // Stop recording and get audio blob
    async stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || !this.isRecording) {
                ATS.logger.warn('[Audio] No recording in progress');
                resolve(null);
                return;
            }

            ATS.logger.info('[Audio] ★ Stopping audio recording...');

            this.mediaRecorder.onstop = () => {
                // Create blob from chunks
                if (this.audioChunks.length > 0) {
                    this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    ATS.logger.info('[Audio] ★ Audio blob created, size:', this.audioBlob.size);
                } else {
                    this.audioBlob = null;
                    ATS.logger.warn('[Audio] No audio chunks recorded');
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
                ATS.logger.error('[Audio] Failed to convert audio to base64');
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

        ATS.logger.info('[Audio] ★ Sending audio to AI server for transcription...');

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
        ATS.logger.info('[Audio] ★ Transcription complete:', result);
        
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
