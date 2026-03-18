/**
 * Overlay Panel - Enhanced
 * Injects floating overlay for automation results
 */

(function() {
    'use strict';

    const OVERLAY_ID = 'ats-automation-overlay';

    function createOverlay() {
        if (document.getElementById(OVERLAY_ID)) return;

        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.innerHTML = `
            <div class="ats-overlay-header">
                <span class="ats-title">ATS Automation</span>
                <button class="ats-close-btn">&times;</button>
            </div>
            <div class="ats-overlay-content"></div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #${OVERLAY_ID} {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 350px;
                max-height: 500px;
                background: #1e1e1e;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                color: #fff;
                overflow: hidden;
                animation: ats-slide-in 0.3s ease;
            }
            @keyframes ats-slide-in {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .ats-overlay-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 16px;
                background: #1e3a5f;
                border-bottom: none;
            }
            .ats-title {
                font-weight: 600;
                color: #ffffff;
                font-size: 14px;
            }
            .ats-status {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                color: rgba(255,255,255,0.7);
            }
            .ats-status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #3182ce;
                background: #4CAF50;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            .ats-close-btn {
                background: none;
                border: none;
                color: #999;
                font-size: 22px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            .ats-close-btn:hover { color: #fff; }
            .ats-overlay-content {
                padding: 18px;
                max-height: 420px;
                overflow-y: auto;
            }
            .ats-field {
                margin-bottom: 14px;
            }
            .ats-field-label {
                color: #888;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            .ats-field-value {
                color: #fff;
                font-size: 14px;
                word-break: break-word;
            }
            .ats-button {
                background: #4CAF50;
                color: #fff;
                border: none;
                padding: 10px 18px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                margin: 4px;
                transition: all 0.2s;
            }
            .ats-button:hover { 
                background: #45a049; 
                transform: translateY(-1px);
            }
            .ats-button.secondary {
                background: #3d3d3d;
            }
            .ats-button.secondary:hover { background: #4d4d4d; }
            .ats-loading {
                text-align: center;
                color: #888;
                padding: 30px;
            }
            .ats-loading-spinner {
                width: 30px;
                height: 30px;
                border: 3px solid #3d3d3d;
                border-top-color: #4CAF50;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .ats-error {
                color: #ff5252;
                padding: 14px;
                background: rgba(255,82,82,0.1);
                border-radius: 6px;
                font-size: 13px;
            }
            .ats-notification {
                padding: 12px 16px;
                background: rgba(76, 175, 80, 0.15);
                border-left: 3px solid #4CAF50;
                border-radius: 4px;
                margin-bottom: 12px;
                font-size: 13px;
            }
            .ats-tag {
                display: inline-block;
                padding: 3px 10px;
                border-radius: 12px;
                font-size: 11px;
                margin: 2px;
                font-weight: 500;
            }
            .ats-tag.hot-lead { background: #ff5722; color: #fff; }
            .ats-tag.unqualified { background: #9e9e9e; color: #fff; }
            .ats-tag.follow-up { background: #2196F3; color: #fff; }
            .ats-tag.pricing-inquiry { background: #9C27B0; color: #fff; }
            .ats-transcription {
                max-height: 150px;
                overflow-y: auto;
                background: #2a2a2a;
                padding: 12px;
                border-radius: 6px;
                font-size: 12px;
                line-height: 1.5;
                color: #ccc;
            }
            .ats-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 14px;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(overlay);

        overlay.querySelector('.ats-close-btn').addEventListener('click', () => {
            overlay.remove();
        });
    }

    function showLoading(message = 'Loading...') {
        createOverlay();
        const content = document.querySelector(`#${OVERLAY_ID} .ats-overlay-content`);
        content.innerHTML = `
            <div class="ats-loading">
                <div class="ats-loading-spinner"></div>
                ${message}
            </div>
        `;
    }

    function showError(message) {
        createOverlay();
        const content = document.querySelector(`#${OVERLAY_ID} .ats-overlay-content`);
        content.innerHTML = `<div class="ats-error">${message}</div>`;
    }

    function showNotification(message) {
        createOverlay();
        const content = document.querySelector(`#${OVERLAY_ID} .ats-overlay-content`);
        const existing = content.querySelector('.ats-notification');
        
        const notif = document.createElement('div');
        notif.className = 'ats-notification';
        notif.textContent = message;
        
        if (existing) {
            content.insertBefore(notif, existing);
        } else {
            content.prepend(notif);
        }
        
        setTimeout(() => notif.remove(), 5000);
    }

    function escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function showCallInProgress(phoneNumber, callerName) {
        createOverlay();
        const content = document.querySelector(`#${OVERLAY_ID} .ats-overlay-content`);
        
        const displayPhone = escapeHtml(phoneNumber) || 'Unknown';
        const displayName = escapeHtml(callerName) || 'Unknown Caller';
        
        content.innerHTML = `
            <div class="ats-call-in-progress">
                <div class="ats-call-header">
                    <div class="ats-call-icon"></div>
                    <div class="ats-call-info">
                        <div class="ats-call-phone">${displayPhone}</div>
                        <div class="ats-call-name">${displayName}</div>
                    </div>
                    <div class="ats-call-status">CALLING</div>
                </div>
                <div class="ats-recording-prompt">
                    <div style="text-align: center; margin-bottom: 12px;">
                        <div style="font-size: 24px; margin-bottom: 6px; color: #1e3a5f;">●</div>
                        <div style="font-weight: 600; margin-bottom: 2px;">Record this call?</div>
                        <div style="font-size: 11px; color: #888;">Click below to capture audio</div>
                    </div>
                    <button class="ats-start-recording-btn" id="ats-start-recording">
                        Start Recording
                    </button>
                </div>
            </div>
        `;
        
        const startBtn = content.querySelector('#ats-start-recording');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    type: 'START_AUDIO_CAPTURE',
                    payload: { phoneNumber, callerName }
                });
            });
        }
        
        // Add styles for call in progress
        const style = document.createElement('style');
        style.textContent = `
            .ats-call-in-progress {
                padding: 0;
            }
            .ats-call-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
                border-bottom: 1px solid #3d3d3d;
            }
            .ats-call-icon {
                width: 44px;
                height: 44px;
                background: #f59e0b;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
            }
            .ats-call-info {
                flex: 1;
            }
            .ats-call-phone {
                font-size: 18px;
                font-weight: 700;
                color: #fff;
            }
            .ats-call-name {
                font-size: 12px;
                color: #888;
            }
            .ats-call-status {
                background: #f59e0b;
                color: #000;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 700;
            }
            .ats-recording-prompt {
                padding: 20px;
                text-align: center;
            }
            .ats-start-recording-btn {
                width: 100%;
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: #fff;
                border: none;
                padding: 14px 20px;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            .ats-start-recording-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(34, 197, 94, 0.4);
            }
        `;
        document.head.appendChild(style);
    }

    function showCallAnalysisOverlay(payload) {
        createOverlay();
        const content = document.querySelector(`#${OVERLAY_ID} .ats-overlay-content`);

        const phone = payload.phone || '';
        const callerName = payload.caller_name || payload.callerName || '';
        const analysis = payload.analysis || {};
        const score = analysis.qualification_score ?? payload.qualification_score ?? 0;
        const sentiment = analysis.sentiment || payload.sentiment || 'neutral';
        const summary = analysis.summary || payload.summary || '';
        const tags = analysis.tags || payload.tags || [];
        const disposition = analysis.suggested_disposition || payload.suggested_disposition || 'New';
        const notes = analysis.salesforce_notes || payload.salesforce_notes || '';
        const state = analysis.detected_state || payload.state || '';
        const insurance = analysis.detected_insurance || payload.insurance || '';
        const transcript = analysis.full_transcription || payload.transcript || payload.transcription || '';

        const scoreClass = score >= 70 ? 'hot-lead' : score >= 40 ? 'follow-up' : 'unqualified';
        const scoreLabel = score >= 70 ? 'Hot Lead' : score >= 40 ? 'Warm Lead' : 'Cold Lead';
        const scoreColor = score >= 70 ? '#ff5722' : score >= 40 ? '#f59e0b' : '#9e9e9e';

        let html = `
            <div style="padding: 14px 16px; background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%); border-bottom: 1px solid #3d3d3d;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 44px; height: 44px; background: ${scoreColor}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff;">
                        ${score}
                    </div>
                    <div>
                        <div style="font-size: 16px; font-weight: 700; color: #fff;">${scoreLabel}</div>
                        <div style="font-size: 12px; color: #888;">${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} sentiment</div>
                    </div>
                    ${phone ? `<div style="margin-left: auto; font-size: 14px; color: #aaa; font-family: monospace;">${escapeHtml(phone)}</div>` : ''}
                </div>
            </div>
            <div style="padding: 14px 16px;">
        `;

        if (tags.length > 0) {
            html += `<div style="margin-bottom: 12px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 6px;">Tags</div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${tags.map(tag => `<span class="ats-tag ${tag}">${escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>`;
        }

        if (state || insurance) {
            html += `<div style="margin-bottom: 12px; display: flex; gap: 16px; font-size: 13px;">
                ${state ? `<div><span style="color: #666;">State:</span> <span style="color: #fff;">${escapeHtml(state)}</span></div>` : ''}
                ${insurance ? `<div><span style="color: #666;">Insurance:</span> <span style="color: #fff;">${escapeHtml(insurance)}</span></div>` : ''}
            </div>`;
        }

        if (summary) {
            html += `<div style="margin-bottom: 12px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 6px;">Summary</div>
                <div style="font-size: 13px; color: #ccc; line-height: 1.4;">${escapeHtml(summary)}</div>
            </div>`;
        }

        if (transcript) {
            html += `<div style="margin-bottom: 12px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 6px;">Transcript</div>
                <div class="ats-transcription">${escapeHtml(transcript)}</div>
            </div>`;
        }

        if (notes) {
            html += `<div style="margin-bottom: 12px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 6px;">Salesforce Notes</div>
                <div style="background: rgba(49, 130, 206, 0.15); padding: 10px; border-radius: 6px; font-size: 12px; color: #ccc; line-height: 1.4; border: 1px solid rgba(49, 130, 206, 0.2); margin-bottom: 8px;">${escapeHtml(notes)}</div>
                <button class="ats-copy-notes-btn" id="ats-copy-notes" style="background: #2d2d2d; border: 1px solid #444; color: #aaa; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    Copy Notes
                </button>
            </div>`;
        }

        html += `
                <div style="font-size: 12px; color: #666; text-align: center; padding-top: 10px; border-top: 1px solid #333;">
                    Disposition: <span style="color: #fff;">${escapeHtml(disposition)}</span>
                </div>
            </div>
        `;

        content.innerHTML = html;

        const copyBtn = document.getElementById('ats-copy-notes');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(notes).then(() => {
                    const orig = copyBtn.textContent;
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => { copyBtn.textContent = orig; }, 1500);
                });
            });
        }
    }

    function showData(data) {
        createOverlay();
        const content = document.querySelector(`#${OVERLAY_ID} .ats-overlay-content`);
        
        let html = '';
        
        if (data.phone) {
            html += `
                <div class="ats-field">
                    <div class="ats-field-label">Phone</div>
                    <div class="ats-field-value">${escapeHtml(data.phone)}</div>
                </div>
            `;
        }
        
        if (data.callerName) {
            html += `
                <div class="ats-field">
                    <div class="ats-field-label">Caller</div>
                    <div class="ats-field-value">${escapeHtml(data.callerName)}</div>
                </div>
            `;
        }
        
        if (data.status) {
            html += `
                <div class="ats-field">
                    <div class="ats-field-label">Status</div>
                    <div class="ats-field-value">${data.status}</div>
                </div>
            `;
        }

        if (data.tags && data.tags.length > 0) {
            html += `
                <div class="ats-field">
                    <div class="ats-field-label">Tags</div>
                    <div class="ats-field-value">
                        ${data.tags.map(tag => `<span class="ats-tag ${tag}">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        if (data.summary) {
            html += `
                <div class="ats-field">
                    <div class="ats-field-label">Summary</div>
                    <div class="ats-field-value">${data.summary}</div>
                </div>
            `;
        }

        if (data.transcription) {
            html += `
                <div class="ats-field">
                    <div class="ats-field-label">Transcription</div>
                    <div class="ats-transcription">${data.transcription}</div>
                </div>
            `;
        }

        if (data.actions) {
            html += '<div class="ats-actions">';
            for (const action of data.actions) {
                html += `<button class="ats-button ${action.secondary ? 'secondary' : ''}" data-action="${action.type}">${action.label}</button>`;
            }
            html += '</div>';
        }

        content.innerHTML = html;

        content.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const actionType = e.target.getAttribute('data-action');
                chrome.runtime.sendMessage({
                    type: 'ATS_ACTION',
                    payload: { action: actionType, data }
                });
            });
        });
    }

    function hideOverlay() {
        const overlay = document.getElementById(OVERLAY_ID);
        if (overlay) overlay.remove();
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
            case 'SHOW_OVERLAY':
                showData(message.data);
                break;
            case 'SHOW_NOTIFICATION':
                showNotification(message.payload.message);
                break;
            case 'SHOW_CALL_SUMMARY':
                showData(message.payload);
                break;
            case 'SHOW_CALL_IN_PROGRESS':
                showCallInProgress(message.payload.phoneNumber, message.payload.callerName);
                break;
            case 'SHOW_CALL_ANALYSIS':
                showCallAnalysisOverlay(message.payload);
                break;
            case 'START_AUDIO_CAPTURE':
                console.log('[ATS] START_AUDIO_CAPTURE received in overlay.js');
                break;
            case 'AI_ANALYSIS_RESULT':
                showData(message.payload);
                break;
        }
    });

    window.atsOverlay = {
        showLoading,
        showError,
        showData,
        showNotification,
        hide,
        create: createOverlay
    };
})();
