/**
 * AI Service
 * Handles AI analysis of transcriptions
 */

class AIService {
    constructor() {
        this.serverUrl = '';
        this.keywords = {
            hot_lead: ['interested', 'want', 'need', 'looking for', 'please send', 'call back', 'definitely', 'sounds good', 'great'],
            unqualified: ['not interested', 'no thank', 'remove', 'don't call', 'wrong number', 'not looking'],
            follow_up: ['call back', 'later', 'maybe', 'think about', 'check with', 'discuss', 'pending'],
            pricing: ['pricing', 'cost', 'price', 'how much', 'expensive', 'discount', 'deal', 'quote'],
            scheduling: ['appointment', 'schedule', 'book', 'meeting', 'time', 'date', 'when'],
            information: ['information', 'details', 'tell me', 'explain', 'what is', 'how does'],
            complaint: ['problem', 'issue', 'terrible', 'worst', 'angry', 'frustrated', 'complaint'],
            billing: ['bill', 'invoice', 'payment', 'charge', 'refund', 'insurance', 'coverage']
        };
    }

    // Initialize with config
    async init() {
        const config = await ATS.storage.get('aiServerUrl');
        this.serverUrl = config.aiServerUrl || ATS.config.aiServerUrl;
    }

    // Analyze transcription
    async analyze(transcription, phone, client) {
        // Try AI server first
        if (this.serverUrl) {
            try {
                const result = await this.analyzeWithServer(transcription, phone, client);
                if (result) return result;
            } catch (e) {
                ATS.logger.warn('AI server not available, using local analysis');
            }
        }
        
        // Fall back to local analysis
        return this.analyzeLocal(transcription, phone);
    }

    // Analyze with remote AI server
    async analyzeWithServer(transcription, phone, client) {
        const response = await fetch(`${this.serverUrl}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcription,
                phone,
                client
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        return await response.json();
    }

    // Local keyword-based analysis
    analyzeLocal(transcription, phone) {
        const text = (transcription || '').toLowerCase();
        
        const tags = [];
        let sentiment = 'neutral';
        const summaryParts = [];
        let followUpRequired = false;
        let suggestedDisposition = 'New';

        // Check keywords
        for (const [tag, keywords] of Object.entries(this.keywords)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    tags.push(tag.replace('_', '-'));
                    break;
                }
            }
        }

        // Determine sentiment and disposition
        if (tags.includes('hot-lead')) {
            sentiment = 'positive';
            suggestedDisposition = 'Qualified';
            summaryParts.push('Caller expressed interest');
        }
        
        if (tags.includes('unqualified')) {
            sentiment = 'negative';
            suggestedDisposition = 'Unqualified';
            summaryParts.push('Caller not interested');
        }

        if (tags.includes('follow-up')) {
            followUpRequired = true;
            summaryParts.push('Follow-up required');
        }

        if (tags.includes('pricing')) {
            summaryParts.push('Inquiry about pricing');
        }

        if (tags.includes('scheduling')) {
            summaryParts.push('Wants to schedule');
        }

        if (tags.includes('complaint')) {
            sentiment = 'negative';
            summaryParts.push('Has concerns');
        }

        // Check call length
        const wordCount = text.split(/\s+/).length;
        if (wordCount > 300) {
            tags.push('long-call');
            summaryParts.push(`Extended call (${wordCount} words)`);
        }

        return {
            phone,
            tags: [...new Set(tags)], // Remove duplicates
            sentiment,
            summary: summaryParts.join('. ') || 'Call recorded',
            suggestedDisposition,
            suggestedNotes: this.generateNotes(tags, text, phone),
            followUpRequired,
            timestamp: new Date().toISOString()
        };
    }

    // Generate notes from tags
    generateNotes(tags, text, phone) {
        const lines = [];
        
        if (phone) {
            lines.push(`Caller Phone: ${phone}`);
        }

        if (tags.includes('hot-lead')) lines.push('- Caller expressed interest in services');
        if (tags.includes('pricing')) lines.push('- Requested pricing information');
        if (tags.includes('scheduling')) lines.push('- Interested in scheduling appointment');
        if (tags.includes('follow-up')) lines.push('- Requires follow-up call');
        if (tags.includes('complaint')) lines.push('- Has concerns that need attention');

        const firstSentence = text.split('.')[0];
        if (firstSentence) {
            lines.push(`- Initial inquiry: ${firstSentence.slice(0, 100)}`);
        }

        return lines.join('\n') || 'Standard call - no special notes';
    }
}

window.AIService = AIService;
