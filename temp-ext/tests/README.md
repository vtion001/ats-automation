# Chrome Extension Tests

## Overview

This directory contains automated tests for the ATS Chrome Extension.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual services
│   ├── ctm-service.test.js
│   └── salesforce-service.test.js
├── integration/              # Integration tests for UI components
│   └── popup-ui.test.js
├── e2e/                     # End-to-end tests
│   └── full-flow.test.js
├── helpers/                 # Test utilities
│   └── extension-tester.js
├── screenshots/             # Test failure screenshots
├── playwright.config.js     # Playwright configuration
└── package.json            # Test dependencies
```

## Running Tests

### Install Dependencies

```bash
cd chrome-extension/tests
npm install
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Types

```bash
# Unit tests only
npm run test:unit

# Integration tests only  
npm run test:integration

# E2E tests only
npm run test:e2e

# Run with visible browser
npm run test:headed
```

## Test Categories

### Unit Tests
- CTM call detection logic
- Phone number extraction and cleaning
- Salesforce URL generation
- Contact/Task data preparation

### Integration Tests
- Popup UI element visibility
- Toggle switch functionality
- Button click handlers
- Test Analysis section flow

### E2E Tests
- CTM page loading
- Salesforce navigation
- Full automation flow simulation

## Notes

- E2E tests require the extension to be loaded in Chrome
- User must be logged into CTM and Salesforce for real E2E tests
- Some tests use mock data to run without external dependencies
