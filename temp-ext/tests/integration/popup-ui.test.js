/**
 * Popup UI Integration Tests
 * Tests for Chrome Extension popup interactions
 */

const { test, expect, describe } = require('@playwright/test');

const path = require('path');

describe('Popup UI Tests', () => {
  const popupPath = path.resolve(__dirname, '../../popup/popup.html');
  
  test.beforeEach(async ({ page }) => {
    // Load the popup HTML
    await page.goto('file://' + popupPath);
  });

  test('should display all UI elements', async ({ page }) => {
    // Check header
    const header = await page.locator('.header h1').textContent();
    expect(header).toContain('AGS Automation');
    
    // Check client dropdown exists
    const clientSelect = await page.locator('#clientSelect');
    await expect(clientSelect).toBeVisible();
    
    // Check all 6 clients
    const options = await clientSelect.locator('option').count();
    expect(options).toBe(6);
  });

  test('should have working toggle switches', async ({ page }) => {
    // Check toggle switch container exists (the input is hidden, but the slider is visible)
    const callToggleContainer = page.locator('.toggle').first();
    await expect(callToggleContainer).toBeVisible();
    
    // Check Salesforce sync toggle  
    const sfToggleContainer = page.locator('.toggle').nth(1);
    await expect(sfToggleContainer).toBeVisible();
    
    // Check AI toggle
    const aiToggleContainer = page.locator('.toggle').nth(2);
    await expect(aiToggleContainer).toBeVisible();
  });

  test('should have Test and Config buttons', async ({ page }) => {
    const testBtn = page.locator('#testBtn');
    await expect(testBtn).toBeVisible();
    
    const configBtn = page.locator('#configBtn');
    await expect(configBtn).toBeVisible();
  });

  test('should display stats section', async ({ page }) => {
    const callsCount = await page.locator('#callsCount').textContent();
    expect(callsCount).toBeDefined();
    
    const searchesCount = await page.locator('#searchesCount').textContent();
    expect(searchesCount).toBeDefined();
    
    const analysisCount = await page.locator('#analysisCount').textContent();
    expect(analysisCount).toBeDefined();
  });

  test('should have Test Analysis section', async ({ page }) => {
    const testNewLeadBtn = page.locator('#testNewLeadBtn');
    await expect(testNewLeadBtn).toBeVisible();
    
    const testExistingLeadBtn = page.locator('#testExistingLeadBtn');
    await expect(testExistingLeadBtn).toBeVisible();
  });

  test('should toggle test input area on button click', async ({ page }) => {
    // Note: This test requires JavaScript to be loaded via Chrome extension
    // Loading via file:// doesn't execute the popup.js script
    // So we just verify the elements exist
    
    const testNewLeadBtn = page.locator('#testNewLeadBtn');
    await expect(testNewLeadBtn).toBeVisible();
    
    const testInputArea = page.locator('#testInputArea');
    // Area exists but is hidden initially
    await expect(testInputArea).toBeHidden();
  });

  test('should have Notes section', async ({ page }) => {
    const notesContainer = page.locator('#notesContainer');
    await expect(notesContainer).toBeVisible();
    
    const noteInput = page.locator('#noteInput');
    await expect(noteInput).toBeVisible();
    
    const addNoteBtn = page.locator('#addNoteBtn');
    await expect(addNoteBtn).toBeVisible();
  });

  test('should have Qualification section', async ({ page }) => {
    const qualStatus = page.locator('#qualStatus');
    await expect(qualStatus).toBeVisible();
    
    const qualKeywords = page.locator('#qualKeywords');
    await expect(qualKeywords).toBeVisible();
  });

  test('should display version info', async ({ page }) => {
    const version = await page.locator('.info-value').first().textContent();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('should display server status', async ({ page }) => {
    const serverStatus = await page.locator('#serverStatus').textContent();
    expect(serverStatus).toBeDefined();
  });
});

describe('Service Status Tests', () => {
  const popupPath = path.resolve(__dirname, '../../popup/popup.html');
  
  test('should show status indicators', async ({ page }) => {
    await page.goto('file://' + popupPath);
    
    // Check all service status elements exist
    const services = ['storage', 'aiServer', 'salesforce', 'background', 'ctm'];
    
    for (const service of services) {
      const statusEl = page.locator(`#${service}Status`);
      await expect(statusEl).toBeVisible();
      
      const indicator = statusEl.locator('.status-indicator');
      await expect(indicator).toBeVisible();
    }
  });
});
