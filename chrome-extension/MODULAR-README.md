# ATS Chrome Extension - Modular Architecture

## Overview

This extension has been refactored to be more maintainable and scalable while maintaining **100% backward compatibility** with existing code.

## New Directory Structure

```
src/
├── shared/                    # Pure JavaScript - NO Chrome APIs
│   ├── constants/           # All constants (storage keys, message types, endpoints)
│   │   └── index.js
│   └── utils/              # Utility functions
│       └── index.js
│
├── core/                     # Extension infrastructure
│   ├── di/                  # Dependency injection container
│   │   └── container.js
│   ├── messaging/          # Message bus abstraction
│   │   └── message-bus.js
│   ├── storage/            # Storage abstraction
│   │   └── storage-manager.js
│   ├── bootstrap.js        # Service registration
│   └── index.js           # Core module exports
│
├── services/                # Business logic (existing)
├── modules/                 # Feature modules (existing)
├── lib/                    # Legacy core (backward compatible)
└── main.js                # Entry point (existing)
```

## Key Principles

1. **No Breaking Changes** - All storage keys, message types, and API endpoints remain the same
2. **Layer Separation** - Shared code has ZERO Chrome API dependencies
3. **Dependency Injection** - Services can be injected via the container
4. **Backward Compatibility** - The existing `ATS` global object still works

## New Features

### Constants
```javascript
// Access constants
window.ATS_CONSTANTS.STORAGE_KEYS
window.ATS_CONSTANTS.MESSAGE_TYPES
window.ATS_CONSTANTS.API_ENDPOINTS

// Or via ATS
window.ATS.constants
```

### Container
```javascript
// Register a service
window.atsContainer.register('myService', (c) => {
    return new MyService(c.get('storage'));
});

// Get a service
const service = window.atsContainer.get('myService');
```

### Message Bus
```javascript
// Send message
window.messageBus.send('MY_MESSAGE', { data: 'value' });

// Listen for message
window.messageBus.on('MY_MESSAGE', (payload) => {
    console.log('Received:', payload);
});
```

### Storage Manager
```javascript
// Get config
const config = await window.storageManager.getConfig();

// Get notes
const notes = await window.storageManager.getNotes('flyland');

// Add note
await window.storageManager.addNote('flyland', 'Test note');
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

## Backward Compatibility

All existing code continues to work exactly as before:

- Storage keys unchanged (`ats_config`, `activeClient`, etc.)
- Message types unchanged (`CTM_CALL_EVENT`, `SEARCH_SALESFORCE`, etc.)
- API endpoints unchanged (`/api/analyze`, `/api/transcribe`, `/health`)
- Global objects unchanged (`ATS`, `CallMonitor`, `CTMService`, etc.)

## Migration Path (Optional)

New code can use the modular approach:

```javascript
// OLD way (still works)
const config = await ATS.storage.get('activeClient');

// NEW way (more maintainable)
const storage = window.storageManager;
const config = await storage.getConfigValue('activeClient');
```

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests  
npm run test:integration
```

## File Changes Summary

### New Files Created
- `src/shared/constants/index.js` - All constants
- `src/shared/utils/index.js` - Utility functions
- `src/core/di/container.js` - DI container
- `src/core/messaging/message-bus.js` - Message bus
- `src/core/storage/storage-manager.js` - Storage abstraction
- `src/core/bootstrap.js` - Service registration
- `src/core/index.js` - Core exports

### Files Modified
- `src/lib/core.js` - Added backward compatibility references
- `manifest.json` - Added new modules to content script load order
- `package.json` - Added npm scripts and wxt dependency

### No Changes To
- Storage keys
- Message types
- API endpoints
- Client configurations
- Server-side code
- Test files (they work with existing code)
