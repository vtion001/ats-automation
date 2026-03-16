/**
 * ATS Shared Utilities
 * Pure JavaScript utilities - NO Chrome APIs
 */

// ============================================================================
// STRING UTILITIES
// ============================================================================

const StringUtils = {
    /**
     * Clean phone number - remove all non-digit characters except +
     */
    cleanPhoneNumber(phone) {
        if (!phone) return null;
        return phone.replace(/[^\d+]/g, '');
    },
    
    /**
     * Format phone number for display
     */
    formatPhoneNumber(phone) {
        if (!phone) return '';
        const cleaned = this.cleanPhoneNumber(phone);
        if (!cleaned) return '';
        
        // US format: (XXX) XXX-XXXX
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        // With country code
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
        }
        return cleaned;
    },
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Truncate text with ellipsis
     */
    truncate(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.slice(0, maxLength - 3) + '...';
    },
    
    /**
     * Capitalize first letter
     */
    capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },
    
    /**
     * Generate unique ID
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
};

// ============================================================================
// DATE UTILITIES
// ============================================================================

const DateUtils = {
    /**
     * Format date for display
     */
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleString();
    },
    
    /**
     * Format date as ISO string
     */
    toISOString(date) {
        if (!date) return new Date().toISOString();
        return new Date(date).toISOString();
    },
    
    /**
     * Get relative time string
     */
    getRelativeTime(date) {
        if (!date) return '';
        const now = new Date();
        const then = new Date(date);
        const diffMs = now - then;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) return 'just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        return this.formatDate(date);
    },
    
    /**
     * Format duration in seconds to human readable
     */
    formatDuration(seconds) {
        if (!seconds || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

const ValidationUtils = {
    /**
     * Validate email format
     */
    isValidEmail(email) {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    /**
     * Validate phone number format
     */
    isValidPhone(phone) {
        if (!phone) return false;
        const cleaned = StringUtils.cleanPhoneNumber(phone);
        return cleaned && cleaned.length >= 10 && cleaned.length <= 15;
    },
    
    /**
     * Validate URL format
     */
    isValidUrl(url) {
        if (!url) return false;
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },
    
    /**
     * Validate client name
     */
    isValidClient(client) {
        const validClients = ['flyland', 'legacy', 'tbt', 'banyan', 'takami', 'element'];
        return validClients.includes(client);
    }
};

// ============================================================================
// OBJECT UTILITIES
// ============================================================================

const ObjectUtils = {
    /**
     * Deep clone an object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    },
    
    /**
     * Merge objects (shallow)
     */
    merge(target, source) {
        return { ...target, ...source };
    },
    
    /**
     * Get nested property safely
     */
    getNested(obj, path, defaultValue = null) {
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current === null || current === undefined) return defaultValue;
            current = current[key];
        }
        
        return current !== undefined ? current : defaultValue;
    },
    
    /**
     * Check if object is empty
     */
    isEmpty(obj) {
        if (!obj) return true;
        return Object.keys(obj).length === 0;
    }
};

// ============================================================================
// FUNCTION UTILITIES
// ============================================================================

const FunctionUtils = {
    /**
     * Debounce function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Throttle function
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    /**
     * Retry function with exponential backoff
     */
    async retry(fn, maxRetries = 3, initialDelay = 1000) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (i < maxRetries - 1) {
                    await new Promise(resolve => 
                        setTimeout(resolve, initialDelay * Math.pow(2, i))
                    );
                }
            }
        }
        throw lastError;
    },
    
    /**
     * Create async timeout
     */
    timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

const ArrayUtils = {
    /**
     * Get unique items from array
     */
    unique(arr) {
        return [...new Set(arr)];
    },
    
    /**
     * Group array by key
     */
    groupBy(arr, keyFn) {
        return arr.reduce((groups, item) => {
            const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
            (groups[key] = groups[key] || []).push(item);
            return groups;
        }, {});
    },
    
    /**
     * Sort array by key
     */
    sortBy(arr, keyFn, order = 'asc') {
        const sorted = [...arr].sort((a, b) => {
            const aVal = typeof keyFn === 'function' ? keyFn(a) : a[keyFn];
            const bVal = typeof keyFn === 'function' ? keyFn(b) : b[keyFn];
            
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    },
    
    /**
     * Chunk array into smaller arrays
     */
    chunk(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

const ATSUtils = {
    string: StringUtils,
    date: DateUtils,
    validation: ValidationUtils,
    object: ObjectUtils,
    function: FunctionUtils,
    array: ArrayUtils
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ATSUtils;
} else if (typeof window !== 'undefined') {
    window.ATSUtils = ATSUtils;
}
