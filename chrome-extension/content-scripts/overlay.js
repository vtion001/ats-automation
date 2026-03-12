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
                padding: 14px 18px;
                background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
                border-bottom: 1px solid #3d3d3d;
            }
            .ats-title {
                font-weight: 700;
                color: #4CAF50;
                font-size: 14px;
            }
            .ats-status {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                color: #888;
            }
            .ats-status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
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

    function showData(data) {
        createOverlay();
        const content = document.querySelector(`#${OVERLAY_ID} .ats-overlay-content`);
        
        let html = '';
        
        if (data.phone) {
            html += `
                <div class="ats-field">
                    <div class="ats-field-label">Phone</div>
                    <div class="ats-field-value">${data.phone}</div>
                </div>
            `;
        }
        
        if (data.callerName) {
            html += `
                <div class="ats-field">
                    <div class="ats-field-label">Caller</div>
                    <div class="ats-field-value">${data.callerName}</div>
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
