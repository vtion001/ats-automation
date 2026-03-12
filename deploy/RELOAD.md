# ATS Chrome Extension Auto-Reloader

This script watches for changes in the chrome-extension folder and automatically reloads the extension in Chrome.

## Usage

### Option 1: Using Python (recommended)

```bash
# Install watchdog if not already installed
pip install watchdog

# Run the auto-reloader
python deploy/reload_extension.py
```

### Option 2: Using Node.js

```bash
# Install dependencies
npm install -g chokidar-cli

# Watch and reload
chokidar "chrome-extension/**/*" -i "*.md" --on-all -command 'echo "Reloading..." && taskkill /IM chrome.exe /F 2>nul || true && start chrome'
```

### Option 3: Manual (VS Code)

Install the "Chrome Extension Reloader" extension in VS Code and press `F5` to reload.

---

## For Development

1. Open Chrome with remote debugging:
   ```bash
   chrome.exe --remote-debugging-port=9222
   ```

2. Run the auto-reloader in a separate terminal

3. Edit files in `chrome-extension/` - changes will be auto-loaded

---

## Troubleshooting

If auto-reload doesn't work:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Update" button manually
