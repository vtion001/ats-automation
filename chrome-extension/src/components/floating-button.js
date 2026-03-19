/**
 * Floating Button Component
 * 
 * Creates a sticky floating button that can toggle the overlay.
 * Shows call status and allows quick access to analysis.
 */

import { formatPhone } from '../utils/phone-utils.js';
import { UIGenerator } from '../generators/overlay-generator.js';

export class FloatingButton {
    constructor(options = {}) {
        this.serverUrl = options.serverUrl || 'https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io';
        this.currentCall = null;
        this.isVisible = false;
        this.element = null;
    }

    /**
     * Create floating button element
     */
    create() {
        if (this.element) return this.element;

        // Create styles
        this.createStyles();

        // Create button
        this.element = document.createElement('div');
        this.element.id = 'ats-floating-btn';
        this.element.innerHTML = this.getButtonHTML();
        
        // Add to page
        document.body.appendChild(this.element);

        // Bind events
        this.bindEvents();

        return this.element;
    }

    /**
     * Create button styles
     */
    createStyles() {
        if (document.getElementById('ats-floating-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'ats-floating-styles';
        styles.textContent = `
            #ats-floating-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 999998;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .ats-fab {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .ats-fab:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 24px rgba(102, 126, 234, 0.5);
            }
            .ats-fab svg { width: 28px; height: 28px; fill: white; }
            .ats-fab.has-call {
                background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { box-shadow: 0 4px 16px rgba(39, 174, 96, 0.4); }
                50% { box-shadow: 0 4px 24px rgba(39, 174, 96, 0.7); }
            }
            .ats-fab-tooltip {
                position: absolute;
                bottom: 70px;
                right: 0;
                background: #333;
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s;
            }
            #ats-floating-btn:hover .ats-fab-tooltip { opacity: 1; }
            .ats-fab-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #e74c3c;
                color: white;
                font-size: 11px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Get button HTML
     */
    getButtonHTML() {
        const icon = this.currentCall 
            ? '<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>';
        
        const badge = this.currentCall 
            ? '<span class="ats-fab-badge">1</span>' 
            : '';

        return `
            <button class="ats-fab ${this.currentCall ? 'has-call' : ''}">
                ${icon}
                ${badge}
            </button>
            <div class="ats-fab-tooltip">
                ${this.currentCall ? `📞 ${formatPhone(this.currentCall)}` : 'ATS Monitor'}
            </div>
        `;
    }

    /**
     * Bind click events
     */
    bindEvents() {
        const btn = this.element.querySelector('.ats-fab');
        if (btn) {
            btn.addEventListener('click', () => this.toggleOverlay());
        }
    }

    /**
     * Toggle analysis overlay
     */
    toggleOverlay() {
        let overlay = document.getElementById('ats-automation-overlay');
        
        if (overlay) {
            overlay.remove();
            this.isVisible = false;
        } else {
            this.showOverlay();
            this.isVisible = true;
        }
    }

    /**
     * Show analysis overlay
     */
    showOverlay() {
        let overlay = document.getElementById('ats-automation-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'ats-automation-overlay';

        if (this.currentCall) {
            overlay.innerHTML = UIGenerator.generateCallDetectedOverlay(this.currentCall);
        } else {
            overlay.innerHTML = UIGenerator.generateWaitingOverlay('Click to view analysis');
        }

        // Add styles
        if (!document.getElementById('ats-overlay-styles')) {
            const styles = document.createElement('style');
            styles.id = 'ats-overlay-styles';
            styles.textContent = UIGenerator.getOverlayStyles();
            document.head.appendChild(styles);
        }

        document.body.appendChild(overlay);

        // Bind close button
        overlay.querySelector('[data-action="close"]')?.addEventListener('click', () => {
            overlay.remove();
            this.isVisible = false;
        });
    }

    /**
     * Update with current call
     */
    setCurrentCall(phone) {
        this.currentCall = phone;
        if (this.element) {
            this.element.innerHTML = this.getButtonHTML();
            this.bindEvents();
        }

        // If overlay is visible, update it
        const overlay = document.getElementById('ats-automation-overlay');
        if (overlay && phone) {
            overlay.innerHTML = UIGenerator.generateCallDetectedOverlay(phone);
        }
    }

    /**
     * Remove floating button
     */
    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}

export default FloatingButton;
