/**
 * Tab Selector Popup Script
 * Allows user to select which tab to capture audio from
 */

let selectedTabId = null;
let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadTabs();
    document.getElementById('refreshBtn').addEventListener('click', loadTabs);
    document.getElementById('startBtn').addEventListener('click', startRecording);
    document.getElementById('stopBtn').addEventListener('click', stopRecording);
    checkRecordingStatus();
}

async function loadTabs() {
    const tabList = document.getElementById('tabList');
    tabList.innerHTML = '<p style="text-align:center;"><span class="loading-spinner"></span> Loading...</p>';
    
    try {
        const tabs = await chrome.tabs.query({ audible: true, currentWindow: false });
        const ctmTabs = await chrome.tabs.query({ url: '*://*.calltrackingmetrics.com/*' });

        const allTabs = [...tabs];
        const existingIds = new Set(tabs.map(t => t.id));
        for (const tab of ctmTabs) {
            if (!existingIds.has(tab.id)) allTabs.push(tab);
        }

        if (allTabs.length === 0) {
            tabList.innerHTML = '<p style="opacity:0.7;text-align:center;padding:20px;">No active tabs found</p>';
            return;
        }

        tabList.innerHTML = allTabs.map(tab => `
            <div class="tab-item" data-id="${tab.id}">
                <img class="tab-icon" src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%231e3a5f%22 width=%2216%22 height=%2216%22 rx=%223%22/></svg>'}" />
                <div class="tab-info">
                    <div class="tab-title">${tab.title || 'Untitled'}</div>
                    <div class="tab-url">${tab.url || ''}</div>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.tab-item').forEach(item => {
            item.addEventListener('click', () => selectTab(parseInt(item.dataset.id)));
        });
    } catch (e) {
        tabList.innerHTML = `<p style="color:#ef4444;text-align:center;">Error: ${e.message}</p>`;
    }
}

function selectTab(tabId) {
    selectedTabId = tabId;
    document.querySelectorAll('.tab-item').forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.id) === tabId);
    });
    document.getElementById('startBtn').classList.remove('hidden');
    chrome.tabs.get(tabId, tab => {
        updateStatus(`Selected: ${tab.title.substring(0, 30)}...`, 'stopped');
    });
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function startTimer() {
    stopTimer();
    recordingStartTime = Date.now();
    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    recordingStartTime = null;
}

function updateTimerDisplay() {
    if (!recordingStartTime) return;
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const timerEl = document.getElementById('recordingTimer');
    if (timerEl) {
        timerEl.textContent = formatDuration(elapsed);
    }
}

function setRecordingUI(recording) {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const status = document.getElementById('status');
    
    if (recording) {
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        status.classList.add('recording');
        status.classList.remove('stopped');
    } else {
        stopTimer();
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        status.classList.remove('recording');
        status.classList.add('stopped');
    }
}

async function startRecording() {
    if (!selectedTabId) {
        updateStatus('Please select a tab first', 'stopped');
        return;
    }
    
    updateStatus('Starting...', 'stopped');
    
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'START_TAB_CAPTURE',
            tabId: selectedTabId
        });
        
        if (response && response.success) {
            isRecording = true;
            setRecordingUI(true);
            updateStatus('Recording', 'recording');
            document.getElementById('recordingTimer')?.classList.remove('hidden');
            startTimer();
        } else {
            updateStatus('Error: ' + (response?.error || 'Unknown'), 'stopped');
        }
    } catch (e) {
        updateStatus('Error: ' + e.message, 'stopped');
    }
}

async function stopRecording() {
    updateStatus('Stopping...', 'stopped');
    
    try {
        await chrome.runtime.sendMessage({ action: 'STOP_TAB_CAPTURE' });
        isRecording = false;
        setRecordingUI(false);
        document.getElementById('recordingTimer')?.classList.add('hidden');
        updateStatus('Stopped', 'stopped');
    } catch (e) {
        updateStatus('Error: ' + e.message, 'stopped');
    }
}

function updateStatus(message, type = 'stopped') {
    const statusEl = document.getElementById('status');
    const statusText = document.getElementById('statusText');
    const dot = statusEl.querySelector('.status-dot');
    
    if (statusText) statusText.textContent = message;
    
    statusEl.className = 'status ' + type;
    
    if (type === 'recording' && dot) {
        dot.classList.add('working');
    } else if (dot) {
        dot.classList.remove('working');
    }
}

async function checkRecordingStatus() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_CAPTURE_STATUS' });
        
            if (response && response.recording) {
            selectedTabId = response.tabId;
            isRecording = true;
            setRecordingUI(true);
            document.getElementById('recordingTimer')?.classList.remove('hidden');
            
            if (response.startTime) {
                recordingStartTime = response.startTime;
                updateTimerDisplay();
                timerInterval = setInterval(updateTimerDisplay, 1000);
            }
            
            updateStatus('Recording', 'recording');
        }
    } catch (e) {
        // Ignore
    }
}
