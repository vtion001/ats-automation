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
            .ats-title { font-weight: 700; color: #4CAF50; font-size: 14px; }
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
            .ats-overlay-content { padding: 18px; max-height: 420px; overflow-y: auto; }
            .ats-field { margin-bottom: 14px; }
            .ats-field-label { color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
            .ats-field-value { color: #fff; font-size: 14px; word-break: break-word; }
            .ats-button {
                background: #4CAF50; color: #fff; border: none;
                padding: 10px 18px; border-radius: 6px; cursor: pointer;
                font-size: 13px; font-weight: 500; margin: 4px; transition: all 0.2s;
            }
            .ats-button:hover { background: #45a049; transform: translateY(-1px); }
            .ats-button.secondary { background: #3d3d3d; }
            .ats-button.secondary:hover { background: #4d4d4d; }
            .ats-notification {
                padding: 12px 16px; background: rgba(76, 175, 80, 0.15);
                border-left: 3px solid #4CAF50; border-radius: 4px; margin-bottom: 12px; font-size: 13px;
            }
            .ats-tag {
                display: inline-block; padding: 3px 10px; border-radius: 12px;
                font-size: 11px; margin: 2px; font-weight: 500;
            }
            .ats-tag.hot-lead { background: #ff5722; color: #fff; }
            .ats-tag.unqualified { background: #9e9e9e; color: #fff; }
            .ats-tag.follow-up { background: #2196F3; color: #fff; }
            .ats-tag.pricing { background: #9C27B0; color: #fff; }
            .ats-transcription {
                max-height: 150px; overflow-y: auto; background: #2a2a2a;
                padding: 12px; border-radius: 6px; font-size: 12px; line-height: 1.5; color: #ccc;
            }
            .ats-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
            .ats-loading { text-align: center; color: #888; padding: 30px; }
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

    // Show data in overlay
    showData(data) {
        this.create();
        const content = document.querySelector(`#${this.overlayId} .ats-overlay-content`);
        
        let html = '';
        
        if (data.phone) {
            html += `<div class="ats-field"><div class="ats-field-label">Phone</div><div class="ats-field-value">${data.phone}</div></div>`;
        }
        if (data.callerName) {
            html += `<div class="ats-field"><div class="ats-field-label">Caller</div><div class="ats-field-value">${data.callerName}</div></div>`;
        }
        if (data.status) {
            html += `<div class="ats-field"><div class="ats-field-label">Status</div><div class="ats-field-value">${data.status}</div></div>`;
        }
        if (data.tags && data.tags.length > 0) {
            html += `<div class="ats-field"><div class="ats-field-label">Tags</div><div class="ats-field-value">${data.tags.map(tag => `<span class="ats-tag ${tag}">${tag}</span>`).join('')}</div></div>`;
        }
        if (data.summary) {
            html += `<div class="ats-field"><div class="ats-field-label">Summary</div><div class="ats-field-value">${data.summary}</div></div>`;
        }
        if (data.suggestedNotes) {
            html += `<div class="ats-field"><div class="ats-field-label">Notes</div><div class="ats-field-value">${data.suggestedNotes}</div></div>`;
        }
        if (data.suggestedDisposition) {
            html += `<div class="ats-field"><div class="ats-field-label">Disposition</div><div class="ats-field-value">${data.suggestedDisposition}</div></div>`;
        }

        if (data.actions) {
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

    // Hide overlay
    hide() {
        const overlay = document.getElementById(this.overlayId);
        if (overlay) overlay.remove();
    }
}

window.OverlayUI = OverlayUI;
