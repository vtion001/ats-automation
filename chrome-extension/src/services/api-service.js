/**
 * API Service - Handles all Azure AI Server communication
 */

const SERVER_URL = 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';

export const ApiService = {
    /**
     * Check server health
     */
    async checkHealth() {
        try {
            const resp = await fetch(`${SERVER_URL}/health`);
            return resp.ok;
        } catch {
            return false;
        }
    },

    /**
     * Get recent calls from CTM
     */
    async getCalls(limit = 50, hours = 24) {
        try {
            const resp = await fetch(`${SERVER_URL}/api/ctm/calls?limit=${limit}&hours=${hours}`);
            if (!resp.ok) return [];
            return await resp.json();
        } catch (error) {
            console.error('[API] Failed to fetch calls:', error);
            return [];
        }
    },

    /**
     * Find call by phone number
     */
    async findCallByPhone(phone) {
        const calls = await this.getCalls(50, 24);
        return calls.find(call => {
            const callPhone = (call.phone || '').replace(/\D/g, '');
            const searchPhone = phone.replace(/\D/g, '');
            return callPhone.includes(searchPhone) || searchPhone.includes(callPhone);
        }) || null;
    },

    /**
     * Get transcript for a call
     */
    async getTranscript(callId) {
        try {
            const resp = await fetch(`${SERVER_URL}/api/ctm/calls/${callId}/transcript`);
            if (!resp.ok) return null;
            return await resp.json();
        } catch (error) {
            console.error('[API] Failed to fetch transcript:', error);
            return null;
        }
    },

    /**
     * Analyze transcript with AI
     */
    async analyze(transcription, phone, client = 'flyland', callId = null) {
        try {
            const resp = await fetch(`${SERVER_URL}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcription,
                    phone,
                    client,
                    call_id: callId
                })
            });
            if (!resp.ok) throw new Error('Analysis failed');
            return await resp.json();
        } catch (error) {
            console.error('[API] Analysis error:', error);
            return null;
        }
    },

    /**
     * Poll for transcript until available
     */
    async pollForTranscript(callId, maxAttempts = 80, interval = 3000) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            const data = await this.getTranscript(callId);
            
            if (data && data.available && data.transcript && data.transcript.length > 10) {
                return data.transcript;
            }
            
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        return null;
    }
};

export default ApiService;
