/**
 * Status Manager
 * Manages status indicators for all services
 */

class StatusManager {
    constructor() {
        this.services = ['storage', 'aiServer', 'salesforce', 'background', 'ctm'];
    }

    /**
     * Update single service status
     */
    updateServiceStatus(service, isOnline) {
        const statusEl = document.getElementById(service + 'Status');
        if (!statusEl) return;
        
        const indicator = statusEl.querySelector('.status-indicator');
        statusEl.classList.remove('online', 'offline', 'checking');
        indicator.classList.remove('online', 'offline', 'checking');
        
        if (isOnline) {
            statusEl.classList.add('online');
            indicator.classList.add('online');
        } else {
            statusEl.classList.add('offline');
            indicator.classList.add('offline');
        }
    }

    /**
     * Update all services to initializing state
     */
    setAllInitializing() {
        this.services.forEach(service => {
            const statusEl = document.getElementById(service + 'Status');
            if (!statusEl) return;
            
            const indicator = statusEl.querySelector('.status-indicator');
            statusEl.classList.remove('online', 'offline');
            indicator.classList.remove('online', 'offline');
            statusEl.classList.add('checking');
            indicator.classList.add('checking');
        });
    }

    /**
     * Update all services to same status
     */
    updateAllServiceStatus(status) {
        this.services.forEach(service => {
            this.updateServiceStatus(service, status === 'online');
        });
    }

    /**
     * Update main status indicator
     */
    updateMainStatus(isOnline) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        if (!statusDot || !statusText) return;
        
        if (isOnline === true) {
            statusDot.classList.remove('inactive');
            statusText.classList.remove('inactive');
            statusText.classList.add('active');
            statusText.textContent = 'Ready';
        } else if (isOnline === false) {
            statusDot.classList.add('inactive');
            statusText.classList.remove('active');
            statusText.classList.add('inactive');
            statusText.textContent = 'Issues Detected';
        }
        // null = initializing, do nothing
    }

    /**
     * Update status display text
     */
    showStatus(message, success) {
        // Also notify via toast if available
        if (window.ToastManagerInstance) {
            if (success === true) {
                window.ToastManagerInstance.success(message);
            } else if (success === false) {
                window.ToastManagerInstance.error(message);
            } else {
                window.ToastManagerInstance.info(message);
            }
        }
        
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        if (!statusDot || !statusText) return;
        
        const originalText = statusText.textContent;
        const originalClass = statusText.className;
        
        statusText.textContent = message;
        
        if (success === true) {
            statusText.classList.add('active');
            statusDot.classList.remove('inactive');
        } else if (success === false) {
            statusText.classList.remove('active');
        }
        
        setTimeout(() => {
            statusText.textContent = originalText;
            statusText.className = originalClass;
        }, 3000);
    }

    /**
     * Update stats display
     */
    async updateStats() {
        if (!window.StorageService) return;
        
        try {
            const stats = await window.StorageService.getStats();
            
            const callsEl = document.getElementById('callsCount');
            const searchesEl = document.getElementById('searchesCount');
            const analysisEl = document.getElementById('analysisCount');
            
            if (callsEl) callsEl.textContent = stats.calls || 0;
            if (searchesEl) searchesEl.textContent = stats.searches || 0;
            if (analysisEl) analysisEl.textContent = stats.analysis || 0;
        } catch (e) {
            console.error('[StatusManager] Error updating stats:', e);
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.StatusManager = StatusManager;
}
