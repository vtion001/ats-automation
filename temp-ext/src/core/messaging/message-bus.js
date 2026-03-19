/**
 * ATS Message Bus
 * Centralized cross-context communication
 * Uses chrome.runtime messaging under the hood
 */

class ATSMessageBus {
    constructor() {
        this.listeners = new Map();
        this.messageId = 0;
        
        // Set up message listener if in extension context
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this.handleMessage(message, sender, sendResponse);
            });
        }
    }
    
    /**
     * Send message to background or content script
     * @param {string} type - Message type
     * @param {*} payload - Message payload
     * @param {Object} options - Optional settings
     * @returns {Promise} Response from receiver
     */
    async send(type, payload, options = {}) {
        const { tabId, timeout = 30000 } = options;
        
        return new Promise((resolve, reject) => {
            const message = {
                id: ++this.messageId,
                type,
                payload,
                timestamp: Date.now()
            };
            
            const handleResponse = (response) => {
                if (response && response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            };
            
            if (tabId) {
                // Send to specific tab
                chrome.tabs.sendMessage(tabId, message, handleResponse);
            } else {
                // Send to background
                chrome.runtime.sendMessage(message, handleResponse);
            }
            
            // Timeout
            if (timeout > 0) {
                setTimeout(() => {
                    reject(new Error(`Message timeout: ${type}`));
                }, timeout);
            }
        });
    }
    
    /**
     * Send message to background
     */
    sendToBackground(type, payload) {
        return this.send(type, payload, { tabId: null });
    }
    
    /**
     * Send message to specific tab
     */
    sendToTab(tabId, type, payload) {
        return this.send(type, payload, { tabId });
    }
    
    /**
     * Register message listener
     * @param {string} type - Message type to listen for
     * @param {Function} handler - Handler function
     */
    on(type, handler) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(handler);
    }
    
    /**
     * Unregister message listener
     * @param {string} type - Message type
     * @param {Function} handler - Handler function to remove
     */
    off(type, handler) {
        if (!this.listeners.has(type)) return;
        
        const handlers = this.listeners.get(type);
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }
    
    /**
     * Handle incoming message (internal)
     */
    handleMessage(message, sender, sendResponse) {
        const { type, payload, id } = message;
        
        // Check if there's a listener for this type
        if (this.listeners.has(type)) {
            const handlers = this.listeners.get(type);
            
            // Call all handlers
            handlers.forEach(handler => {
                try {
                    const result = handler(payload, sender);
                    
                    // If handler returns a promise, use it for async response
                    if (result && typeof result.then === 'function') {
                        result.then(response => {
                            sendResponse({ id, success: true, data: response });
                        }).catch(error => {
                            sendResponse({ id, success: false, error: error.message });
                        });
                        return true; // Will respond asynchronously
                    }
                } catch (error) {
                    console.error(`[ATS MessageBus] Handler error for ${type}:`, error);
                }
            });
        } else {
            // No handler - acknowledge receipt
            sendResponse({ id, received: true });
        }
        
        return true; // Keep message channel open for async response
    }
    
    /**
     * Broadcast to all tabs
     */
    async broadcast(type, payload) {
        try {
            const tabs = await chrome.tabs.query({});
            const results = await Promise.allSettled(
                tabs.map(tab => this.sendToTab(tab.id, type, payload))
            );
            return results;
        } catch (error) {
            console.error('[ATS MessageBus] Broadcast error:', error);
            return [];
        }
    }
    
    /**
     * Get listener count for a message type
     */
    getListenerCount(type) {
        return this.listeners.has(type) ? this.listeners.get(type).length : 0;
    }
}

// Global message bus instance
const messageBus = new ATSMessageBus();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ATSMessageBus, messageBus };
} else if (typeof window !== 'undefined') {
    window.ATSMessageBus = ATSMessageBus;
    window.messageBus = messageBus;
}
