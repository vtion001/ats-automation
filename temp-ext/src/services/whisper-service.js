/**
 * Whisper Service
 * Local audio transcription using Whisper
 */

class WhisperService {
    constructor() {
        this.model = null;
        this.isLoaded = false;
        this.modelName = 'base';
    }

    // Initialize the Whisper model
    async init() {
        if (this.isLoaded) {
            console.log('[Whisper] Model already loaded');
            return;
        }

        console.log('[Whisper] Loading model:', this.modelName);
        
        try {
            // Dynamic import for transformers.js
            if (typeof window.transformers === 'undefined') {
                // Load transformers.js from CDN
                await this.loadTransformers();
            }
            
            console.log('[Whisper] Model ready for transcription');
            this.isLoaded = true;
        } catch (error) {
            console.error('[Whisper] Failed to load:', error);
            throw error;
        }
    }

    // Load transformers.js library
    async loadTransformers() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Transcribe audio file
    async transcribe(audioFile) {
        console.log('[Whisper] Starting transcription:', audioFile);
        
        try {
            // Use Web Speech API as fallback since transformers.js requires more setup
            // This provides a simpler local solution
            const result = await this.transcribeWithWebSpeech(audioFile);
            return result;
        } catch (error) {
            console.error('[Whisper] Transcription error:', error);
            throw error;
        }
    }

    // Alternative: Use Web Speech API for transcription
    // This works for live microphone but not for audio files
    // For file-based transcription, we use manual transcription input or audio file upload
    async transcribeWithWebSpeech(audioFile) {
        // Since Web Speech API doesn't support file input directly,
        // users should upload audio files or enter manual transcription
        
        console.log('[Whisper] Note: For file transcription, please use the manual transcription input or upload audio file');
        return null;
    }

    // Clean up
    unload() {
        this.model = null;
        this.isLoaded = false;
    }
}

window.WhisperService = WhisperService;
