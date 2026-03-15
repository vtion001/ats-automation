/**
 * Overlay UI Module
 * Handles the floating overlay panel
 */

class OverlayUI {
    constructor() {
        this.overlayId = 'ats-automation-overlay';
    }

    // Initialize and create overlay element
    create() {
        if (document.getElementById(this.overlayId)) return;

        const overlay = document.createElement('div');
        overlay.id = this.overlayId;
        overlay.innerHTML = this.getTemplate();

        const style = document.createElement('style');
        style.textContent = this.getStyles();

        document.head.appendChild(style);
        document.body.appendChild(overlay);

        // Close button handler
        overlay.querySelector('.ats-close-btn').addEventListener('click', () => {
            this.hide();
        });
    }

    // Get HTML template
    getTemplate() {
        return `
            <div class="ats-overlay-header">
                <span class="ats-title">ATS Automation</span>
                <button class="ats-close-btn">&times;</button>
            </div>
            <div class="ats-overlay-content"></div>
        `;
    }

    // Get CSS styles
    getStyles() {
        return `
            #${this.overlayId} {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 350px;
                max-height: 500px;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                color: #1e293b;
                overflow: hidden;
                animation: ats-slide-in 0.3s ease;
                border: 1px solid #e2e8f0;
            }
            @keyframes ats-slide-in {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .ats-overlay-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 18px;
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                border-bottom: none;
            }
            .ats-title { font-weight: 700; color: #ffffff; font-size: 14px; }
            .ats-close-btn {
                background: none;
                border: none;
                color: rgba(255,255,255,0.8);
                font-size: 22px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            .ats-close-btn:hover { color: #fff; }
            .ats-overlay-content { padding: 18px; max-height: 600px; overflow-y: auto; }
            .ats-field { margin-bottom: 14px; }
            .ats-field-label { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
            .ats-field-value { color: #1e293b; font-size: 14px; word-break: break-word; }
            .ats-button {
                background: #2563eb; color: #fff; border: none;
                padding: 10px 18px; border-radius: 6px; cursor: pointer;
                font-size: 13px; font-weight: 500; margin: 4px; transition: all 0.2s;
            }
            .ats-button:hover { background: #1d4ed8; transform: translateY(-1px); }
            .ats-button.secondary { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
            .ats-button.secondary:hover { background: #e2e8f0; }
            .ats-button.success { background: #10b981; }
            .ats-button.success:hover { background: #059669; }
            .ats-notification {
                padding: 12px 16px; background: #eff6ff;
                border-left: 3px solid #2563eb; border-radius: 4px; margin-bottom: 12px; font-size: 13px;
                color: #1e293b;
            }
            .ats-tag {
                display: inline-block; padding: 3px 10px; border-radius: 12px;
                font-size: 11px; margin: 2px; font-weight: 500;
            }
            .ats-tag.hot-lead { background: #f97316; color: #fff; }
            .ats-tag.unqualified { background: #9ca3af; color: #fff; }
            .ats-tag.follow-up { background: #2563eb; color: #fff; }
            .ats-tag.pricing { background: #8b5cf6; color: #fff; }
            .ats-transcription {
                max-height: 150px; overflow-y: auto; background: #f8fafc;
                padding: 12px; border-radius: 6px; font-size: 12px; line-height: 1.5; color: #475569;
            }
            .ats-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
            .ats-loading { text-align: center; color: #64748b; padding: 30px; }
            .ats-action-reason {
                font-size: 12px;
                color: #64748b;
                background: #f8fafc;
                padding: 8px 12px;
                border-radius: 6px;
                margin-top: 8px;
                border-left: 3px solid #2563eb;
            }
            .ats-status-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
            }
            .ats-status-badge.log_call { background: #dbeafe; color: #2563eb; }
            .ats-status-badge.new_task { background: #d1fae5; color: #059669; }
            
            /* New Lead Button Styles */
            .ats-info-list { margin: 12px 0; }
            .ats-info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 10px;
                background: #f8fafc;
                border-radius: 6px;
                margin-bottom: 6px;
                font-size: 12px;
            }
            .ats-info-label { color: #64748b; }
            .ats-info-value { color: #1e293b; font-weight: 500; }
            .ats-info-confidence {
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                margin-left: 8px;
            }
            .ats-info-confidence.high { background: #d1fae5; color: #059669; }
            .ats-info-confidence.medium { background: #fef3c7; color: #d97706; }
            .ats-info-confidence.low { background: #fee2e2; color: #dc2626; }
            .ats-info-source {
                font-size: 9px;
                color: #94a3b8;
                margin-left: 4px;
            }
            .ats-score-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 14px;
            }
            .ats-score-badge.hot { background: #fee2e2; color: #dc2626; }
            .ats-score-badge.warm { background: #fef3c7; color: #d97706; }
            .ats-score-badge.cold { background: #dbeafe; color: #2563eb; }
            .ats-divider { height: 1px; background: #e2e8f0; margin: 14px 0; }
            .ats-recommendation {
                background: #f0fdf4;
                border: 1px solid #22c55e;
                border-radius: 6px;
                padding: 10px 12px;
                font-size: 12px;
                color: #166534;
                margin-top: 12px;
            }
            .ats-button-primary {
                background: #2563eb; color: #fff; border: none;
                padding: 12px 20px; border-radius: 8px; cursor: pointer;
                font-size: 14px; font-weight: 600; width: 100%; transition: all 0.2s;
                display: flex; align-items: center; justify-content: center; gap: 8px;
            }
            .ats-button-primary:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
            .ats-button-secondary {
                background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;
                padding: 12px 20px; border-radius: 8px; cursor: pointer;
                font-size: 14px; font-weight: 500; width: 100%; transition: all 0.2s;
                margin-top: 8px;
            }
            .ats-button-secondary:hover { background: #e2e8f0; }
            .ats-button-group { margin-top: 16px; }
            .ats-header-info { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
            .ats-phone-icon { font-size: 20px; }
            .ats-phone-number { font-size: 18px; font-weight: 700; color: #1e293b; }
            .ats-status-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
            
            /* Full Transcription Box */
            .ats-transcription-box {
                max-height: 200px;
                overflow-y: auto;
                background: #f8fafc;
                padding: 12px;
                border-radius: 6px;
                font-size: 12px;
                line-height: 1.6;
                color: #475569;
                border: 1px solid #e2e8f0;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            
            /* Salesforce Notes */
            .ats-salesforce-notes {
                background: #f0fdf4;
                border: 1px solid #22c55e;
                border-radius: 6px;
                padding: 12px;
                font-size: 11px;
                line-height: 1.5;
                color: #166534;
                max-height: 200px;
                overflow-y: auto;
                white-space: pre-wrap;
            }
            
            /* Copy Notes Button */
            .ats-copy-notes-btn {
                background: #22c55e;
                color: #fff;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                margin-top: 8px;
                width: 100%;
                transition: all 0.2s;
            }
            .ats-copy-notes-btn:hover {
                background: #16a34a;
            }
        `;
    }

    // Show loading state
    showLoading(message = 'Loading...') {
        this.create();
        const content = document.querySelector(`#${this.overlayId} .ats-overlay-content`);
        content.innerHTML = `<div class="ats-loading">${message}</div>`;
    }

    // Show notification
    showNotification(message) {
        this.create();
        const content = document.querySelector(`#${this.overlayId} .ats-overlay-content`);
        
        const notif = document.createElement('div');
        notif.className = 'ats-notification';
        notif.textContent = message;
        
        content.prepend(notif);
        
        setTimeout(() => notif.remove(), 5000);
    }

    // Show data in overlay with new lead buttons
    showData(data) {
        this.create();
        const content = document.querySelector(`#${this.overlayId} .ats-overlay-content`);
        
        let html = '';
        
        // Phone display
        if (data.phone) {
            html += `
                <div class="ats-header-info">
                    <span class="ats-phone-icon">📞</span>
                    <span class="ats-phone-number">${data.phone}</span>
                </div>
            `;
        }

        // Status row with score
        html += `<div class="ats-status-row">`;
        if (data.qualificationScore !== undefined) {
            const scoreClass = data.qualificationScore >= 70 ? 'hot' : data.qualificationScore >= 40 ? 'warm' : 'cold';
            html += `<span class="ats-score-badge ${scoreClass}">Score: ${data.qualificationScore}</span>`;
        }
        if (data.status) {
            html += `<span class="ats-field-value">${data.status}</span>`;
        }
        html += `</div>`;
        
        html += `<div class="ats-divider"></div>`;

        // Caller info with confidence (from CallerInfoService)
        if (data.callerInfo && data.callerInfo.length > 0) {
            html += `<div class="ats-field"><div class="ats-field-label">📋 Extracted Information</div></div>`;
            html += `<div class="ats-info-list">`;
            
            for (const info of data.callerInfo) {
                const confClass = info.isHighConfidence ? 'high' : info.confidence >= 0.5 ? 'medium' : 'low';
                const sourceLabel = info.source === 'ctm' ? 'CTM' : info.source === 'ai' ? 'AI' : '';
                html += `
                    <div class="ats-info-item">
                        <span class="ats-info-label">${info.label}:</span>
                        <span>
                            <span class="ats-info-value">${info.value}</span>
                            <span class="ats-info-confidence ${confClass}">${Math.round(info.confidence * 100)}%</span>
                            ${sourceLabel ? `<span class="ats-info-source">${sourceLabel}</span>` : ''}
                        </span>
                    </div>
                `;
            }
            html += `</div>`;
        }

        // Tags
        if (data.tags && data.tags.length > 0) {
            html += `<div class="ats-field"><div class="ats-field-label">Tags</div><div class="ats-field-value">${data.tags.map(tag => `<span class="ats-tag ${tag}">${tag}</span>`).join('')}</div></div>`;
        }

        // Summary
        if (data.summary) {
            html += `<div class="ats-field"><div class="ats-field-label">Summary</div><div class="ats-field-value">${data.summary}</div></div>`;
        }

        // Recommendation
        if (data.recommendation) {
            html += `<div class="ats-recommendation">🎯 ${data.recommendation}</div>`;
        }

        // Two Buttons (New Lead + Existing Lead)
        if (data.showButtons) {
            html += `<div class="ats-button-group">`;
            html += `<button class="ats-button-primary" data-action="new-lead">`;
            html += `✨ New Lead - Create Contact</button>`;
            html += `<button class="ats-button-secondary" data-action="existing-lead">`;
            html += `🔍 Existing Lead</button>`;
            html += `</div>`;
        }

        // Legacy: Show action buttons if no new buttons
        if (!data.showButtons && data.actions) {
            html += '<div class="ats-actions">';
            for (const action of data.actions) {
                html += `<button class="ats-button ${action.secondary ? 'secondary' : ''}" data-action="${action.type}">${action.label}</button>`;
            }
            html += '</div>';
        }

        content.innerHTML = html;

        // Add action handlers
        content.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const actionType = e.target.getAttribute('data-action');
                ATS.sendMessage({
                    type: ATS.Messages.ATS_ACTION,
                    payload: { action: actionType, data }
                });
            });
        });
    }

    // Show caller info specifically (for after call ends)
    showCallerInfo(callerInfo, analysis, phone) {
        this.create();
        const content = document.querySelector(`#${this.overlayId} .ats-overlay-content`);
        
        let html = '';
        
        // Phone
        html += `
            <div class="ats-header-info">
                <span class="ats-phone-icon">📞</span>
                <span class="ats-phone-number">${phone || 'Unknown'}</span>
            </div>
        `;

        // Score
        const score = analysis?.qualificationScore || 0;
        const scoreClass = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';
        const statusLabel = score >= 70 ? 'Hot Lead' : score >= 40 ? 'Warm Lead' : 'Cold Lead';
        
        html += `
            <div class="ats-status-row">
                <span class="ats-score-badge ${scoreClass}">${score}</span>
                <span style="font-weight:600;color:#64748b">${statusLabel}</span>
            </div>
            <div class="ats-divider"></div>
        `;

        // Extracted info with confidence
        if (callerInfo && callerInfo.length > 0) {
            html += `<div class="ats-field"><div class="ats-field-label">📋 Extracted Information</div></div>`;
            html += `<div class="ats-info-list">`;
            
            for (const info of callerInfo) {
                const confClass = info.isHighConfidence ? 'high' : info.confidence >= 0.5 ? 'medium' : 'low';
                const sourceLabel = info.source === 'ctm' ? 'CTM' : info.source === 'ai' ? 'AI' : '';
                html += `
                    <div class="ats-info-item">
                        <span class="ats-info-label">${info.label}:</span>
                        <span>
                            <span class="ats-info-value">${info.value}</span>
                            <span class="ats-info-confidence ${confClass}">${Math.round(info.confidence * 100)}%</span>
                            ${sourceLabel ? `<span class="ats-info-source">${sourceLabel}</span>` : ''}
                        </span>
                    </div>
                `;
            }
            html += `</div>`;
        }

        // Key Details Section
        const mentionedNames = analysis?.mentionedNames || [];
        const mentionedLocations = analysis?.mentionedLocations || [];
        const mentionedPhones = analysis?.mentionedPhones || [];
        const otherInfo = analysis?.otherCustomerInfo || '';
        
        if (mentionedNames.length > 0 || mentionedLocations.length > 0 || mentionedPhones.length > 0 || otherInfo) {
            html += `<div class="ats-divider"></div>`;
            html += `<div class="ats-field"><div class="ats-field-label">📝 Key Details</div></div>`;
            html += `<div class="ats-info-list">`;
            
            if (mentionedNames.length > 0) {
                html += `<div class="ats-info-item"><span class="ats-info-label">Names:</span><span class="ats-info-value">${mentionedNames.join(', ')}</span></div>`;
            }
            if (mentionedLocations.length > 0) {
                html += `<div class="ats-info-item"><span class="ats-info-label">Locations:</span><span class="ats-info-value">${mentionedLocations.join(', ')}</span></div>`;
            }
            if (mentionedPhones.length > 0) {
                html += `<div class="ats-info-item"><span class="ats-info-label">Phones:</span><span class="ats-info-value">${mentionedPhones.join(', ')}</span></div>`;
            }
            if (otherInfo) {
                html += `<div class="ats-info-item"><span class="ats-info-label">Other:</span><span class="ats-info-value">${otherInfo}</span></div>`;
            }
            html += `</div>`;
        }

        // Full Transcription Section
        const fullTranscription = analysis?.fullTranscription || '';
        if (fullTranscription) {
            html += `<div class="ats-divider"></div>`;
            html += `<div class="ats-field"><div class="ats-field-label">📄 Full Transcription</div></div>`;
            html += `<div class="ats-transcription-box">${fullTranscription}</div>`;
        }

        // Salesforce Notes Section
        const salesforceNotes = analysis?.salesforceNotes || '';
        if (salesforceNotes) {
            html += `<div class="ats-divider"></div>`;
            html += `<div class="ats-field"><div class="ats-field-label">💾 Salesforce Notes</div></div>`;
            html += `<div class="ats-salesforce-notes">${salesforceNotes}</div>`;
            html += `<button class="ats-copy-notes-btn" id="ats-copy-notes">📋 Copy Notes</button>`;
        }

        // Recommendation
        const recommendation = analysis?.recommended_department || 'Transfer to appropriate department';
        html += `<div class="ats-recommendation">🎯 Recommendation: ${recommendation}</div>`;

        // Two Buttons
        html += `<div class="ats-button-group">`;
        html += `<button class="ats-button-primary" data-action="new-lead">✨ New Lead - Create Contact</button>`;
        html += `<button class="ats-button-secondary" data-action="existing-lead">🔍 Existing Lead</button>`;
        html += `</div>`;

        content.innerHTML = html;

        // Add copy notes handler
        const copyBtn = content.querySelector('#ats-copy-notes');
        if (copyBtn && salesforceNotes) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(salesforceNotes).then(() => {
                    copyBtn.textContent = '✅ Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = '📋 Copy Notes';
                    }, 2000);
                });
            });
        }

        // Add action handlers
        content.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const actionType = e.target.getAttribute('data-action');
                ATS.sendMessage({
                    type: ATS.Messages.ATS_ACTION,
                    payload: { 
                        action: actionType, 
                        callerInfo: callerInfo,
                        analysis: analysis,
                        phone: phone
                    }
                });
            });
        });
    }

    // Hide overlay
    hide() {
        const overlay = document.getElementById(this.overlayId);
        if (overlay) overlay.remove();
    }
}

window.OverlayUI = OverlayUI;
