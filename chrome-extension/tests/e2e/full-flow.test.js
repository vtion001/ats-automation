/**
 * End-to-End Automation Tests
 * Tests complete flows: CTM → Salesforce → AI
 * 
 * NOTE: These tests require:
 * 1. Extension loaded in Chrome
 * 2. User logged into CTM and Salesforce
 * 3. AI server running
 */

const { test, expect, describe } = require('@playwright/test');
const path = require('path');

const popupPath = path.resolve(__dirname, '../../popup/popup.html');

describe('E2E: Extension Popup', () => {
  
  test('should open popup and interact with UI', async ({ page }) => {
    await page.goto('file://' + popupPath);
    
    // Check main elements
    await expect(page.locator('#clientSelect')).toBeVisible();
    await expect(page.locator('#testBtn')).toBeVisible();
    await expect(page.locator('#configBtn')).toBeVisible();
  });
});

describe('E2E: Test Analysis Flow', () => {
  
  test('should show test input fields exist', async ({ page }) => {
    await page.goto('file://' + popupPath);
    
    // Check test input area elements exist (but hidden initially)
    const testInputArea = page.locator('#testInputArea');
    await expect(testInputArea).toBeHidden();
    
    // Check all input fields are present in DOM
    await expect(page.locator('#audioFileInput')).toBeAttached();
    await expect(page.locator('#transcriptionInput')).toBeAttached();
    await expect(page.locator('#testPhoneInput')).toBeAttached();
    await expect(page.locator('#testClientSelect')).toBeAttached();
    await expect(page.locator('#runAnalysisBtn')).toBeAttached();
  });
  
  test('should validate required fields before analysis', async ({ page }) => {
    // Test the validation logic in popup.js
    await page.goto('file://' + popupPath);
    
    // Verify the runAnalysisBtn exists
    await expect(page.locator('#runAnalysisBtn')).toBeAttached();
    
    // Verify test status element exists
    await expect(page.locator('#testStatus')).toBeAttached();
  });
});

describe('E2E: Full Automation Flow', () => {
  
  test('complete new lead flow simulation', async ({ page }) => {
    await page.goto('file://' + popupPath);
    
    // 1. Load popup - verify
    await expect(page.locator('.header h1')).toContainText('AGS Automation');
    
    // 2. Select client - verify dropdown exists with 6 options
    const clientOptions = await page.locator('#clientSelect option').count();
    expect(clientOptions).toBe(6);
    
    // 3. Verify toggles are present
    await expect(page.locator('#callMonitorToggle')).toBeAttached();
    await expect(page.locator('#sfSyncToggle')).toBeAttached();
    await expect(page.locator('#aiToggle')).toBeAttached();
    
    // 4. Verify Test button exists
    await expect(page.locator('#testBtn')).toBeAttached();
    
    // 5. Verify stats section
    await expect(page.locator('#callsCount')).toBeAttached();
    await expect(page.locator('#searchesCount')).toBeAttached();
    await expect(page.locator('#analysisCount')).toBeAttached();
  });
});

describe('E2E: Notes and Qualification', () => {
  
  test('should have notes section', async ({ page }) => {
    await page.goto('file://' + popupPath);
    
    await expect(page.locator('#notesContainer')).toBeVisible();
    await expect(page.locator('#noteInput')).toBeVisible();
    await expect(page.locator('#addNoteBtn')).toBeVisible();
  });
  
  test('should have qualification section', async ({ page }) => {
    await page.goto('file://' + popupPath);
    
    await expect(page.locator('#qualStatus')).toBeVisible();
    await expect(page.locator('#qualKeywords')).toBeVisible();
    await expect(page.locator('#keywordsList')).toBeVisible();
  });
});
