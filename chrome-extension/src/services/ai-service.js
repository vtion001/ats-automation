/**
 * AI Service
 * Handles AI analysis of transcriptions using OpenRouter
 */

class AIService {
    constructor() {
        this.serverUrl = '';
    }

    // Initialize with config
    async init() {
        const config = await ATS.storage.get('aiServerUrl');
        this.serverUrl = config.aiServerUrl || ATS.config.aiServerUrl;
        ATS.logger.info('AI Service initialized with server:', this.serverUrl);
    }

    // Analyze transcription - ALWAYS uses OpenRouter server
    async analyze(transcription, phone, client) {
        if (!this.serverUrl) {
            ATS.logger.error('AI server URL not configured');
            throw new Error('AI server not configured');
        }

        const result = await this.analyzeWithServer(transcription, phone, client);
        
        // Determine Salesforce action based on AI analysis
        const sfAction = await this.determineSfActionWithAI(transcription, result, phone, client);
        
        return {
            ...result,
            ...sfAction
        };
    }

    // Analyze with remote AI server (OpenRouter)
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
            const error = `Server error: ${response.status}`;
            ATS.logger.error('AI analysis failed:', error);
            throw new Error(error);
        }

        const result = await response.json();
        ATS.logger.info('AI Analysis completed:', result.tags || []);
        
        return result;
    }

    // Determine Salesforce action using OpenRouter AI
    async determineSfActionWithAI(transcription, analysis, phone, client) {
        try {
            const response = await fetch(`${this.serverUrl}/api/determine-action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcription,
                    analysis,
                    phone,
                    client
                })
            });

            if (response.ok) {
                const result = await response.json();
                ATS.logger.info('SF Action determined:', result.action);
                return result;
            }
        } catch (e) {
            ATS.logger.warn('Failed to determine action via AI, using fallback:', e);
        }

        // Fallback to keyword-based (only if AI fails)
        return this.determineSfAction(transcription, analysis.tags || [], analysis);
    }

    // Determine which Salesforce action to use based on analysis
    determineSfAction(transcription, tags, analysis) {
        const text = (transcription || '').toLowerCase();
        
        let suggestedAction = 'log_call';
        let reason = 'General call notes';
        
        const tagsLower = (tags || []).map(t => t.toLowerCase());
        
        if (tagsLower.includes('follow-up') || tagsLower.includes('scheduling')) {
            suggestedAction = 'new_task';
            reason = 'Follow-up or scheduling required';
        } else if (tagsLower.includes('hot-lead')) {
            suggestedAction = 'new_task';
            reason = 'Hot lead - follow-up needed';
        } else if (tagsLower.includes('complaint') || tagsLower.includes('unqualified')) {
            suggestedAction = 'log_call';
            reason = 'Call logged for record';
        }
        
        const actionData = {
            action: suggestedAction,
            reason: reason,
            taskSubject: this.generateTaskSubject(tags, analysis),
            taskDueDate: this.generateTaskDueDate(tags),
            callSubject: this.generateCallSubject(analysis),
            callNotes: this.generateCallNotes(transcription, tags, analysis)
        };
        
        return actionData;
    }

    // Generate task subject based on tags
    generateTaskSubject(tags, analysis) {
        const tagsLower = (tags || []).map(t => t.toLowerCase());
        const summary = analysis?.summary || '';
        
        if (tagsLower.includes('scheduling') || tagsLower.includes('pricing')) {
            return `Follow up: ${summary || 'Inquiry call'}`;
        }
        if (tagsLower.includes('hot-lead')) {
            return `Hot Lead Follow-up: ${summary || 'Interested caller'}`;
        }
        if (tagsLower.includes('follow-up')) {
            return `Call Back: ${summary || 'Follow-up required'}`;
        }
        return `Call Note: ${summary || 'General call'}`;
    }

    // Generate task due date
    generateTaskDueDate(tags) {
        const tagsLower = (tags || []).map(t => t.toLowerCase());
        const today = new Date();
        
        if (tagsLower.includes('hot-lead')) {
            today.setDate(today.getDate() + 1);
        } else if (tagsLower.includes('scheduling')) {
            today.setDate(today.getDate() + 3);
        } else {
            today.setDate(today.getDate() + 7);
        }
        return today.toISOString().split('T')[0];
    }

    // Generate call subject
    generateCallSubject(analysis) {
        const sentiment = analysis?.sentiment || 'neutral';
        const disposition = analysis?.suggested_disposition || analysis?.suggestedDisposition || 'New';
        
        if (sentiment === 'positive') {
            return `Inbound Call - Interested`;
        }
        if (sentiment === 'negative') {
            return `Inbound Call - Not Interested`;
        }
        return `Inbound Call - ${disposition}`;
    }

    // Generate call notes
    generateCallNotes(transcription, tags, analysis) {
        const tagsLower = (tags || []).map(t => t.toLowerCase());
        let notes = '';
        
        if (analysis?.suggested_notes || analysis?.suggestedNotes) {
            notes += (analysis.suggested_notes || analysis.suggestedNotes) + '\n\n';
        }
        
        if (tagsLower.includes('hot-lead')) {
            notes += '**Action Required**: Hot lead - prioritize follow-up\n';
        }
        
        if (tagsLower.includes('follow-up')) {
            notes += '**Follow-up Required**: Caller requested callback\n';
        }
        
        if (tagsLower.includes('scheduling')) {
            notes += '**Scheduling Interest**: Caller wants to schedule appointment\n';
        }
        
        if (tagsLower.includes('pricing')) {
            notes += '**Pricing Inquiry**: Sent pricing information request\n';
        }
        
        if (transcription && transcription.length > 0) {
            notes += `\n**Call Summary**:\n${transcription.substring(0, 500)}`;
            if (transcription.length > 500) {
                notes += '...';
            }
        }
        
        return notes || 'Call recorded via ATS Automation';
    }
}

window.AIService = AIService;
