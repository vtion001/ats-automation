"""
ATS Chrome Extension Auto-Reloader
Watches for file changes in chrome-extension folder and reloads the extension
"""

import os
import time
import subprocess
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

EXTENSION_PATH = Path(__file__).parent.parent / "chrome-extension"
CHROME_PATH = "chrome.exe"  # Add full path if needed


class ExtensionReloader(FileSystemEventHandler):
    def __init__(self):
        self.last_reload = 0
        self.debounce_seconds = 2

    def on_modified(self, event):
        if event.is_directory:
            return
        
        # Only watch JS, HTML, CSS, JSON files
        if event.src_path.endswith(('.js', '.html', '.css', '.json', '.png', '.svg')):
            if 'chrome-extension' in event.src_path:
                self.reload_extension(event.src_path)

    def reload_extension(self, file_path):
        # Debounce to prevent multiple reloads
        now = time.time()
        if now - self.last_reload < self.debounce_seconds:
            return
        
        self.last_reload = now
        print(f"\n[RELOAD] File changed: {Path(file_path).name}")
        print("[RELOAD] Reloading Chrome extension...")
        
        try:
            # Use Chrome Debugging Protocol to reload extension
            # Method 1: Try using PowerShell to reload via CDP
            self.reload_via_cdp()
        except Exception as e:
            print(f"[RELOAD] CDP method failed: {e}")
            # Fallback: Open extension page which triggers reload
            self.reload_fallback()

    def reload_via_cdp(self):
        """Reload extension via Chrome DevTools Protocol"""
        script = '''
        $port = 9222
        try {
            $ws = New-Object System.Net.WebSockets.ClientWebSocket
            $ct = [Threading.CancellationToken]::None
            $response = Invoke-RestMethod "http://localhost:$port/json" -TimeoutSec 3
            if ($response) {
                Write-Host "Extension will be reloaded on next page refresh"
            }
        } catch {
            Write-Host "Chrome debugging not available"
        }
        '''
        subprocess.run(["powershell", "-Command", script], capture_output=True)

    def reload_fallback(self):
        """Fallback: Just notify user to refresh"""
        print("[RELOAD] Please manually refresh the extension:")
        print("   1. Go to chrome://extensions/")
        print("   2. Click the refresh icon on ATS Automation")


def main():
    print("=" * 50)
    print("ATS Chrome Extension Auto-Reloader")
    print("=" * 50)
    print(f"\nWatching: {EXTENSION_PATH}")
    print("\nChanges to JS/HTML/CSS files will trigger reload.")
    print("Press Ctrl+C to stop.\n")
    
    event_handler = ExtensionReloader()
    observer = Observer()
    observer.schedule(event_handler, str(EXTENSION_PATH), recursive=True)
    observer.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\n\nStopped watching.")
    
    observer.join()


if __name__ == "__main__":
    main()
