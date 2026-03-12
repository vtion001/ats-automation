/**
 * Overlay Panel
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
                width: 320px;
                max-height: 400px;
                background: #1e1e1e;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
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
                padding: 12px 16px;
                background: #2d2d2d;
                border-bottom: 1px solid #3d3d3d;
            }
            .ats-title {
                font-weight: 600;
                color: #4CAF50;
            }
            .ats-close-btn {
                background: none;
                border: none;
                color: #999;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            .ats-close-btn:hover { color: #fff; }
            .ats-overlay-content {
                padding: 16px;
                max-height: 340px;
                overflow-y: auto;
            }
            .ats-field {
                margin-bottom: 12px;
            }
            .ats-field-label {
                color: #888;
                font-size: 11px;
                text-transform: uppercase;
                margin-bottom: 4px;
            }
            .ats-field-value {
                color: #fff;
            }
            .ats-button {
                background: #4CAF50;
                color: #fff;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                margin-top: 8px;
            }
            .ats-button:hover { background: #45a049; }
            .ats-button.secondary {
                background: #3d3d3d;
            }
            .ats-button.secondary:hover { background: #4d4d4d; }
            .ats-loading {
                text-align: center;
                color: #888;
                padding: 20px;
            }
            .ats-error {
                color: #ff5252;
                padding: 12px;
                background: rgba(255,82,82,0.1);
                border-radius: 4px;
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
        content.innerHTML = `<div class="ats-loading">${message}</div>`;
    }

    function showError(message) {
        createOverlay();
        const content = document.querySelector(`#${OVERLAY_ID} .ats-overlay-content`);
        content.innerHTML = `<div class="ats-error">${message}</div>`;
    }

    function showData(data) {
        createOverlay();
        const content = document.querySelector(`#${OVERLAY_ID} .ats-overlay-content`);
        
        let html = '';
        for (const [key, value] of Object.entries(data)) {
            if (value) {
                html += `
                    <div class="ats-field">
                        <div class="ats-field-label">${key}</div>
                        <div class="ats-field-value">${value}</div>
                    </div>
                `;
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

    window.atsOverlay = {
        showLoading,
        showError,
        showData,
        hide,
        create: createOverlay
    };
})();
