/**
 * Overlay Module Index
 * Modular structure for the Overlay UI component
 * 
 * Architecture:
 * - overlay-ui.js: Main UI controller (contains inline styles/templates for backward compatibility)
 * - overlay-styles.js: Extracted CSS styles
 * - overlay-templates.js: Extracted HTML templates
 * 
 * To fully refactor:
 * 1. Load overlay-styles.js before overlay-ui.js
 * 2. Load overlay-templates.js before overlay-ui.js
 * 3. Update overlay-ui.js to use the imported modules
 */

const OverlayModule = {
    version: '1.0.0',
    components: {
        styles: null,
        templates: null,
        ui: null
    },
    
    async init() {
        // Lazy load styles and templates
        // For now, use inline versions in overlay-ui.js
        console.log('[OverlayModule] Initialized');
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OverlayModule;
}
