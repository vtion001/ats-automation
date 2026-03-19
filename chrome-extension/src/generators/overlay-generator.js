/**
 * UI Generator - Creates analysis overlay and UI components
 */

import { formatPhone } from '../utils/phone-utils.js';
import { SCORE_THRESHOLDS } from '../utils/constants.js';

export const UIGenerator = {
    /**
     * Get score class based on score value
     */
    getScoreClass(score) {
        if (score >= SCORE_THRESHOLDS.HOT) return 'hot';
        if (score >= SCORE_THRESHOLDS.WARM) return 'warm';
        return 'cold';
    },

    /**
     * Get status label based on score
     */
    getStatusLabel(score) {
        if (score >= SCORE_THRESHOLDS.HOT) return 'Hot Lead';
        if (score >= SCORE_THRESHOLDS.WARM) return 'Warm Lead';
        return 'Cold Lead';
    },

    /**
     * Generate tags HTML
     */
    generateTags(tags) {
        if (!tags || tags.length === 0) return '';
        return `
            <div class="ats-tags">
                ${tags.map(t => `<span class="ats-tag">${t}</span>`).join('')}
            </div>
        `;
    },

    /**
     * Generate analysis overlay HTML
     */
    generateAnalysisOverlay(analysis, phone, callId) {
        const score = analysis.score || 0;
        const scoreClass = this.getScoreClass(score);
        const statusLabel = this.getStatusLabel(score);
        const sentiment = analysis.sentiment || 'neutral';
        const summary = analysis.summary || 'No summary available';
        const disposition = analysis.disposition || 'New';

        return `
            <div class="ats-overlay-header">
                <span class="ats-title">📊 Call Analysis</span>
                <button class="ats-close-btn" data-action="close">×</button>
            </div>
            <div class="ats-overlay-content">
                <div class="ats-header-section">
                    <div class="ats-phone-icon">
                        <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path></svg>
                    </div>
                    <span class="ats-phone-number">${formatPhone(phone)}</span>
                    <div class="ats-status-row">
                        <span class="ats-score-badge ${scoreClass}">${score}</span>
                        <span class="ats-status-label ${scoreClass}">${statusLabel}</span>
                    </div>
                </div>
                
                <div class="ats-card">
                    <div class="ats-card-header">
                        <div class="ats-card-title">📋 Key Details</div>
                    </div>
                    <div class="ats-card-body">
                        <div class="ats-info-list">
                            <div class="ats-info-item">
                                <span class="ats-info-label">Sentiment:</span>
                                <span class="ats-info-value">${sentiment}</span>
                            </div>
                            <div class="ats-info-item">
                                <span class="ats-info-label">Disposition:</span>
                                <span class="ats-info-value">${disposition}</span>
                            </div>
                            <div class="ats-info-item">
                                <span class="ats-info-label">Follow-up:</span>
                                <span class="ats-info-value">${analysis.follow_up ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="ats-card">
                    <div class="ats-card-header">
                        <div class="ats-card-title">📝 Summary</div>
                    </div>
                    <div class="ats-card-body">
                        <div class="ats-summary">${summary}</div>
                        <button class="ats-copy-btn" data-action="copy">📋 Copy Notes</button>
                    </div>
                </div>
                
                <div class="ats-tags-section">
                    ${this.generateTags(analysis.tags)}
                </div>
            </div>
        `;
    },

    /**
     * Generate waiting overlay
     */
    generateWaitingOverlay(message = 'Monitoring for calls...') {
        return `
            <div class="ats-overlay-header">
                <span class="ats-title">📞 ATS Monitor</span>
                <button class="ats-close-btn" data-action="close">×</button>
            </div>
            <div class="ats-overlay-content">
                <div class="ats-waiting-state">
                    <div class="ats-waiting-icon">📞</div>
                    <div class="ats-waiting-text">${message}</div>
                </div>
            </div>
        `;
    },

    /**
     * Generate call detected overlay
     */
    generateCallDetectedOverlay(phone) {
        return `
            <div class="ats-overlay-header">
                <span class="ats-title">📞 Call Detected</span>
                <button class="ats-close-btn" data-action="close">×</button>
            </div>
            <div class="ats-overlay-content">
                <div class="ats-header-section">
                    <div class="ats-phone-icon ringing">
                        <svg viewBox="0 0 24 24" class="ringing-icon"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path></svg>
                    </div>
                    <span class="ats-phone-number">${formatPhone(phone)}</span>
                    <div class="ats-status-row">
                        <span class="ats-call-state active">● Ringing...</span>
                    </div>
                </div>
                <div class="ats-waiting-note">
                    Call will be analyzed automatically when it ends.
                </div>
            </div>
        `;
    },

    /**
     * Generate error overlay
     */
    generateErrorOverlay(message = 'Analysis unavailable') {
        return `
            <div class="ats-overlay-header error">
                <span class="ats-title">⚠️ Error</span>
                <button class="ats-close-btn" data-action="close">×</button>
            </div>
            <div class="ats-overlay-content">
                <div class="ats-error-message">${message}</div>
            </div>
        `;
    },

    /**
     * Get overlay CSS styles
     */
    getOverlayStyles() {
        return `
            #ats-automation-overlay {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 380px;
                max-height: 90vh;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                overflow: hidden;
            }
            .ats-overlay-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .ats-overlay-header.error { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
            .ats-title { font-weight: 600; font-size: 16px; }
            .ats-close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            .ats-overlay-content { padding: 16px; max-height: calc(90vh - 60px); overflow-y: auto; }
            .ats-header-section { text-align: center; margin-bottom: 16px; }
            .ats-phone-icon { width: 48px; height: 48px; margin: 0 auto 8px; }
            .ats-phone-icon svg { width: 100%; height: 100%; fill: #667eea; }
            .ats-phone-icon.ringing svg { fill: #27ae60; }
            .ringing-icon { animation: ring 1s infinite; }
            @keyframes ring { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(15deg); } 75% { transform: rotate(-15deg); } }
            .ats-phone-number { font-size: 20px; font-weight: 600; display: block; margin-top: 8px; }
            .ats-status-row { display: flex; justify-content: center; gap: 12px; margin-top: 12px; }
            .ats-call-state { padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; }
            .ats-call-state.active { background: #27ae60; color: white; }
            .ats-waiting-state { text-align: center; padding: 24px; }
            .ats-waiting-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.6; }
            .ats-waiting-text { color: #666; font-size: 14px; }
            .ats-waiting-note { text-align: center; color: #999; font-size: 12px; margin-top: 12px; }
            .ats-error-message { text-align: center; padding: 20px; color: #e74c3c; }
            .ats-score-badge {
                width: 50px; height: 50px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                font-size: 18px; font-weight: 700; color: white;
            }
            .ats-score-badge.hot { background: #e74c3c; }
            .ats-score-badge.warm { background: #f39c12; }
            .ats-score-badge.cold { background: #3498db; }
            .ats-status-label { font-size: 14px; padding-top: 15px; }
            .ats-status-label.hot { color: #e74c3c; }
            .ats-status-label.warm { color: #f39c12; }
            .ats-status-label.cold { color: #3498db; }
            .ats-card { border: 1px solid #eee; border-radius: 8px; margin-bottom: 12px; }
            .ats-card-header { padding: 12px; background: #f8f9fa; }
            .ats-card-title { font-weight: 600; font-size: 14px; }
            .ats-card-body { padding: 12px; }
            .ats-info-list { display: flex; flex-direction: column; gap: 8px; }
            .ats-info-item { display: flex; gap: 8px; font-size: 13px; }
            .ats-info-label { font-weight: 500; color: #666; }
            .ats-info-value { color: #333; }
            .ats-summary { font-size: 14px; line-height: 1.5; color: #333; margin-bottom: 12px; }
            .ats-copy-btn {
                background: #f0f0f0; border: none; padding: 8px 16px;
                border-radius: 4px; cursor: pointer; font-size: 12px;
            }
            .ats-copy-btn:hover { background: #e0e0e0; }
            .ats-tags { display: flex; flex-wrap: wrap; gap: 6px; }
            .ats-tag { font-size: 11px; padding: 3px 10px; border-radius: 20px; background: rgba(102, 126, 234, 0.1); color: #667eea; font-weight: 500; }
        `;
    }
};

export default UIGenerator;
