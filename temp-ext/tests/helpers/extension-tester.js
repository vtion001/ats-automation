/**
 * Chrome Extension Test Helper
 * Provides utilities for testing Chrome extensions with Playwright
 */

const path = require('path');

class ExtensionTester {
  constructor() {
    this.context = null;
    this.page = null;
    this.extensionId = null;
  }

  /**
   * Launch browser with extension loaded
   */
  async launchBrowser(browser, extensionPath) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    // Load the extension
    const extensionPathAbs = path.resolve(extensionPath);
    
    // Get extension ID from background script
    await context.newPage();
    
    this.context = context;
    this.extensionId = extensionPathAbs;
    
    return context;
  }

  /**
   * Open extension popup
   */
  async openPopup(browser) {
    if (!this.extensionId) {
      throw new Error('Extension not loaded. Call launchBrowser first.');
    }

    // Open the extension popup
    const page = await this.context.newPage();
    await page.goto(`chrome-extension://${this.extensionId}/popup/popup.html`);
    
    this.page = page;
    return page;
  }

  /**
   * Inject content script into a URL (for testing CTM/SF pages)
   */
  async injectIntoPage(targetUrl, contentScriptPath) {
    const page = await this.context.newPage();
    
    // Navigate to target URL
    await page.goto(targetUrl);
    
    // Inject the content script
    await page.addScriptTag({ path: path.resolve(contentScriptPath) });
    
    return page;
  }

  /**
   * Get extension storage data
   */
  async getStorageData() {
    const results = await this.context.pages();
    for (const page of results) {
      if (page.url().includes('popup.html')) {
        return await page.evaluate(() => {
          return new Promise((resolve) => {
            chrome.storage.local.get(null, (data) => resolve(data));
          });
        });
      }
    }
    return null;
  }

  /**
   * Click extension button by ID
   */
  async clickButton(buttonId) {
    if (!this.page) {
      throw new Error('Popup not open. Call openPopup first.');
    }
    
    await this.page.click(`#${buttonId}`);
    await this.page.waitForTimeout(500);
  }

  /**
   * Get element text content
   */
  async getText(selector) {
    if (!this.page) {
      throw new Error('Popup not open. Call openPopup first.');
    }
    
    return await this.page.textContent(selector);
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector) {
    if (!this.page) {
      throw new Error('Popup not open. Call openPopup first.');
    }
    
    return await this.page.isVisible(selector);
  }

  /**
   * Get service status indicators
   */
  async getServiceStatuses() {
    if (!this.page) {
      throw new Error('Popup not open. Call openPopup first.');
    }

    const services = ['storage', 'aiServer', 'salesforce', 'background', 'ctm'];
    const statuses = {};

    for (const service of services) {
      const indicator = await this.page.$(`#${service}Status .status-indicator`);
      if (indicator) {
        const classes = await indicator.getAttribute('class');
        statuses[service] = classes.includes('online') ? 'online' : 
                           classes.includes('offline') ? 'offline' : 'checking';
      }
    }

    return statuses;
  }

  /**
   * Take a screenshot
   */
  async screenshot(name) {
    if (!this.page) {
      throw new Error('Popup not open. Call openPopup first.');
    }
    
    await this.page.screenshot({ path: `./tests/screenshots/${name}.png` });
  }

  /**
   * Close browser
   */
  async close() {
    if (this.context) {
      await this.context.close();
    }
  }
}

/**
 * Mock Call Event Generator
 * For testing CTM call detection
 */
class MockCallGenerator {
  constructor(page) {
    this.page = page;
  }

  /**
   * Simulate incoming call in CTM
   */
  async simulateCall(phoneNumber = '5551234567', callerName = 'Test Caller') {
    await this.page.evaluate((data) => {
      // Create mock call notification element
      const callEl = document.createElement('div');
      callEl.className = 'incoming-call active-call';
      callEl.setAttribute('data-call-status', 'ringing');
      callEl.innerHTML = `
        <div class="caller-name">${data.callerName}</div>
        <div class="caller-number">${data.phoneNumber}</div>
      `;
      callEl.style.display = 'none';
      document.body.appendChild(callEl);
      
      // Show the call element
      callEl.style.display = 'block';
    }, { phoneNumber, callerName });
  }

  /**
   * End the call
   */
  async endCall() {
    await this.page.evaluate(() => {
      const callEl = document.querySelector('.incoming-call');
      if (callEl) {
        callEl.style.display = 'none';
      }
    });
  }
}

module.exports = { ExtensionTester, MockCallGenerator };
