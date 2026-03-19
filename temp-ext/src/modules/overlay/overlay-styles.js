/**
 * Overlay Styles Module
 * Contains all CSS styles for the overlay UI
 * Enterprise 2-Color Theme: Primary #1e3a5f, Accent #3182ce
 */

const OverlayStyles = {
    getStyles(overlayId) {
        return `
            #${overlayId} {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 380px;
                max-height: 90vh;
                background: #ffffff;
                border-radius: 4px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                color: #1a202c;
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
                padding: 14px 16px;
                background: #1e3a5f;
                border-bottom: none;
                flex-shrink: 0;
            }
            .ats-title { font-weight: 600; color: #ffffff; font-size: 14px; }
            .ats-close-btn {
                background: rgba(255,255,255,0.1);
                border: none;
                color: rgba(255,255,255,0.8);
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            }
            .ats-close-btn:hover { color: #fff; background: rgba(255,255,255,0.2); }
            
            .ats-overlay-content {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 16px;
            }

            /* Toast Container */
            .ats-toast-container {
                position: absolute;
                top: 60px;
                left: 16px;
                right: 16px;
                z-index: 100;
                pointer-events: none;
            }
            .ats-toast {
                padding: 10px 14px;
                border-radius: 4px;
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
            .ats-score-badge.high { background: #dcfce7; color: #166534; }
            .ats-score-badge.medium { background: #fef3c7; color: #92400e; }
            .ats-score-badge.low { background: #fee2e2; color: #991b1b; }
            
            /* Status Indicator */
            .ats-status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                display: inline-block;
            }
            .ats-status-indicator.online { background: #10b981; }
            .ats-status-indicator.offline { background: #94a3b8; }
            
            /* Sections */
            .ats-section {
                background: white;
                border-radius: 12px;
                margin-bottom: 12px;
                overflow: hidden;
            }
            .ats-section-header {
                padding: 14px 16px;
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                font-weight: 600;
                font-size: 13px;
                color: #475569;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
            }
            .ats-section-header:hover { background: #f1f5f9; }
            .ats-section-content { padding: 16px; }
            
            /* Form Elements */
            .ats-input {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                font-size: 13px;
                transition: border-color 0.2s;
                box-sizing: border-box;
            }
            .ats-input:focus {
                outline: none;
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
            }
            .ats-btn {
                padding: 10px 16px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }
            .ats-btn-primary {
                background: #2563eb;
                color: white;
            }
            .ats-btn-primary:hover { background: #1d4ed8; }
            .ats-btn-secondary {
                background: #f1f5f9;
                color: #475569;
            }
            .ats-btn-secondary:hover { background: #e2e8f0; }
            
            /* Loading Spinner */
            .ats-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #e2e8f0;
                border-top-color: #2563eb;
                border-radius: 50%;
                animation: ats-spin 0.8s linear infinite;
            }
            @keyframes ats-spin {
                to { transform: rotate(360deg); }
            }
            
            /* Utility Classes */
            .ats-mt-2 { margin-top: 8px; }
            .ats-mt-4 { margin-top: 16px; }
            .ats-mb-2 { margin-bottom: 8px; }
            .ats-mb-4 { margin-bottom: 16px; }
            .ats-text-sm { font-size: 12px; }
            .ats-text-muted { color: #64748b; }
            .ats-font-medium { font-weight: 500; }
            .ats-font-bold { font-weight: 700; }
            .ats-flex { display: flex; }
            .ats-items-center { align-items: center; }
            .ats-justify-between { justify-content: space-between; }
            .ats-gap-2 { gap: 8px; }
            .ats-gap-4 { gap: 16px; }
        `;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OverlayStyles;
}
