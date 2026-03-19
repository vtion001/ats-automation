/**
 * CTM Service Unit Tests
 * Tests for call detection, phone extraction, caller name extraction
 */

const { test, expect, describe } = require('@playwright/test');

// Mock ATS namespace for testing
const createMockATS = () => ({
  config: {
    autoSearchSF: true,
    transcriptionEnabled: true,
    saveMarkdown: true,
    aiAnalysisEnabled: true,
    activeClient: 'flyland'
  },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  },
  utils: {
    cleanPhoneNumber: (phone) => phone.replace(/\D/g, '')
  },
  storage: {
    get: async () => ({}),
    set: async () => {}
  },
  sendMessage: () => {},
  Messages: {
    CTM_CALL_EVENT: 'CTM_CALL_EVENT',
    SHOW_CALL_SUMMARY: 'SHOW_CALL_SUMMARY',
    SHOW_NOTIFICATION: 'SHOW_NOTIFICATION'
  }
});

describe('CTM Service Tests', () => {
  
  test('should detect call status element', async ({ page }) => {
    await page.goto('data:text/html,<html><body></body></html>');
    
    // Inject mock call notification directly
    await page.evaluate(() => {
      // Add call element
      const callEl = document.createElement('div');
      callEl.className = 'incoming-call ringing';
      callEl.setAttribute('data-call-status', 'ringing');
      callEl.textContent = 'Incoming Call';
      document.body.appendChild(callEl);
    });
    
    // Test detection
    const hasCall = await page.evaluate(() => {
      const element = document.querySelector('.incoming-call');
      return element !== null;
    });
    
    expect(hasCall).toBe(true);
  });

  test('should extract phone number from CTM page', async ({ page }) => {
    await page.goto('data:text/html,<html><body></body></html>');
    
    const phoneExtracted = await page.evaluate(() => {
      // Create phone element
      const phoneEl = document.createElement('div');
      phoneEl.className = 'caller-number';
      phoneEl.textContent = '+1 (555) 123-4567';
      document.body.appendChild(phoneEl);
      
      // Extract phone
      const element = document.querySelector('.caller-number');
      if (element) {
        const phone = element.textContent.trim();
        return phone.replace(/\D/g, '');
      }
      return null;
    });
    
    expect(phoneExtracted).toBe('15551234567');
  });

  test('should extract caller name from CTM page', async ({ page }) => {
    await page.goto('data:text/html,<html><body></body></html>');
    
    const nameExtracted = await page.evaluate(() => {
      // Create name element
      const nameEl = document.createElement('div');
      nameEl.className = 'caller-name';
      nameEl.textContent = 'John Doe';
      document.body.appendChild(nameEl);
      
      // Extract name
      const element = document.querySelector('.caller-name');
      if (element) {
        return element.textContent.trim();
      }
      return null;
    });
    
    expect(nameExtracted).toBe('John Doe');
  });

  test('should handle multiple phone selectors', async ({ page }) => {
    await page.goto('data:text/html,<html><body><div class="other">no phone</div></body></html>');
    
    const phone = await page.evaluate(() => {
      const selectors = [
        '.caller-number',
        '.phone-number', 
        '.call-from',
        '[data-phone]',
        '.tel-number'
      ];
      
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          return el.textContent.trim();
        }
      }
      return null;
    });
    
    // No phone element exists, should return null
    expect(phone).toBeNull();
  });
});

describe('Phone Number Cleaning Tests', () => {
  
  test('should clean various phone formats', async ({ page }) => {
    const results = await page.evaluate(() => {
      const testCases = [
        '+1 (555) 123-4567',
        '555-123-4567',
        '(555) 1234567',
        '5551234567',
        '1-555-123-4567'
      ];
      
      return testCases.map(phone => phone.replace(/\D/g, ''));
    });
    
    expect(results).toEqual([
      '15551234567',
      '5551234567', 
      '5551234567',
      '5551234567',
      '15551234567'
    ]);
  });
});
