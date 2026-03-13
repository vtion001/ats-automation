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
        
        this.sfActionKeywords = {
            log_call: [
                'just calling', 'checking in', 'quick update', 'follow up on', 'wanted to let you know',
                'inform', 'update', 'notify', '告知', '更新', '進捗', '報告'
            ],
            new_task: [
                'call back', 'schedule', 'appointment', 'meeting', 'remind me', 'to do', 'task',
                'follow up', 'get back to', 'will call', 'need to call', 'action item',
                '折返し', '予定', 'タスク', 'リマインダー', '次回'
            ]
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

    // Determine which Salesforce action to use based on transcription
    determineSfAction(transcription, tags, analysis) {
        const text = (transcription || '').toLowerCase();
        
        // Default to log_call
        let suggestedAction = 'log_call';
        let reason = 'General call notes';
        
        // Check for task-related keywords
        let taskKeywordsFound = 0;
        for (const keyword of this.sfActionKeywords.new_task) {
            if (text.includes(keyword.toLowerCase())) {
                taskKeywordsFound++;
            }
        }
        
        // Check for call logging keywords
        let callKeywordsFound = 0;
        for (const keyword of this.sfActionKeywords.log_call) {
            if (text.includes(keyword.toLowerCase())) {
                callKeywordsFound++;
            }
        }
        
        // Decision logic based on keywords and tags
        if (tags.includes('follow-up') || tags.includes('scheduling') || taskKeywordsFound > 0) {
            suggestedAction = 'new_task';
            reason = 'Follow-up or scheduling required';
        } else if (tags.includes('hot-lead') && taskKeywordsFound > 0) {
            suggestedAction = 'new_task';
            reason = 'Hot lead with follow-up needed';
        } else if (callKeywordsFound > taskKeywordsFound && callKeywordsFound > 0) {
            suggestedAction = 'log_call';
            reason = 'Informational call - logged';
        } else if (tags.includes('complaint') || tags.includes('unqualified')) {
            suggestedAction = 'log_call';
            reason = 'Call logged for record';
        } else if (analysis.followUpRequired) {
            suggestedAction = 'new_task';
            reason = 'Follow-up marked as required';
        }
        
        // Build suggested task/log data
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
        if (tags.includes('scheduling') || tags.includes('pricing')) {
            return `Follow up: ${analysis.summary || 'Inquiry call'}`;
        }
        if (tags.includes('hot-lead')) {
            return `Hot Lead Follow-up: ${analysis.summary || 'Interested caller'}`;
        }
        if (tags.includes('follow-up')) {
            return `Call Back: ${analysis.summary || 'Follow-up required'}`;
        }
        return `Call Note: ${analysis.summary || 'General call'}`;
    }

    // Generate task due date
    generateTaskDueDate(tags) {
        const today = new Date();
        if (tags.includes('hot-lead')) {
            today.setDate(today.getDate() + 1); // Tomorrow for hot leads
        } else if (tags.includes('scheduling')) {
            today.setDate(today.getDate() + 3); // 3 days for scheduling
        } else {
            today.setDate(today.getDate() + 7); // 7 days default
        }
        return today.toISOString().split('T')[0];
    }

    // Generate call subject
    generateCallSubject(analysis) {
        if (analysis.sentiment === 'positive') {
            return `Inbound Call - Interested`;
        }
        if (analysis.sentiment === 'negative') {
            return `Inbound Call - Not Interested`;
        }
        return `Inbound Call - ${analysis.suggestedDisposition || 'New'}`;
    }

    // Generate call notes
    generateCallNotes(transcription, tags, analysis) {
        let notes = '';
        
        if (analysis.suggestedNotes) {
            notes += analysis.suggestedNotes + '\n\n';
        }
        
        if (tags.includes('hot-lead')) {
            notes += '**Action Required**: Hot lead - prioritize follow-up\n';
        }
        
        if (tags.includes('follow-up')) {
            notes += '**Follow-up Required**: Caller requested callback\n';
        }
        
        if (tags.includes('scheduling')) {
            notes += '**Scheduling Interest**: Caller wants to schedule appointment\n';
        }
        
        if (tags.includes('pricing')) {
            notes += '**Pricing Inquiry**: Sent pricing information request\n';
        }
        
        // Add transcription summary if available
        if (transcription && transcription.length > 0) {
            notes += `\n**Call Summary**:\n${transcription.substring(0, 500)}`;
            if (transcription.length > 500) {
                notes += '...';
            }
        }
        
        return notes || 'Call recorded via ATS Automation';
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

        const baseAnalysis = {
            phone,
            tags: [...new Set(tags)], // Remove duplicates
            sentiment,
            summary: summaryParts.join('. ') || 'Call recorded',
            suggestedDisposition,
            suggestedNotes: this.generateNotes(tags, text, phone),
            followUpRequired,
            timestamp: new Date().toISOString()
        };
        
        // Determine Salesforce action
        const sfActionData = this.determineSfAction(transcription, baseAnalysis.tags, baseAnalysis);
        
        return {
            ...baseAnalysis,
            ...sfActionData
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
