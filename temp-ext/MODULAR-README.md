# ATS Chrome Extension - Modular Architecture

## Overview

This extension has been fully refactored to be maintainable and scalable while maintaining **100% backward compatibility** with existing code.

## New Directory Structure

```
src/
├── shared/                          # Pure JavaScript - NO Chrome APIs
│   ├── constants/
│   │   └── index.js               # All storage keys, message types, API endpoints
│   └── utils/
│       ├── index.js               # String, date, validation, array utils
│       └── error-handler.js       # Centralized error handling
│
├── core/                           # Extension infrastructure
│   ├── di/
│   │   └── container.js           # Dependency injection container
│   ├── messaging/
│   │   └── message-bus.js         # Message bus abstraction
│   ├── storage/
│   │   └── storage-manager.js     # Storage abstraction with backward compat
│   ├── clients/
│   │   └── client-manager.js     # Client config/DOM profile loader
│   ├── bootstrap.js               # Service registration
│   └── index.js                   # Core module exports
│
├── services/                       # Business logic
│   ├── index.js                   # Service registry
│   ├── ctm-service.js
│   ├── salesforce-service.js
│   ├── transcription-service.js
│   ├── ai-service.js
│   └── caller-info-service.js
│
├── modules/                        # Feature modules
│   ├── call-monitor.js
│   └── overlay-ui.js
│
├── content-scripts/
│   └── common/
│       └── base-monitor.js        # Base class for content script monitors
│
├── popup/
│   ├── components/                # UI Components (NEW!)
│   │   ├── toast-manager.js       # Toast notifications
│   │   ├── status-manager.js     # Status indicators
│   │   ├── test-panel.js        # Test/analysis panel
│   │   ├── client-panel.js      # Client selector
│   │   └── index.js
│   ├── managers/
│   │   ├── notes-manager.js
│   │   └── qualification-manager.js
│   └── services/
│       ├── storage-service.js
│       └── status-service.js
│
├── lib/
│   ├── core.js                    # Legacy core (backward compatible)
│   └── config-constants.js
│
└── main.js                        # Entry point
```

## Key Improvements

### 1. Shared Layer (No Chrome Dependencies)
- All constants centralized in `shared/constants/`
- Utility functions in `shared/utils/`
- Error handling utility for consistent error management

### 2. Core Infrastructure
- **DI Container**: Register and get services with dependency injection
- **Message Bus**: Abstracted cross-context communication
- **Storage Manager**: Typed storage interface with backward compatibility
- **Client Manager**: Load client configs, DOM profiles, templates, knowledge bases

### 3. Popup Components (Extracted from monolith)
- **ToastManager**: Reusable notification system
- **StatusManager**: Service status indicators
- **TestPanel**: Analysis testing functionality
- **ClientPanel**: Client switching

### 4. Content Script Base Class
- **BaseMonitor**: Abstract base for CTM, Salesforce, Zoho monitors
- Common functionality: DOM querying, observers, message sending
- Easy to extend for new target systems

### 5. Service Registry
- Centralized service access
- Lazy loading support
- Backward compatibility with global objects

## Backward Compatibility

All existing code continues to work exactly as before:

| Category | Status |
|----------|--------|
| Storage keys | ✅ Unchanged |
| Message types | ✅ Unchanged |
| API endpoints | ✅ Unchanged |
| Client configs | ✅ Unchanged |
| Server side | ✅ No changes |
| Tests | ✅ Work as-is |

## Usage Examples

### Using Constants
```javascript
// Access constants
window.ATS_CONSTANTS.STORAGE_KEYS
window.ATS_CONSTANTS.MESSAGE_TYPES.CTM_CALL_EVENT
window.ATS_CONSTANTS.API_ENDPOINTS.ANALYZE
```

### Using Container
```javascript
// Register service
window.atsContainer.register('myService', (c) => {
    return new MyService(c.get('storage'));
});

// Get service
const service = window.atsContainer.get('myService');
```

### Using Client Manager
```javascript
const clientManager = new ClientManager();
await clientManager.loadClient('flyland');

const domProfile = clientManager.getDOMProfile('salesforce');
const automations = clientManager.getEnabledAutomations();
```

### Using Base Monitor
```javascript
class MyMonitor extends BaseMonitor {
    constructor() {
        super({ systemName: 'mySystem' });
    }

    async onInit() {
        // Custom initialization
    }

    handleMutations(mutations) {
        // Handle DOM changes
    }
}
```

### Using Error Handler
```javascript
try {
    // Some operation
} catch (error) {
    ErrorHandler.log(error, { service: 'myService' });
}

// Or wrap function
const safeFunction = ErrorHandler.wrapAsync(myAsyncFunction, { context: 'operation' });
```

## Build Commands

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Package as ZIP
npm run package
```

## File Changes Summary

### New Files Created
- `src/shared/constants/index.js` - All constants
- `src/shared/utils/index.js` - Utility functions
- `src/shared/utils/error-handler.js` - Error handling
- `src/core/di/container.js` - DI container
- `src/core/messaging/message-bus.js` - Message bus
- `src/core/storage/storage-manager.js` - Storage abstraction
- `src/core/clients/client-manager.js` - Client config loader
- `src/core/bootstrap.js` - Service registration
- `src/core/index.js` - Core exports
- `src/services/index.js` - Service registry
- `src/popup/components/toast-manager.js` - Toast UI
- `src/popup/components/status-manager.js` - Status UI
- `src/popup/components/test-panel.js` - Test panel
- `src/popup/components/client-panel.js` - Client selector
- `src/content-scripts/common/base-monitor.js` - Base monitor class
- `package.json` - Build scripts
- `wxt.config.js` - Build config
- `MODULAR-README.md` - This file

### Files Modified
- `src/lib/core.js` - Added backward compatibility references
- `manifest.json` - Added new modules

### No Changes To
- Storage keys (all preserved)
- Message types (all preserved)
- API endpoints (all preserved)
- Client configurations
- Server-side Python code
- Test files

## Migration Path (Optional)

New code can use the modular approach while old code continues to work:

```javascript
// OLD way (still works)
const config = await ATS.storage.get('activeClient');

// NEW way (more maintainable)
const storage = window.storageManager;
const config = await storage.getConfigValue('activeClient');

// Using constants
const endpoint = window.ATS_CONSTANTS.API_ENDPOINTS.ANALYZE;

// Using client manager
const clientManager = new ClientManager();
await clientManager.loadClient('flyland');
```
