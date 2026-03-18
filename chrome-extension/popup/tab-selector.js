/**
 * Tab Selector Popup Script
 * Allows user to select which tab to capture audio from
 */

let selectedTabId = null;
let isRecording = false;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Load tabs
    await loadTabs();
    
    // Set up event listeners
    document.getElementById('refreshBtn').addEventListener('click', loadTabs);
    document.getElementById('startBtn').addEventListener('click', startRecording);
    document.getElementById('stopBtn').addEventListener('click', stopRecording);
    
    // Check current recording status
    checkRecordingStatus();
}

async function loadTabs() {
    const tabList = document.getElementById('tabList');
    tabList.innerHTML = '<p style="text-align:center;">Loading...</p>';
    
    try {
        // Get audible tabs
        const tabs = await chrome.tabs.query({
            audible: true,
            currentWindow: false
        });
        
        // Also get CTM tabs even if not audible
        const ctmTabs = await chrome.tabs.query({
            url: '*://*.calltrackingmetrics.com/*'
        });
        
        // Combine and dedupe
        const allTabs = [...tabs];
        const existingIds = new Set(tabs.map(t => t.id));
        
        for (const tab of ctmTabs) {
            if (!existingIds.has(tab.id)) {
                allTabs.push(tab);
            }
        }
        
        if (allTabs.length === 0) {
            tabList.innerHTML = '<p style="text-align:center;opacity:0.7;">No active tabs found</p>';
            return;
        }
        
        // Render tabs
        tabList.innerHTML = allTabs.map(tab => `
            <div class="tab-item" data-id="${tab.id}">
                <img class="tab-icon" src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23667eea%22 width=%2216%22 height=%2216%22/></svg>'}" />
                <div class="tab-info">
                    <div class="tab-title">${tab.title || 'Untitled'}</div>
                    <div class="tab-url">${tab.url || ''}</div>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        document.querySelectorAll('.tab-item').forEach(item => {
            item.addEventListener('click', () => selectTab(parseInt(item.dataset.id)));
        });
        
    } catch (e) {
        tabList.innerHTML = `<p style="color:#ef4444;">Error: ${e.message}</p>`;
    }
}

function selectTab(tabId) {
    selectedTabId = tabId;
    
    // Update UI
    document.querySelectorAll('.tab-item').forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.id) === tabId);
    });
    
    // Show start button
    document.getElementById('startBtn').classList.remove('hidden');
    
    // Get tab info
    chrome.tabs.get(tabId, tab => {
        updateStatus(`Selected: ${tab.title.substring(0, 30)}...`);
    });
}

async function startRecording() {
    if (!selectedTabId) {
        updateStatus('Please select a tab first', 'error');
        return;
    }
    
    updateStatus('Starting recording...', 'recording');
    
    try {
        // Send message to background to start capture
        const response = await chrome.runtime.sendMessage({
            action: 'START_TAB_CAPTURE',
            tabId: selectedTabId
        });
        
        if (response && response.success) {
            isRecording = true;
            document.getElementById('startBtn').classList.add('hidden');
            document.getElementById('stopBtn').classList.remove('hidden');
            document.getElementById('status').classList.add('recording');
            document.getElementById('status').classList.remove('stopped');
            updateStatus('🔴 Recording...', 'recording');
        } else {
            updateStatus('Error: ' + (response?.error || 'Unknown'), 'error');
        }
        
    } catch (e) {
        updateStatus('Error: ' + e.message, 'error');
    }
}

async function stopRecording() {
    updateStatus('Stopping...', 'stopped');
    
    try {
        await chrome.runtime.sendMessage({
            action: 'STOP_TAB_CAPTURE'
        });
        
        isRecording = false;
        document.getElementById('startBtn').classList.remove('hidden');
        document.getElementById('stopBtn').classList.add('hidden');
        document.getElementById('status').classList.remove('recording');
        document.getElementById('status').classList.add('stopped');
        updateStatus('Stopped', 'stopped');
        
    } catch (e) {
        updateStatus('Error: ' + e.message, 'error');
    }
}

function updateStatus(message, type = 'stopped') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
}

async function checkRecordingStatus() {
    // Check if already recording
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'GET_CAPTURE_STATUS'
        });
        
        if (response && response.recording) {
            selectedTabId = response.tabId;
            isRecording = true;
            document.getElementById('startBtn').classList.add('hidden');
            document.getElementById('stopBtn').classList.remove('hidden');
            document.getElementById('status').classList.add('recording');
            document.getElementById('status').classList.remove('stopped');
            updateStatus('🔴 Already recording', 'recording');
        }
    } catch (e) {
        // Ignore
    }
}
