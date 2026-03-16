/**
 * ATS Core Library
 * Common utilities and helpers for the ATS Chrome Extension
 */

const ATS = {
  config: {
    debug: true,
    apiUrl: 'http://localhost:8000',
    storageKey: 'ats_config'
  },

  async init() {
    this.log('Initializing ATS...');
    const config = await this.getConfig();
    Object.assign(this.config, config);
    this.log('ATS initialized', this.config);
    return this;
  },

  log(message, data = null) {
    if (this.config.debug) {
      const prefix = '[ATS]';
      if (data) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
    }
  },

  error(message, data = null) {
    const prefix = '[ATS ERROR]';
    if (data) {
      console.error(prefix, message, data);
    } else {
      console.error(prefix, message);
    }
  },

  async getConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.config.storageKey, (result) => {
        resolve(result[this.config.storageKey] || {});
      });
    });
  },

  storage: {
    async get(key) {
      return new Promise((resolve) => {
        const fullKey = ATS.config.storageKey;
        chrome.storage.local.get(fullKey, (result) => {
          const config = result[fullKey] || {};
          resolve(key ? config[key] : config);
        });
      });
    },
    async set(key, value) {
      return new Promise((resolve) => {
        const fullKey = ATS.config.storageKey;
        chrome.storage.local.get(fullKey, (result) => {
          const config = result[fullKey] || {};
          if (typeof key === 'object') {
            Object.assign(config, key);
          } else {
            config[key] = value;
          }
          chrome.storage.local.set({ [fullKey]: config }, () => {
            resolve(true);
          });
        });
      });
    }
  },

  async saveConfig(config) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.config.storageKey]: config }, () => {
        resolve(true);
      });
    });
  },

  async notifyBackground(action, data) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action, data }, (response) => {
        resolve(response);
      });
    });
  },

  debounce(func, wait) {
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

  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  async fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  },

  parsePhone(phone) {
    if (!phone) return null;
    return phone.replace(/[^0-9+]/g, '');
  },

  utils: {
    cleanPhoneNumber(phone) {
      if (!phone) return null;
      return phone.replace(/[^\d+]/g, '').replace(/^\+1/, '');
    }
  },

  formatDate(date) {
    return new Date(date).toLocaleString();
  },

  onMessage(callback) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(callback);
    }
  },

  sendMessage(message) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(message);
    }
  },

  Messages: {
    CTM_CALL_EVENT: 'CTM_CALL_EVENT',
    SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
    SHOW_OVERLAY: 'SHOW_OVERLAY',
    SHOW_CALL_SUMMARY: 'SHOW_CALL_SUMMARY',
    AI_ANALYSIS_RESULT: 'AI_ANALYSIS_RESULT'
  }
};

// Add logger using Object.defineProperty after ATS is fully defined
// This ensures ATS.log and ATS.error are available when logger methods are called
Object.defineProperty(ATS, 'logger', {
  get: function() {
    return {
      info: function(msg, data) { ATS.log(msg, data); },
      debug: function(msg, data) { ATS.log(msg, data); },
      warn: function(msg, data) { ATS.log('WARN: ' + msg, data); },
      error: function(msg, data) { ATS.error(msg, data); }
    };
  },
  configurable: true,
  enumerable: true
});

if (typeof window !== 'undefined') {
  window.ATS = ATS;
}
