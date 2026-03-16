/**
 * Base Monitor Class
 * Abstract base for content script monitors
 * Provides common functionality for CTM, Salesforce, Zoho monitors
 */

class BaseMonitor {
    constructor(options = {}) {
        this.systemName = options.systemName || 'unknown';
        this.selectors = options.selectors || {};
        this.enabled = true;
        this.initialized = false;
        this.observer = null;
        this.messageBus = null;
    }

    /**
     * Initialize the monitor
     */
    async init() {
        console.log(`[${this.systemName} Monitor] Initializing...`);
        
        // Load client config if ClientManager is available
        if (window.ClientManager) {
            const clientId = await this.getCurrentClientId();
            const systemConfig = window.ClientManager.getSystemConfig(this.systemName);
            
            if (systemConfig && !systemConfig.enabled) {
                console.log(`[${this.systemName} Monitor] Disabled in config`);
                this.enabled = false;
                return;
            }

            // Load DOM profile
            const domProfile = window.ClientManager.getDOMProfile(this.systemName);
            if (domProfile?.selectors) {
                this.selectors = { ...this.selectors, ...domProfile.selectors };
            }
        }

        // Set up message bus
        if (window.messageBus) {
            this.messageBus = window.messageBus;
        }

        // Initialize specific monitor
        await this.onInit();

        this.initialized = true;
        console.log(`[${this.systemName} Monitor] Initialized`);
    }

    /**
     * Get current client ID
     */
    async getCurrentClientId() {
        if (window.StorageService) {
            const config = await window.StorageService.getConfig();
            return config.activeClient || 'flyland';
        }
        return 'flyland';
    }

    /**
     * Override in subclass for custom initialization
     */
    async onInit() {}

    /**
     * Start monitoring
     */
    start() {
        if (!this.enabled) return;
        
        this.setupObserver();
        this.onStart();
        console.log(`[${this.systemName} Monitor] Started`);
    }

    /**
     * Override in subclass
     */
    onStart() {}

    /**
     * Stop monitoring
     */
    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.onStop();
        console.log(`[${this.systemName} Monitor] Stopped`);
    }

    /**
     * Override in subclass
     */
    onStop() {}

    /**
     * Set up mutation observer
     */
    setupObserver(config = {}) {
        const defaultConfig = {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-call-status', 'data-state']
        };

        this.observer = new MutationObserver((mutations) => {
            this.handleMutations(mutations);
        });

        this.observer.observe(document.body, { ...defaultConfig, ...config });
    }

    /**
     * Handle mutations - override in subclass
     */
    handleMutations(mutations) {
        // Override in subclass
    }

    /**
     * Query selector helper
     */
    $(selector) {
        return document.querySelector(selector);
    }

    /**
     * Query selector all helper
     */
    $$(selector) {
        return document.querySelectorAll(selector);
    }

    /**
     * Send message to background
     */
    sendMessage(type, payload) {
        if (this.messageBus) {
            this.messageBus.sendToBackground(type, payload);
        } else if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ type, payload });
        }
    }

    /**
     * Wait for element to appear
     */
    async waitForSelector(selector, timeout = 5000) {
        const existing = this.$(selector);
        if (existing) return existing;

        return new Promise((resolve) => {
            const observer = new MutationObserver(() => {
                const el = this.$(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    /**
     * Check if current page matches URL pattern
     */
    matchesUrl(pattern) {
        return window.location.href.includes(pattern);
    }
}

// Export
if (typeof window !== 'undefined') {
    window.BaseMonitor = BaseMonitor;
}
