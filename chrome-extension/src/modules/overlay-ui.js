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
            .ats-overlay-content { padding: 18px; max-height: 420px; overflow-y: auto; }
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
            html += `<div class="ats-field"><div class="ats-field-label">Notes</div><div class="ats-field-value" style="white-space: pre-line;">${data.suggestedNotes}</div></div>`;
        }
        if (data.suggestedDisposition) {
            html += `<div class="ats-field"><div class="ats-field-label">Disposition</div><div class="ats-field-value">${data.suggestedDisposition}</div></div>`;
        }

        // Show Salesforce Action (Log a Call vs New Task)
        if (data.action) {
            const actionLabel = data.action === 'new_task' ? 'New Task' : 'Log a Call';
            html += `<div class="ats-field"><div class="ats-field-label">Recommended Action</div>`;
            html += `<div class="ats-field-value"><span class="ats-status-badge ${data.action}">${actionLabel}</span></div></div>`;
            
            if (data.reason) {
                html += `<div class="ats-action-reason">${data.reason}</div>`;
            }
            
            if (data.taskSubject && data.action === 'new_task') {
                html += `<div class="ats-field"><div class="ats-field-label">Task Subject</div><div class="ats-field-value">${data.taskSubject}</div></div>`;
                html += `<div class="ats-field"><div class="ats-field-label">Due Date</div><div class="ats-field-value">${data.taskDueDate}</div></div>`;
            }
            
            if (data.callSubject && data.action === 'log_call') {
                html += `<div class="ats-field"><div class="ats-field-label">Call Subject</div><div class="ats-field-value">${data.callSubject}</div></div>`;
            }
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
