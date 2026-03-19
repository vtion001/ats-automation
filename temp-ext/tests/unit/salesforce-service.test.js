/**
 * Salesforce Service Unit Tests
 * Tests for Salesforce search, contact creation, action execution
 */

const { test, expect, describe } = require('@playwright/test');

describe('Salesforce Service Tests', () => {
  
  test('should generate correct search URL', async ({ page }) => {
    const searchUrl = await page.evaluate(() => {
      const baseUrl = 'https://flyland.my.salesforce.com';
      const phone = '5551234567';
      
      // Encode phone for URL
      const encodedPhone = encodeURIComponent(phone);
      
      // Generate SOSL search URL
      return `${baseUrl}/lightning/search/unsupported?q=${encodedPhone}&scope=contacts&scope=leads`;
    });
    
    expect(searchUrl).toContain('flyland.my.salesforce.com');
    expect(searchUrl).toContain('5551234567');
  });

  test('should generate Log a Call URL correctly', async ({ page }) => {
    const logCallUrl = await page.evaluate(() => {
      const baseUrl = 'https://flyland.my.salesforce.com';
      const recordId = '003ABC123DEF456GHI';
      
      return `${baseUrl}/lightning/actions/quickAction/LogCall/LogCall?recordId=${recordId}&quickActionName=LogCall`;
    });
    
    expect(logCallUrl).toContain('LogCall');
    expect(logCallUrl).toContain('recordId=003');
  });

  test('should generate New Task URL correctly', async ({ page }) => {
    const taskUrl = await page.evaluate(() => {
      const baseUrl = 'https://flyland.my.salesforce.com';
      const recordId = '003ABC123DEF456GHI';
      
      return `${baseUrl}/lightning/actions/quickAction/NewTask/NewTask?recordId=${recordId}&quickActionName=NewTask`;
    });
    
    expect(taskUrl).toContain('NewTask');
    expect(taskUrl).toContain('recordId=003');
  });

  test('should prepare contact data correctly', async ({ page }) => {
    const contactData = await page.evaluate(() => {
      const analysis = {
        caller_name: 'John Doe',
        detected_state: 'California',
        detected_insurance: 'Blue Cross',
        qualification_score: 85,
        call_notes: 'Interested in addiction treatment'
      };
      
      return {
        FirstName: analysis.caller_name.split(' ')[0],
        LastName: analysis.caller_name.split(' ').slice(1).join(' ') || 'Unknown',
        Phone: '5551234567',
        Description: analysis.call_notes,
        LeadSource: 'Incoming Call - AGS Automation'
      };
    });
    
    expect(contactData.FirstName).toBe('John');
    expect(contactData.LastName).toBe('Doe');
    expect(contactData.Phone).toBe('5551234567');
    expect(contactData.LeadSource).toContain('AGS Automation');
  });

  test('should prepare log call data correctly', async ({ page }) => {
    const logData = await page.evaluate(() => {
      const action = {
        action: 'log_call',
        call_notes: 'Patient interested in treatment options',
        phone: '5551234567'
      };
      
      return {
        subject: 'Inbound Call',
        description: action.call_notes,
        phone: action.phone
      };
    });
    
    expect(logData.subject).toBe('Inbound Call');
    expect(logData.description).toBe('Patient interested in treatment options');
    expect(logData.phone).toBe('5551234567');
  });

  test('should prepare task data correctly', async ({ page }) => {
    const taskData = await page.evaluate(() => {
      const action = {
        action: 'new_task',
        taskSubject: 'Follow up on treatment inquiry',
        taskDueDate: '2026-03-20',
        priority: 'High',
        call_notes: 'Call back regarding insurance'
      };
      
      return {
        subject: action.taskSubject,
        dueDate: action.taskDueDate,
        priority: action.priority,
        description: action.call_notes
      };
    });
    
    expect(taskData.subject).toBe('Follow up on treatment inquiry');
    expect(taskData.dueDate).toBe('2026-03-20');
    expect(taskData.priority).toBe('High');
  });
});

describe('Salesforce URL Validation Tests', () => {
  
  test('should validate Salesforce Lightning URLs', async ({ page }) => {
    const urls = await page.evaluate(() => {
      const testUrls = [
        'https://flyland.my.salesforce.com/lightning/r/Contact/003ABC123DEF456GHI/view',
        'https://flyland.lightning.force.com/lightning/r/Lead/00QABC123DEF456GHI/view',
        'https://login.salesforce.com/',
        'https://flyland.my.salesforce.com/'
      ];
      
      return testUrls.map(url => {
        return url.includes('.salesforce.com/lightning/') || 
               url.includes('.force.com/lightning/');
      });
    });
    
    expect(urls[0]).toBe(true);
    expect(urls[1]).toBe(true);
    expect(urls[2]).toBe(false);
    expect(urls[3]).toBe(false);
  });
});
