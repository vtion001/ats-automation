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

  formatDate(date) {
    return new Date(date).toLocaleString();
  }
};

if (typeof window !== 'undefined') {
  window.ATS = ATS;
}
