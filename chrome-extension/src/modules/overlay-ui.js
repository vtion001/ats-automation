/**
 * Overlay UI Module
 * Handles the floating overlay panel with improved UX/UI
 */

class OverlayUI {
    constructor() {
        this.overlayId = 'ats-automation-overlay';
    }

    create() {
        if (document.getElementById(this.overlayId)) return;

        const overlay = document.createElement('div');
        overlay.id = this.overlayId;
        overlay.innerHTML = this.getTemplate();

        const style = document.createElement('style');
        style.textContent = this.getStyles();

        document.head.appendChild(style);
        document.body.appendChild(overlay);

        overlay.querySelector('.ats-close-btn').addEventListener('click', () => {
            this.hide();
        });

        this.setupCollapsibleSections();
    }

    getTemplate() {
        return `
            <div class="ats-overlay-header">
                <span class="ats-title">ATS Automation</span>
                <button class="ats-close-btn">&times;</button>
            </div>
            <div class="ats-overlay-content"></div>
        `;
    }

    getStyles() {
        return `
            #${this.overlayId} {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 380px;
                max-height: 90vh;
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                color: #1e293b;
                overflow: hidden;
                animation: ats-slide-in 0.3s ease;
                border: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
            }
            @keyframes ats-slide-in {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .ats-overlay-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                border-bottom: none;
                flex-shrink: 0;
            }
            .ats-title { font-weight: 700; color: #ffffff; font-size: 15px; }
            .ats-close-btn {
                background: none;
                border: none;
                color: rgba(255,255,255,0.8);
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.2s;
            }
            .ats-close-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
            
            .ats-overlay-content {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 16px;
            }

            /* Toast Container */
            .ats-toast-container {
                position: absolute;
                top: 70px;
                left: 16px;
                right: 16px;
                z-index: 100;
                pointer-events: none;
            }
            .ats-toast {
                padding: 10px 14px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: ats-toast-in 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                pointer-events: auto;
            }
            .ats-toast.success { background: #10b981; color: white; }
            .ats-toast.error { background: #ef4444; color: white; }
            .ats-toast.hiding {
                animation: ats-toast-out 0.25s ease forwards;
            }
            @keyframes ats-toast-in {
                from { transform: translateY(-10px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes ats-toast-out {
                from { transform: translateY(0); opacity: 1; }
                to { transform: translateY(-10px); opacity: 0; }
            }

            /* Header Info Section */
            .ats-header-section {
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
            }
            .ats-header-info {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            .ats-phone-icon { 
                width: 44px; 
                height: 44px; 
                background: #2563eb; 
                border-radius: 10px; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                font-size: 20px;
            }
            .ats-phone-number { 
                font-size: 22px; 
                font-weight: 700; 
                color: #1e293b; 
                letter-spacing: -0.5px;
            }
            .ats-phone-number.unknown {
                color: #94a3b8;
                font-size: 16px;
                font-weight: 500;
            }
            .ats-status-row { 
                display: flex; 
                justify-content: space-between; 
                align-items: center;
            }
            
            /* Score Badge */
            .ats-score-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 700;
                font-size: 16px;
            }
            .ats-score-badge.hot { 
                background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); 
                color: #dc2626; 
            }
            .ats-score-badge.warm { 
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
                color: #d97706; 
            }
            .ats-score-badge.cold { 
                background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); 
                color: #2563eb; 
            }
            .ats-status-label {
                font-weight: 600;
                font-size: 14px;
                color: #64748b;
            }
            .ats-status-label.hot { color: #dc2626; }
            .ats-status-label.warm { color: #d97706; }
            .ats-status-label.cold { color: #2563eb; }

            /* Cards */
            .ats-card {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                margin-bottom: 12px;
                overflow: hidden;
                transition: all 0.2s ease;
            }
            .ats-card:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .ats-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                cursor: pointer;
                background: #f8fafc;
                border-bottom: 1px solid #f1f5f9;
                user-select: none;
            }
            .ats-card-header:hover {
                background: #f1f5f9;
            }
            .ats-card-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                font-size: 13px;
                color: #475569;
            }
            .ats-card-toggle {
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #94a3b8;
                transition: transform 0.3s ease;
            }
            .ats-card.collapsed .ats-card-toggle {
                transform: rotate(-90deg);
            }
            .ats-card-body {
                padding: 14px 16px;
                max-height: 300px;
                overflow-y: auto;
                transition: max-height 0.3s ease, padding 0.3s ease, opacity 0.3s ease;
            }
            .ats-card.collapsed .ats-card-body {
                max-height: 0;
                padding: 0 16px;
                opacity: 0;
                overflow: hidden;
            }

            /* Info Items */
            .ats-info-list { }
            .ats-info-item {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 10px 12px;
                background: #f8fafc;
                border-radius: 8px;
                margin-bottom: 8px;
                font-size: 13px;
            }
            .ats-info-item:last-child { margin-bottom: 0; }
            .ats-info-label { 
                color: #64748b; 
                font-weight: 500; 
                min-width: 80px;
                flex-shrink: 0;
            }
            .ats-info-value { 
                color: #1e293b; 
                font-weight: 500; 
                text-align: right;
                word-break: break-word;
                flex: 1;
                margin-left: 12px;
            }
            .ats-info-confidence {
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                margin-left: 6px;
                flex-shrink: 0;
            }
            .ats-info-confidence.high { background: #d1fae5; color: #059669; }
            .ats-info-confidence.medium { background: #fef3c7; color: #d97706; }
            .ats-info-confidence.low { background: #fee2e2; color: #dc2626; }
            .ats-info-source {
                font-size: 9px;
                color: #94a3b8;
                margin-left: 4px;
            }

            /* Transcription Box */
            .ats-transcription-box {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 12px;
                font-size: 12px;
                line-height: 1.7;
                color: #475569;
                max-height: 150px;
                overflow-y: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
            }

            /* Salesforce Notes */
            .ats-salesforce-notes {
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-radius: 8px;
                padding: 12px;
                font-size: 11px;
                line-height: 1.6;
                color: #166534;
                white-space: pre-wrap;
                max-height: 150px;
                overflow-y: auto;
            }

            /* Copy Button */
            .ats-copy-notes-btn {
                background: #22c55e;
                color: #fff;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                margin-top: 10px;
                width: 100%;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            .ats-copy-notes-btn:hover {
                background: #16a34a;
                transform: translateY(-1px);
            }
            .ats-copy-notes-btn:active {
                transform: translateY(0);
            }

            /* Recommendation */
            .ats-recommendation {
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border: 1px solid #22c55e;
                border-radius: 10px;
                padding: 14px 16px;
                font-size: 13px;
                font-weight: 600;
                color: #166534;
                margin: 16px 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            /* Scoring Breakdown */
            .ats-scoring-card {
                background: #fefce8;
                border: 1px solid #fde047;
                border-radius: 10px;
                margin: 16px 0;
                overflow: hidden;
            }
            .ats-scoring-card .ats-card-header {
                background: #fef9c3;
                border-bottom: 1px solid #fde047;
            }
            .ats-scoring-card .ats-card-title {
                color: #854d0e;
                font-weight: 700;
            }
            .ats-scoring-body {
                padding: 12px;
            }
            .ats-scoring-factor {
                background: #fff;
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 8px;
                border: 1px solid #e2e8f0;
            }
            .ats-scoring-factor-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
            }
            .ats-scoring-factor-name {
                font-weight: 600;
                color: #334155;
                text-transform: capitalize;
                font-size: 12px;
            }
            .ats-scoring-factor-status {
                font-size: 14px;
                font-weight: 700;
            }
            .ats-scoring-factor-status.meets {
                color: #16a34a;
            }
            .ats-scoring-factor-status.not-meets {
                color: #dc2626;
            }
            .ats-scoring-factor-details {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                color: #64748b;
            }
            .ats-scoring-factor-points {
                font-weight: 600;
                color: #2563eb;
            }
            .ats-scoring-keywords {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px dashed #e2e8f0;
            }
            .ats-scoring-keywords-label {
                font-size: 11px;
                color: #64748b;
                font-weight: 600;
                display: block;
                margin-bottom: 6px;
            }
            .ats-scoring-keywords-list {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            .ats-keyword-tag {
                background: #dbeafe;
                color: #1d4ed8;
                padding: 3px 10px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 500;
            }
            .ats-scoring-disqualifiers {
                margin-top: 12px;
                padding: 10px;
                background: #fef2f2;
                border-radius: 8px;
                border: 1px solid #fecaca;
            }
            .ats-scoring-disqualifiers-label {
                font-size: 11px;
                color: #dc2626;
                font-weight: 600;
                display: block;
                margin-bottom: 6px;
            }
            .ats-scoring-disqualifiers-list {
                margin: 0;
                padding-left: 16px;
                font-size: 11px;
                color: #991b1b;
            }
            .ats-scoring-disqualifiers-list li {
                margin-bottom: 4px;
            }
            .ats-scoring-explanation {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px dashed #e2e8f0;
            }
            .ats-scoring-explanation-label {
                font-size: 11px;
                color: #64748b;
                font-weight: 600;
                display: block;
                margin-bottom: 6px;
            }
            .ats-scoring-explanation-text {
                margin: 0;
                font-size: 11px;
                color: #475569;
                line-height: 1.5;
            }

            /* Action Buttons */
            .ats-button-group {
                margin-top: 16px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding-top: 4px;
            }
            .ats-button-primary {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: #fff;
                border: none;
                padding: 14px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                width: 100%;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .ats-button-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
            }
            .ats-button-secondary {
                background: #fff;
                color: #475569;
                border: 1px solid #e2e8f0;
                padding: 14px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                width: 100%;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .ats-button-secondary:hover {
                background: #f8fafc;
                border-color: #cbd5e1;
            }
            
            /* Fill Salesforce Button */
            .ats-button-fill-sf {
                background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                color: #fff;
                border: none;
                padding: 14px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                width: 100%;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .ats-button-fill-sf:hover {
                background: linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%);
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(124, 58, 237, 0.4);
            }
            .ats-button-fill-sf:active {
                transform: translateY(0);
            }
            .ats-button-fill-sf.loading {
                opacity: 0.7;
                pointer-events: none;
            }
            .ats-button-fill-sf.success {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }
            .ats-button-fill-sf.error {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            }

            /* Divider */
            .ats-divider { 
                height: 1px; 
                background: #e2e8f0; 
                margin: 0;
            }

            /* Empty state */
            .ats-empty-state {
                text-align: center;
                padding: 20px;
                color: #94a3b8;
                font-size: 12px;
            }

            /* Loading */
            .ats-loading {
                text-align: center;
                color: #64748b;
                padding: 30px;
            }
            .ats-loading-spinner {
                width: 32px;
                height: 32px;
                border: 3px solid #e2e8f0;
                border-top-color: #2563eb;
                border-radius: 50%;
                animation: ats-spin 1s linear infinite;
                margin: 0 auto 12px;
            }
            @keyframes ats-spin {
                to { transform: rotate(360deg); }
            }
        `;
    }

    setupCollapsibleSections() {
        const overlay = document.getElementById(this.overlayId);
        if (!overlay) return;
        
        overlay.querySelectorAll('.ats-card-header').forEach(header => {
            header.addEventListener('click', () => {
                const card = header.closest('.ats-card');
                card.classList.toggle('collapsed');
            });
        });
    }

    showToast(message, type = 'success') {
        const overlay = document.getElementById(this.overlayId);
        if (!overlay) return;
        
        let container = overlay.querySelector('.ats-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'ats-toast-container';
            overlay.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `ats-toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 250);
        }, 2500);
    }

    showLoading(message = 'Loading...') {
        this.create();
        const content = document.querySelector(`#${this.overlayId} .ats-overlay-content`);
        content.innerHTML = `
            <div class="ats-loading">
                <div class="ats-loading-spinner"></div>
                <div>${message}</div>
            </div>
        `;
    }

    // Show call in progress with Start Recording button
    showCallInProgress(phoneNumber, callerName) {
        this.create();
        const content = document.querySelector(`#${this.overlayId} .ats-overlay-content`);
        
        const displayPhone = phoneNumber || 'Unknown';
        const displayName = callerName || 'Unknown Caller';
        
        content.innerHTML = `
            <div class="ats-header-section" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">
                <div class="ats-header-info">
                    <div class="ats-phone-icon" style="background: #1e3a5f;">●</div>
                    <div>
                        <div class="ats-phone-number">${this.escapeHtml(displayPhone)}</div>
                        <div style="font-size: 12px; color: #92400e; margin-top: 2px;">${this.escapeHtml(displayName)}</div>
                    </div>
                </div>
                <div class="ats-status-row">
                    <span class="ats-score-badge" style="background: #fef3c7; color: #92400e;">CALL</span>
                    <span class="ats-status-label" style="color: #92400e;">In Progress</span>
                </div>
            </div>
            
            <div class="ats-call-recording-section">
                <div class="ats-recording-prompt">
                    <div style="text-align: center; margin-bottom: 16px;">
                        <div style="font-size: 32px; margin-bottom: 8px; color: #1e3a5f;">●</div>
                        <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">Record this call?</div>
                        <div style="font-size: 11px; color: #64748b;">Click below to start capturing audio</div>
                    </div>
                    <button class="ats-button-primary" id="ats-start-recording-btn" style="background: #1e3a5f;">
                        Start Recording
                    </button>
                </div>
            </div>
            
            <div style="margin-top: 16px; padding: 12px; background: #f7f8fa; border-radius: 4px; font-size: 11px; color: #64748b;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                    <span style="color: #3182ce;">●</span> Call detection active
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="color: #a0aec0;">○</span> Audio recording off
                </div>
            </div>
        `;
        
        // Attach start recording handler
        const startBtn = content.querySelector('#ats-start-recording-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                ATS.sendMessage({
                    type: ATS.Messages.START_AUDIO_CAPTURE,
                    payload: { phoneNumber, callerName }
                });
            });
        }
    }

    showNotification(message) {
        this.create();
        const content = document.querySelector(`#${this.overlayId} .ats-overlay-content`);
        
        const notif = document.createElement('div');
        notif.className = 'ats-notification';
        notif.textContent = message;
        
        content.prepend(notif);
        
        setTimeout(() => notif.remove(), 5000);
    }

    showData(data) {
        this.create();
        const content = document.querySelector(`#${this.overlayId} .ats-overlay-content`);
        
        let html = '';
        
        if (data.phone) {
            html += `
                <div class="ats-header-section">
                    <div class="ats-header-info">
                        <div class="ats-phone-icon"></div>
                        <span class="ats-phone-number">${this.escapeHtml(data.phone)}</span>
                    </div>
                    <div class="ats-status-row">
            `;
            if (data.qualificationScore !== undefined) {
                const scoreClass = data.qualificationScore >= 70 ? 'hot' : data.qualificationScore >= 40 ? 'warm' : 'cold';
                const statusLabel = data.qualificationScore >= 70 ? 'Hot Lead' : data.qualificationScore >= 40 ? 'Warm Lead' : 'Cold Lead';
                html += `
                    <span class="ats-score-badge ${scoreClass}">${data.qualificationScore}</span>
                    <span class="ats-status-label ${scoreClass}">${statusLabel}</span>
                `;
            }
            html += `</div></div>`;
        }

        if (data.callerInfo && data.callerInfo.length > 0) {
            html += `<div class="ats-card">
                <div class="ats-card-header">
                    <div class="ats-card-title">Extracted Information</div>
                    <div class="ats-card-toggle">▼</div>
                </div>
                <div class="ats-card-body">
                    <div class="ats-info-list">`;
            
            for (const info of data.callerInfo) {
                const confClass = info.isHighConfidence ? 'high' : info.confidence >= 0.5 ? 'medium' : 'low';
                const sourceLabel = info.source === 'ctm' ? 'CTM' : info.source === 'ai' ? 'AI' : '';
                html += `
                    <div class="ats-info-item">
                        <span class="ats-info-label">${this.escapeHtml(info.label)}:</span>
                        <span>
                            <span class="ats-info-value">${this.escapeHtml(info.value)}</span>
                            <span class="ats-info-confidence ${confClass}">${Math.round(info.confidence * 100)}%</span>
                            ${sourceLabel ? `<span class="ats-info-source">${sourceLabel}</span>` : ''}
                        </span>
                    </div>
                `;
            }
            html += `</div></div></div>`;
        }

        if (data.summary) {
            html += `<div class="ats-card">
                <div class="ats-card-header">
                    <div class="ats-card-title">Summary</div>
                    <div class="ats-card-toggle">▼</div>
                </div>
                <div class="ats-card-body">
                    <div style="color: #475569; line-height: 1.6;">${this.escapeHtml(data.summary)}</div>
                </div>
            </div>`;
        }

        if (data.recommendation) {
            html += `<div class="ats-recommendation">Recommendation: ${this.escapeHtml(data.recommendation)}</div>`;
        }

        if (data.showButtons) {
            html += `<div class="ats-button-group">
                <button class="ats-button-primary" data-action="new-lead">✨ New Lead - Create Contact</button>
                <button class="ats-button-secondary" data-action="existing-lead">Existing Lead</button>
            </div>`;
        }

        content.innerHTML = html;
        this.setupCollapsibleSections();
        this.attachActionHandlers(content, data);
    }

    showCallerInfo(callerInfo, analysis, phone) {
        this.create();
        const content = document.querySelector(`#${this.overlayId} .ats-overlay-content`);
        
        let html = '';
        
        const displayPhone = phone || 'Unknown';
        const isUnknown = !phone;
        
        html += `
            <div class="ats-header-section">
                <div class="ats-header-info">
                    <div class="ats-phone-icon"></div>
                    <span class="ats-phone-number ${isUnknown ? 'unknown' : ''}">${isUnknown ? 'No Phone Data' : this.escapeHtml(displayPhone)}</span>
                </div>
                <div class="ats-status-row">
        `;

        const score = analysis?.qualificationScore || 0;
        const scoreClass = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';
        const statusLabel = score >= 70 ? 'Hot Lead' : score >= 40 ? 'Warm Lead' : 'Cold Lead';
        
        html += `
                    <span class="ats-score-badge ${scoreClass}">${score}</span>
                    <span class="ats-status-label ${scoreClass}">${statusLabel}</span>
                </div>
            </div>
        `;

        // Key Details Card
        const mentionedNames = analysis?.mentionedNames || [];
        const mentionedLocations = analysis?.mentionedLocations || [];
        const mentionedPhones = analysis?.mentionedPhones || [];
        const otherInfo = analysis?.otherCustomerInfo || '';
        
        const hasKeyDetails = mentionedNames.length > 0 || mentionedLocations.length > 0 || mentionedPhones.length > 0 || otherInfo;
        
        if (hasKeyDetails) {
            html += `<div class="ats-card">
                <div class="ats-card-header">
                    <div class="ats-card-title">Key Details</div>
                    <div class="ats-card-toggle">▼</div>
                </div>
                <div class="ats-card-body">
                    <div class="ats-info-list">`;
            
            if (mentionedNames.length > 0) {
                html += `<div class="ats-info-item">
                    <span class="ats-info-label">Names:</span>
                    <span class="ats-info-value">${this.escapeHtml(mentionedNames.join(', '))}</span>
                </div>`;
            }
            if (mentionedLocations.length > 0) {
                html += `<div class="ats-info-item">
                    <span class="ats-info-label">Locations:</span>
                    <span class="ats-info-value">${this.escapeHtml(mentionedLocations.join(', '))}</span>
                </div>`;
            }
            if (mentionedPhones.length > 0) {
                html += `<div class="ats-info-item">
                    <span class="ats-info-label">Phones:</span>
                    <span class="ats-info-value">${this.escapeHtml(mentionedPhones.join(', '))}</span>
                </div>`;
            }
            if (otherInfo) {
                html += `<div class="ats-info-item">
                    <span class="ats-info-label">Other:</span>
                    <span class="ats-info-value">${this.escapeHtml(otherInfo)}</span>
                </div>`;
            }
            html += `</div></div></div>`;
        }

        // Full Transcription Card
        const fullTranscription = analysis?.fullTranscription || '';
        if (fullTranscription) {
            html += `<div class="ats-card">
                <div class="ats-card-header">
                    <div class="ats-card-title">Full Transcription</div>
                    <div class="ats-card-toggle">▼</div>
                </div>
                <div class="ats-card-body">
                    <div class="ats-transcription-box">${this.escapeHtml(fullTranscription)}</div>
                </div>
            </div>`;
        }

        // Salesforce Notes Card
        const salesforceNotes = analysis?.salesforceNotes || '';
        if (salesforceNotes) {
            html += `<div class="ats-card">
                <div class="ats-card-header">
                    <div class="ats-card-title">Salesforce Notes</div>
                    <div class="ats-card-toggle">▼</div>
                </div>
                <div class="ats-card-body">
                    <div class="ats-salesforce-notes">${this.escapeHtml(salesforceNotes)}</div>
                    <button class="ats-copy-notes-btn" id="ats-copy-notes">Copy Notes</button>
                </div>
            </div>`;
        }

        // Recommendation
        const recommendation = analysis?.recommended_department || 'Transfer to appropriate department';
        html += `<div class="ats-recommendation">Recommendation: ${this.escapeHtml(recommendation)}</div>`;

        // Scoring Breakdown Section
        const scoringBreakdown = analysis?.scoringBreakdown || {};
        const scoringExplanation = analysis?.scoringExplanation || '';
        
        if (scoringBreakdown && Object.keys(scoringBreakdown).length > 0) {
            html += `<div class="ats-card ats-scoring-card">
                <div class="ats-card-header">
                    <div class="ats-card-title">Lead Scoring Breakdown</div>
                    <div class="ats-card-toggle">▼</div>
                </div>
                <div class="ats-card-body ats-scoring-body">`;
            
            // Display each scoring factor
            const factors = ['sober_days', 'insurance', 'call_type'];
            for (const factor of factors) {
                if (scoringBreakdown[factor]) {
                    const f = scoringBreakdown[factor];
                    const meetsClass = f.meets_criteria ? 'meets' : 'not-meets';
                    html += `
                        <div class="ats-scoring-factor">
                            <div class="ats-scoring-factor-header">
                                <span class="ats-scoring-factor-name">${factor.replace('_', ' ')}</span>
                                <span class="ats-scoring-factor-status ${meetsClass}">${f.meets_criteria ? '✓' : '✗'}</span>
                            </div>
                            <div class="ats-scoring-factor-details">
                                <span class="ats-scoring-factor-value">${f.value || 'N/A'}</span>
                                <span class="ats-scoring-factor-points">${f.points_awarded || 0}/${f.max_points || 0} pts</span>
                            </div>
                        </div>
                    `;
                }
            }
            
            // Keywords found
            if (scoringBreakdown.keywords_found && scoringBreakdown.keywords_found.length > 0) {
                html += `
                    <div class="ats-scoring-keywords">
                        <span class="ats-scoring-keywords-label">Keywords found:</span>
                        <div class="ats-scoring-keywords-list">
                            ${scoringBreakdown.keywords_found.map(k => `<span class="ats-keyword-tag">${k}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
            
            // Disqualifiers
            if (scoringBreakdown.disqualifiers && scoringBreakdown.disqualifiers.length > 0) {
                html += `
                    <div class="ats-scoring-disqualifiers">
                        <span class="ats-scoring-disqualifiers-label">⚠️ Disqualifiers:</span>
                        <ul class="ats-scoring-disqualifiers-list">
                            ${scoringBreakdown.disqualifiers.map(d => `<li>${d}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            // Explanation
            if (scoringExplanation) {
                html += `
                    <div class="ats-scoring-explanation">
                        <span class="ats-scoring-explanation-label">Explanation:</span>
                        <p class="ats-scoring-explanation-text">${this.escapeHtml(scoringExplanation)}</p>
                    </div>
                `;
            }
            
            html += `</div></div>`;
        }

        // Action Buttons
        const actionType = analysis?.action || 'log_call';
        html += `<div class="ats-button-group">
            <button class="ats-button-primary" data-action="new-lead">✨ New Lead - Create Contact</button>
            <button class="ats-button-secondary" data-action="existing-lead">Existing Lead</button>
            <button class="ats-button-fill-sf" data-action="fill-salesforce" data-form-type="${actionType}">Fill Salesforce (${actionType === 'new_task' ? 'Task' : 'Log Call'})</button>
        </div>`;

        content.innerHTML = html;
        this.setupCollapsibleSections();
        
        // Copy notes handler
        const copyBtn = content.querySelector('#ats-copy-notes');
        if (copyBtn && salesforceNotes) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(salesforceNotes).then(() => {
                    this.showToast('Notes copied to clipboard!', 'success');
                }).catch(() => {
                    this.showToast('Failed to copy notes', 'error');
                });
            });
        }

        this.attachActionHandlers(content, { callerInfo, analysis, phone });
    }

    attachActionHandlers(content, data) {
        content.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const actionType = e.target.getAttribute('data-action');
                const formType = e.target.getAttribute('data-form-type');
                
                // Show loading state
                if (actionType === 'fill-salesforce') {
                    e.target.classList.add('loading');
                    e.target.textContent = '⏳ Opening Salesforce...';
                }
                
                // Include form type for fill-salesforce action
                const payload = { 
                    action: actionType, 
                    ...data,
                    formType: formType
                };
                
                ATS.sendMessage({
                    type: ATS.Messages.ATS_ACTION,
                    payload: payload
                });
            });
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    hide() {
        const overlay = document.getElementById(this.overlayId);
        if (overlay) overlay.remove();
    }
}

window.OverlayUI = OverlayUI;
