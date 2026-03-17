/**
 * Overlay Templates Module
 * Contains all HTML templates for the overlay UI
 */

const OverlayTemplates = {
    getMainTemplate() {
        return `
            <div class="ats-overlay-header">
                <span class="ats-title">ATS Automation</span>
                <button class="ats-close-btn">&times;</button>
            </div>
            <div class="ats-overlay-content"></div>
        `;
    },
    
    getHeaderSection(phone, status) {
        const displayPhone = phone || 'Unknown Number';
        const phoneClass = phone ? '' : 'unknown';
        
        return `
            <div class="ats-header-section">
                <div class="ats-header-info">
                    <div class="ats-phone-icon"></div>
                    <div>
                        <div class="ats-phone-number ${phoneClass}">${displayPhone}</div>
                    </div>
                </div>
                <div class="ats-status-row">
                    <span class="ats-text-sm ats-text-muted">
                        <span class="ats-status-indicator ${status ? 'online' : 'offline'}"></span>
                        ${status ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>
        `;
    },
    
    getCallerInfoSection(callerInfo) {
        if (!callerInfo) return '';
        
        return `
            <div class="ats-section">
                <div class="ats-section-header">
                    <span>Caller Information</span>
                </div>
                <div class="ats-section-content">
                    ${callerInfo.name ? `<div class="ats-mb-2"><strong>Name:</strong> ${callerInfo.name}</div>` : ''}
                    ${callerInfo.location ? `<div class="ats-mb-2"><strong>Location:</strong> ${callerInfo.location}</div>` : ''}
                    ${callerInfo.carrier ? `<div class="ats-mb-2"><strong>Carrier:</strong> ${callerInfo.carrier}</div>` : ''}
                </div>
            </div>
        `;
    },
    
    getQualificationSection(qualification) {
        if (!qualification) return '';
        
        const scoreClass = qualification.score >= 70 ? 'high' : qualification.score >= 40 ? 'medium' : 'low';
        
        return `
            <div class="ats-section">
                <div class="ats-section-header">
                    <span>Lead Qualification</span>
                    <span class="ats-score-badge ${scoreClass}">${qualification.score}/100</span>
                </div>
                <div class="ats-section-content">
                    <div class="ats-mb-2">
                        <strong>Disposition:</strong> ${qualification.disposition || 'New'}
                    </div>
                    ${qualification.summary ? `
                        <div class="ats-mb-2">
                            <strong>Summary:</strong><br>
                            ${qualification.summary}
                        </div>
                    ` : ''}
                    ${qualification.notes ? `
                        <div class="ats-mb-2">
                            <strong>Notes:</strong><br>
                            ${qualification.notes}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    getSalesforceSection(sfData) {
        return `
            <div class="ats-section">
                <div class="ats-section-header">
                    <span>Salesforce</span>
                    <span class="ats-status-indicator ${sfData ? 'online' : 'offline'}"></span>
                </div>
                <div class="ats-section-content">
                    ${sfData ? `
                        <div class="ats-mb-2"><strong>Contact:</strong> ${sfData.name || 'Unknown'}</div>
                        <div class="ats-mb-2"><strong>Account:</strong> ${sfData.account || 'Unknown'}</div>
                        <div class="ats-mb-2"><strong>Status:</strong> ${sfData.status || 'Unknown'}</div>
                    ` : `
                        <div class="ats-text-muted ats-text-sm">No Salesforce data found</div>
                    `}
                </div>
            </div>
        `;
    },
    
    getToastContainer() {
        return `<div class="ats-toast-container"></div>`;
    },
    
    getLoadingSpinner() {
        return `<div class="ats-spinner"></div>`;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OverlayTemplates;
}
