/**
 * ATS Error Handler
 * Centralized error handling with logging and recovery
 */

class ErrorHandler {
    static errors = [];
    static maxErrors = 100;
    static listeners = [];

    /**
     * Log an error
     */
    static log(error, context = {}) {
        const errorRecord = {
            message: error.message || String(error),
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            type: error.name || 'Error'
        };

        this.errors.unshift(errorRecord);
        
        // Trim old errors
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(0, this.maxErrors);
        }

        // Log to console
        console.error(`[ATS Error] ${errorRecord.type}:`, errorRecord.message, context);

        // Notify listeners
        this.notifyListeners(errorRecord);

        return errorRecord;
    }

    /**
     * Log a warning
     */
    static warn(message, context = {}) {
        console.warn(`[ATS Warning]:`, message, context);
    }

    /**
     * Log debug info
     */
    static debug(message, data = null) {
        console.debug(`[ATS Debug]:`, message, data);
    }

    /**
     * Create a wrapped function with error handling
     */
    static wrap(fn, context = {}) {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                this.log(error, { ...context, args });
                throw error;
            }
        };
    }

    /**
     * Create an async wrapped function with error handling
     */
    static wrapAsync(fn, context = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.log(error, { ...context, args });
                throw error;
            }
        };
    }

    /**
     * Handle error with fallback
     */
    static handle(error, fallback, context = {}) {
        this.log(error, context);
        if (typeof fallback === 'function') {
            return fallback(error);
        }
        return fallback;
    }

    /**
     * Add error listener
     */
    static addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Remove error listener
     */
    static removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners
     */
    static notifyListeners(errorRecord) {
        this.listeners.forEach(callback => {
            try {
                callback(errorRecord);
            } catch (e) {
                console.error('[ErrorHandler] Listener error:', e);
            }
        });
    }

    /**
     * Get recent errors
     */
    static getRecentErrors(count = 10) {
        return this.errors.slice(0, count);
    }

    /**
     * Get errors by context
     */
    static getErrorsByContext(contextKey, contextValue) {
        return this.errors.filter(e => e.context[contextKey] === contextValue);
    }

    /**
     * Clear errors
     */
    static clear() {
        this.errors = [];
    }

    /**
     * Get error summary
     */
    static getSummary() {
        const summary = {
            total: this.errors.length,
            byType: {},
            byContext: {}
        };

        this.errors.forEach(error => {
            // By type
            summary.byType[error.type] = (summary.byType[error.type] || 0) + 1;

            // By context
            if (error.context.service) {
                summary.byContext[error.context.service] = 
                    (summary.byContext[error.context.service] || 0) + 1;
            }
        });

        return summary;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
}
