/**
 * CTM Live Transcription - Real-time Speech-to-Text during calls
 * 
 * Uses tab audio capture to capture CTM softphone audio,
 * then sends to Whisper API for real-time transcription.
 * 
 * Architecture:
 * 1. Detect incoming/active call
 * 2. Start tab audio capture
 * 3. Send audio chunks to server
 * 4. Server transcribes via Whisper
 * 5. Return partial transcripts
 * 6. Update overlay with live transcript and analysis
 */

(function() {
    'use strict';

    const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
    const TRANSCRIBE_INTERVAL = 3000; // Send audio chunks every 3 seconds
    const MIN_AUDIO_DURATION = 1000; // Minimum audio before sending

    let mediaRecorder = null;
    let audioChunks = [];
    let transcribeTimer = null;
    let isCapturing = false;
    let callPhone = null;
    let transcriptHistory = [];

    /**
     * Start audio capture from CTM tab
     */
    async function startAudioCapture() {
        if (isCapturing) {
            console.log('[Live-Transcribe] Already capturing');
            return;
        }

        try {
            console.log('[Live-Transcribe] Starting tab audio capture...');
            
            // Get the current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                console.error('[Live-Transcribe] No active tab found');
                return;
            }

            // Request tab capture - this will prompt user to select CTM tab
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: 'tab',
                        chromeMediaSourceId: tab.id
                    }
                }
            });

            console.log('[Live-Transcribe] Tab audio stream obtained');

            // Create MediaRecorder
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                console.log('[Live-Transcribe] Recording stopped, processing...');
                await processAudioChunks();
            };

            // Start recording
            mediaRecorder.start(1000); // Collect data every second
            isCapturing = true;

            // Set up periodic transcription
            transcribeTimer = setInterval(async () => {
                if (audioChunks.length > 0 && isCapturing) {
                    await sendForTranscription();
                }
            }, TRANSCRIBE_INTERVAL);

            console.log('[Live-Transcribe] Audio capture started successfully');

        } catch (error) {
            console.error('[Live-Transcribe] Failed to start audio capture:', error);
            isCapturing = false;
        }
    }

    /**
     * Stop audio capture
     */
    function stopAudioCapture() {
        console.log('[Live-Transcribe] Stopping audio capture...');

        if (transcribeTimer) {
            clearInterval(transcribeTimer);
            transcribeTimer = null;
        }

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }

        // Stop all tracks
        if (mediaRecorder && mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }

        isCapturing = false;
        console.log('[Live-Transcribe] Audio capture stopped');
    }

    /**
     * Process accumulated audio chunks
     */
    async function processAudioChunks() {
        if (audioChunks.length === 0) return;

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = [];

        if (audioBlob.size < MIN_AUDIO_DURATION * 16000) { // rough estimate
            console.log('[Live-Transcribe] Audio too short, skipping');
            return;
        }

        await sendAudioForTranscription(audioBlob);
    }

    /**
     * Send audio to server for transcription
     */
    async function sendAudioForTranscription(audioBlob) {
        try {
            console.log('[Live-Transcribe] Sending audio for transcription, size:', audioBlob.size);

            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('phone', callPhone || 'unknown');
            formData.append('client', 'flyland');
            formData.append('partial', 'true'); // Indicates partial/live transcription

            const response = await fetch(`${SERVER_URL}/api/transcribe`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('[Live-Transcribe] Transcription result:', result);

            if (result.transcription) {
                handlePartialTranscript(result.transcription, result.phone);
            }

            return result;

        } catch (error) {
            console.error('[Live-Transcribe] Transcription failed:', error);
            return null;
        }
    }

    /**
     * Send for transcription (periodic)
     */
    async function sendForTranscription() {
        if (audioChunks.length === 0) return;

        // Clone chunks for sending while keeping for next iteration
        const chunksToSend = [...audioChunks];
        audioChunks = [];

        const audioBlob = new Blob(chunksToSend, { type: 'audio/webm' });
        
        if (audioBlob.size > 5000) { // Only send if there's meaningful audio
            await sendAudioForTranscription(audioBlob);
        }
    }

    /**
     * Handle partial transcript update
     */
    function handlePartialTranscript(transcript, phone) {
        if (!transcript) return;

        // Add to history
        transcriptHistory.push({
            text: transcript,
            timestamp: Date.now()
        });

        // Keep only last 20 entries
        if (transcriptHistory.length > 20) {
            transcriptHistory = transcriptHistory.slice(-20);
        }

        // Update the overlay with live transcript
        updateOverlayLive(transcriptHistory.map(t => t.text).join(' '), phone);

        // Also run live analysis periodically (every 5 transcripts)
        if (transcriptHistory.length % 5 === 0) {
            runLiveAnalysis(transcriptHistory.map(t => t.text).join(' '), phone);
        }
    }

    /**
     * Run live analysis on transcript
     */
    async function runLiveAnalysis(transcript, phone) {
        try {
            const response = await fetch(`${SERVER_URL}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcription: transcript,
                    phone: phone,
                    client: 'flyland'
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const analysis = await response.json();
            console.log('[Live-Transcribe] Live analysis result:', analysis);

            // Update overlay with analysis
            updateOverlayAnalysis(analysis);

            return analysis;

        } catch (error) {
            console.error('[Live-Transcribe] Live analysis failed:', error);
            return null;
        }
    }

    /**
     * Update overlay with live transcript
     */
    function updateOverlayLive(fullTranscript, phone) {
        let overlay = document.getElementById('ats-automation-overlay');
        
        if (!overlay) {
            overlay = createOverlay(phone);
        }

        // Update transcript section
        const transcriptEl = overlay.querySelector('.ats-live-transcript');
        if (transcriptEl) {
            transcriptEl.textContent = fullTranscript;
            // Auto-scroll to bottom
            transcriptEl.scrollTop = transcriptEl.scrollHeight;
        }
    }

    /**
     * Update overlay with analysis results
     */
    function updateOverlayAnalysis(analysis) {
        const overlay = document.getElementById('ats-automation-overlay');
        if (!overlay) return;

        const score = analysis.qualification_score || 0;
        let scoreClass = 'cold';
        if (score >= 70) scoreClass = 'hot';
        else if (score >= 40) scoreClass = 'warm';

        // Update score badge
        const scoreBadge = overlay.querySelector('.ats-score-badge');
        if (scoreBadge) {
            scoreBadge.textContent = score;
            scoreBadge.className = `ats-score-badge ${scoreClass}`;
        }

        // Update status label
        const statusLabel = overlay.querySelector('.ats-status-label');
        if (statusLabel) {
            let label = 'Cold Lead';
            if (score >= 70) label = 'Hot Lead';
            else if (score >= 40) label = 'Warm Lead';
            statusLabel.textContent = label;
            statusLabel.className = `ats-status-label ${scoreClass}`;
        }

        // Update tags
        const tagsEl = overlay.querySelector('.ats-info-value');
        if (tagsEl) {
            tagsEl.textContent = (analysis.tags || []).join(', ');
        }

        // Update summary
        const summaryEl = overlay.querySelector('.ats-salesforce-notes');
        if (summaryEl) {
            summaryEl.textContent = analysis.summary || 'Analyzing...';
        }

        // Update recommendation
        const recEl = overlay.querySelector('.ats-recommendation');
        if (recEl) {
            recEl.textContent = `Disposition: ${analysis.suggested_disposition || 'New'} | Sentiment: ${analysis.sentiment || 'neutral'}`;
        }

        // Show transfer guidance if available
        if (analysis.intent || analysis.call_type) {
            updateTransferGuidance(analysis);
        }
    }

    /**
     * Update transfer guidance based on analysis
     */
    function updateTransferGuidance(analysis) {
        const overlay = document.getElementById('ats-automation-overlay');
        if (!overlay) return;

        let guidanceEl = overlay.querySelector('.ats-transfer-guidance');
        if (!guidanceEl) {
            guidanceEl = document.createElement('div');
            guidanceEl.className = 'ats-transfer-guidance';
            guidanceEl.innerHTML = `
                <div class="ats-card" style="background: #fff3cd; border-color: #ffc107;">
                    <div class="ats-card-header" style="background: #ffc107;">
                        <div class="ats-card-title">Transfer Guidance</div>
                    </div>
                    <div class="ats-card-body">
                        <div class="ats-guidance-text"></div>
                    </div>
                </div>
            `;
            overlay.querySelector('.ats-overlay-content').appendChild(guidanceEl);
        }

        const intent = analysis.intent || analysis.call_type || '';
        const recommendation = analysis.suggested_disposition || '';
        
        let guidance = '';
        
        if (intent.includes('sales') || intent.includes('inquiry')) {
            guidance = 'Transfer to Sales department';
        } else if (intent.includes('support') || intent.includes('help')) {
            guidance = 'Transfer to Support department';
        } else if (intent.includes('billing') || intent.includes('payment')) {
            guidance = 'Transfer to Billing department';
        } else if (recommendation.toLowerCase().includes('callback')) {
            guidance = 'Schedule callback - leave voicemail';
        } else if (score >= 70) {
            guidance = 'High-value lead - prioritize transfer to senior agent';
        } else {
            guidance = 'Standard routing - follow normal transfer flow';
        }

        guidanceEl.querySelector('.ats-guidance-text').textContent = guidance;
    }

    /**
     * Create the analysis overlay
     */
    function createOverlay(phone) {
        const existing = document.getElementById('ats-automation-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'ats-automation-overlay';
        overlay.innerHTML = `
            <div class="ats-overlay-header">
                <span class="ats-title">ATS Live Analysis</span>
                <div class="ats-live-indicator">
                    <span class="ats-live-dot"></span>
                    <span>LIVE</span>
                </div>
                <button class="ats-close-btn">×</button>
            </div>
            <div class="ats-overlay-content">
                <div class="ats-header-section">
                    <div class="ats-header-info">
                        <div class="ats-phone-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
                            </svg>
                        </div>
                        <span class="ats-phone-number">${phone || 'Unknown'}</span>
                    </div>
                    <div class="ats-status-row">
                        <span class="ats-score-badge cold">--</span>
                        <span class="ats-status-label cold">Analyzing...</span>
                    </div>
                </div>

                <div class="ats-card">
                    <div class="ats-card-header">
                        <div class="ats-card-title">Live Transcript</div>
                        <div class="ats-card-toggle">▼</div>
                    </div>
                    <div class="ats-card-body">
                        <div class="ats-live-transcript" style="max-height: 150px; overflow-y: auto; font-size: 13px; line-height: 1.5; color: #333;">
                            Waiting for audio...
                        </div>
                    </div>
                </div>

                <div class="ats-card">
                    <div class="ats-card-header">
                        <div class="ats-card-title">Key Details</div>
                        <div class="ats-card-toggle">▼</div>
                    </div>
                    <div class="ats-card-body">
                        <div class="ats-info-list">
                            <div class="ats-info-item">
                                <span class="ats-info-label">Tags:</span>
                                <span class="ats-info-value">Analyzing...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="ats-card">
                    <div class="ats-card-header">
                        <div class="ats-card-title">Summary</div>
                        <div class="ats-card-toggle">▼</div>
                    </div>
                    <div class="ats-card-body">
                        <div class="ats-salesforce-notes">Analyzing conversation...</div>
                    </div>
                </div>

                <div class="ats-recommendation">
                    Disposition: -- | Sentiment: --
                </div>
            </div>
        `;

        // Add styles if not already present
        if (!document.getElementById('ats-live-overlay-styles')) {
            const styles = document.createElement('style');
            styles.id = 'ats-live-overlay-styles';
            styles.textContent = `
                #ats-automation-overlay {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 400px;
                    max-height: 90vh;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.25);
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    overflow: hidden;
                }
                .ats-overlay-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .ats-title { font-weight: 600; font-size: 14px; }
                .ats-live-indicator {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    font-weight: 600;
                }
                .ats-live-dot {
                    width: 8px;
                    height: 8px;
                    background: #e74c3c;
                    border-radius: 50%;
                    animation: pulse 1s infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .ats-close-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                }
                .ats-overlay-content { padding: 12px; max-height: calc(90vh - 50px); overflow-y: auto; }
                .ats-header-section { text-align: center; margin-bottom: 12px; }
                .ats-phone-icon { width: 36px; height: 36px; margin: 0 auto 6px; }
                .ats-phone-icon svg { width: 100%; height: 100%; fill: #667eea; }
                .ats-phone-number { font-size: 16px; font-weight: 600; display: block; }
                .ats-status-row { display: flex; justify-content: center; gap: 12px; margin-top: 8px; }
                .ats-score-badge {
                    width: 40px; height: 40px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 14px; font-weight: 700; color: white;
                }
                .ats-score-badge.hot { background: #e74c3c; }
                .ats-score-badge.warm { background: #f39c12; }
                .ats-score-badge.cold { background: #3498db; }
                .ats-status-label { font-size: 12px; padding-top: 12px; }
                .ats-status-label.hot { color: #e74c3c; }
                .ats-status-label.warm { color: #f39c12; }
                .ats-status-label.cold { color: #3498db; }
                .ats-card { border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; overflow: hidden; }
                .ats-card-header { 
                    padding: 10px 12px; background: #f8f9fa; cursor: pointer; 
                    display: flex; justify-content: space-between; align-items: center;
                }
                .ats-card-title { font-weight: 600; font-size: 13px; }
                .ats-card-toggle { font-size: 10px; color: #999; }
                .ats-card-body { padding: 10px 12px; }
                .ats-info-list { display: flex; flex-direction: column; gap: 6px; }
                .ats-info-item { display: flex; gap: 6px; font-size: 12px; }
                .ats-info-label { font-weight: 500; color: #666; }
                .ats-info-value { color: #333; }
                .ats-salesforce-notes { font-size: 12px; line-height: 1.5; color: #333; }
                .ats-recommendation {
                    text-align: center; padding: 10px; background: #f8f9fa;
                    border-radius: 8px; font-size: 12px; margin-bottom: 10px;
                }
                .ats-live-transcript {
                    background: #f8f9fa;
                    border-radius: 4px;
                    padding: 8px;
                    font-family: monospace;
                    white-space: pre-wrap;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(overlay);

        // Close button handler
        overlay.querySelector('.ats-close-btn').addEventListener('click', () => {
            overlay.remove();
            stopAudioCapture();
        });

        return overlay;
    }

    /**
     * Detect call state changes and start/stop capture accordingly
     */
    function setupCallStateMonitoring() {
        // Check for call state periodically
        setInterval(() => {
            const callState = getCallState();
            
            if (callState === 'active' && !isCapturing) {
                console.log('[Live-Transcribe] Call active detected, starting capture');
                const phone = extractPhoneNumber();
                callPhone = phone;
                transcriptHistory = [];
                startAudioCapture();
                createOverlay(phone);
            } else if (callState !== 'active' && isCapturing) {
                console.log('[Live-Transcribe] Call ended detected, stopping capture');
                stopAudioCapture();
            }
        }, 1000);
    }

    /**
     * Get current call state from CTM softphone
     */
    function getCallState() {
        // Check CTM softphone elements
        const ringing = document.querySelector('.banner[data-type="answer"]');
        const connecting = document.querySelector('.agent-status-connecting');
        const inCall = document.querySelector('.agent-status-outbound');
        const wrapup = document.querySelector('.agent-status-wrapup');

        if (ringing && ringing.style.display !== 'none') return 'ringing';
        if (connecting) return 'connecting';
        if (inCall) return 'active';
        if (wrapup) return 'wrapup';
        
        return 'idle';
    }

    /**
     * Extract phone number from CTM softphone
     */
    function extractPhoneNumber() {
        // Try various sources
        const incomingBanner = document.querySelector('.banner[data-type="answer"] .info-body');
        if (incomingBanner) {
            const text = incomingBanner.textContent || '';
            const match = text.match(/\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
            if (match) return match[0].replace(/[^\d]/g, '');
        }

        const phoneInput = document.querySelector('.phone-number');
        if (phoneInput) {
            return phoneInput.textContent.replace(/[^\d]/g, '') || null;
        }

        return null;
    }

    /**
     * Initialize live transcription
     */
    function init() {
        console.log('[Live-Transcribe] Initializing CTM Live Transcription...');
        
        // Set up call state monitoring
        setupCallStateMonitoring();

        // Expose for debugging
        window.ctmLiveTranscribe = {
            start: startAudioCapture,
            stop: stopAudioCapture,
            getState: getCallState,
            getHistory: () => transcriptHistory
        };

        console.log('[Live-Transcribe] Initialization complete');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();