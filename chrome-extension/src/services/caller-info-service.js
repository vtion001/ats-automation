/**
 * Caller Info Service
 * Manages caller information extraction with confidence scores
 * Primary source: CTM Caller ID
 * Secondary source: AI analysis
 */

class CallerInfoService {
    constructor() {
        this.currentCall = null;
        this.callerInfo = null;
    }

    // Initialize with call data from CTM
    async initFromCTM(callData) {
        this.currentCall = callData;
        
        // Primary phone from CTM (100% accurate)
        const phone = callData.phoneNumber || callData.phone || null;
        
        // Name from CTM if available
        const callerName = callData.callerName || null;
        
        this.callerInfo = {
            phone: {
                value: phone,
                confidence: 1.0,
                source: 'ctm'
            },
            callerName: {
                value: callerName,
                confidence: callerName ? 0.95 : 0,
                source: callerName ? 'ctm' : null
            },
            state: { value: null, confidence: 0, source: null },
            insurance: { value: null, confidence: 0, source: null },
            soberDays: { value: null, confidence: 0, source: null },
            interestLevel: { value: null, confidence: 0, source: null },
            callType: { value: null, confidence: 0, source: null }
        };

        ATS.logger.info('CallerInfoService initialized from CTM:', this.callerInfo);
        return this.callerInfo;
    }

    // Update with AI analysis results
    updateFromAI(aiAnalysis) {
        if (!this.callerInfo) {
            ATS.logger.warn('CallerInfo not initialized, initializing now');
            this.callerInfo = {
                phone: { value: null, confidence: 0, source: null },
                callerName: { value: null, confidence: 0, source: null },
                state: { value: null, confidence: 0, source: null },
                insurance: { value: null, confidence: 0, source: null },
                soberDays: { value: null, confidence: 0, source: null },
                interestLevel: { value: null, confidence: 0, source: null },
                callType: { value: null, confidence: 0, source: null }
            };
        }

        // Update from AI analysis
        // Note: Phone should already be from CTM, but fallback to AI if not available
        if (!this.callerInfo.phone.value && aiAnalysis.phone) {
            this.callerInfo.phone = {
                value: aiAnalysis.phone,
                confidence: 0.7,
                source: 'ai'
            };
        }

        // Name from AI if not from CTM
        if (!this.callerInfo.callerName.value && aiAnalysis.caller_name) {
            this.callerInfo.callerName = {
                value: aiAnalysis.caller_name?.value || aiAnalysis.callerName,
                confidence: aiAnalysis.caller_name?.confidence || 0.5,
                source: 'ai'
            };
        }

        // State from AI
        if (aiAnalysis.detected_state) {
            this.callerInfo.state = {
                value: aiAnalysis.detected_state,
                confidence: aiAnalysis.state_confidence || 0.7,
                source: 'ai'
            };
        }

        // Insurance from AI
        if (aiAnalysis.detected_insurance) {
            this.callerInfo.insurance = {
                value: aiAnalysis.detected_insurance,
                confidence: aiAnalysis.insurance_confidence || 0.6,
                source: 'ai'
            };
        }

        // Sober days from AI
        if (aiAnalysis.detected_sober_days || aiAnalysis.soberDays) {
            this.callerInfo.soberDays = {
                value: aiAnalysis.detected_sober_days || aiAnalysis.soberDays,
                confidence: aiAnalysis.sober_confidence || 0.7,
                source: 'ai'
            };
        }

        // Interest level
        if (aiAnalysis.qualification_score) {
            let interest = 'cold';
            if (aiAnalysis.qualification_score >= 70) interest = 'hot';
            else if (aiAnalysis.qualification_score >= 40) interest = 'warm';
            
            this.callerInfo.interestLevel = {
                value: interest,
                confidence: aiAnalysis.qualification_score / 100,
                source: 'ai'
            };
        }

        // Call type
        if (aiAnalysis.call_type) {
            this.callerInfo.callType = {
                value: aiAnalysis.call_type,
                confidence: 0.8,
                source: 'ai'
            };
        }

        ATS.logger.info('CallerInfo updated from AI:', this.callerInfo);
        return this.callerInfo;
    }

    // Get formatted info for display
    getDisplayInfo() {
        if (!this.callerInfo) return [];

        const info = [];

        // Phone - always show
        if (this.callerInfo.phone.value) {
            info.push({
                label: 'Phone',
                value: this.callerInfo.phone.value,
                confidence: this.callerInfo.phone.confidence,
                source: this.callerInfo.phone.source,
                isHighConfidence: this.callerInfo.phone.confidence >= 0.9
            });
        }

        // Name
        if (this.callerInfo.callerName.value) {
            info.push({
                label: 'Name',
                value: this.callerInfo.callerName.value,
                confidence: this.callerInfo.callerName.confidence,
                source: this.callerInfo.callerName.source,
                isHighConfidence: this.callerInfo.callerName.confidence >= 0.8
            });
        }

        // State
        if (this.callerInfo.state.value) {
            info.push({
                label: 'State',
                value: this.callerInfo.state.value,
                confidence: this.callerInfo.state.confidence,
                source: this.callerInfo.state.source,
                isHighConfidence: this.callerInfo.state.confidence >= 0.8
            });
        }

        // Insurance
        if (this.callerInfo.insurance.value) {
            info.push({
                label: 'Insurance',
                value: this.callerInfo.insurance.value,
                confidence: this.callerInfo.insurance.confidence,
                source: this.callerInfo.insurance.source,
                isHighConfidence: this.callerInfo.insurance.confidence >= 0.7
            });
        }

        // Sober days
        if (this.callerInfo.soberDays.value !== null && this.callerInfo.soberDays.value !== undefined) {
            info.push({
                label: 'Sober',
                value: `${this.callerInfo.soberDays.value} days`,
                confidence: this.callerInfo.soberDays.confidence,
                source: this.callerInfo.soberDays.source,
                isHighConfidence: this.callerInfo.soberDays.confidence >= 0.7
            });
        }

        return info;
    }

    // Prepare data for Contact creation
    prepareContactData(actionData = {}) {
        if (!this.callerInfo) {
            ATS.logger.warn('No caller info available for contact');
            return null;
        }

        const phone = this.callerInfo.phone.value;
        const name = this.callerInfo.callerName.value;
        
        // Parse name into first/last
        let firstName = '';
        let lastName = '';
        
        if (name) {
            const nameParts = name.split(' ');
            if (nameParts.length > 1) {
                firstName = nameParts[0];
                lastName = nameParts.slice(1).join(' ');
            } else {
                lastName = nameParts[0];
            }
        }

        // Build description
        let description = '';
        if (actionData.callNotes) {
            description = actionData.callNotes + '\n\n';
        }
        
        description += `Qualification Score: ${this.callerInfo.interestLevel.value === 'hot' ? '75+' : this.callerInfo.interestLevel.value === 'warm' ? '40-74' : '0-39'}\n`;
        
        if (this.callerInfo.insurance.value) {
            description += `Insurance: ${this.callerInfo.insurance.value}\n`;
        }
        if (this.callerInfo.state.value) {
            description += `State: ${this.callerInfo.state.value}\n`;
        }
        if (this.callerInfo.soberDays.value !== null) {
            description += `Sober Days: ${this.callerInfo.soberDays.value}\n`;
        }
        if (this.callerInfo.callType.value) {
            description += `Call Type: ${this.callerInfo.callType.value}\n`;
        }

        return {
            phone: phone,
            firstName: firstName,
            lastName: lastName,
            description: description,
            leadSource: 'Inbound Call',
            status: 'Open - Not Contacted',
            qualificationScore: this.callerInfo.interestLevel.value === 'hot' ? 75 : this.callerInfo.interestLevel.value === 'warm' ? 50 : 25,
            callType: this.callerInfo.callType.value
        };
    }

    // Get current caller info
    getCallerInfo() {
        return this.callerInfo;
    }

    // Check if we have enough info for new contact
    canCreateContact() {
        return this.callerInfo && this.callerInfo.phone.value;
    }

    // Get confidence summary
    getConfidenceSummary() {
        if (!this.callerInfo) return {};

        return {
            overall: (this.callerInfo.phone.confidence + 
                     (this.callerInfo.callerName.confidence || 0) + 
                     (this.callerInfo.state.confidence || 0) + 
                     (this.callerInfo.insurance.confidence || 0)) / 4,
            phone: this.callerInfo.phone.confidence,
            name: this.callerInfo.callerName.confidence,
            state: this.callerInfo.state.confidence,
            insurance: this.callerInfo.insurance.confidence
        };
    }

    // Reset for new call
    reset() {
        this.currentCall = null;
        this.callerInfo = null;
    }
}

window.CallerInfoService = CallerInfoService;
