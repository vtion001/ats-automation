#!/usr/bin/env python3
"""
ATS Remote Log Viewer
Real-time monitoring of extension logs from remote workstations
Uses ngrok/webhook to receive logs over the internet
"""

import os
import sys
import json
import time
import subprocess
import threading
import argparse
import socket
from pathlib import Path
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import parse_qs
import webbrowser

# Try to import colorama
try:
    from colorama import init, Fore, Style

    init(autoreset=True)
    COLORS = {
        "log": "",
        "warn": Fore.YELLOW,
        "error": Fore.RED,
        "info": Fore.CYAN,
        "success": Fore.GREEN,
    }
except ImportError:
    COLORS = {k: "" for k in ["log", "warn", "error", "info", "success"]}


class LogStore:
    def __init__(self):
        self.logs = []
        self.max_logs = 1000  # Keep last 1000 logs in memory
        self.lock = threading.Lock()

    def add(self, log_entry):
        with self.lock:
            self.logs.insert(0, {**log_entry, "received_at": datetime.now().isoformat()})
            # Trim old logs
            if len(self.logs) > self.max_logs:
                self.logs = self.logs[: self.max_logs]

    def get_all(self):
        with self.lock:
            return list(self.logs)

    def get_filtered(self, source=None, level=None, client=None, since=None):
        with self.lock:
            filtered = []
            for log in self.logs:
                if source and log.get("source") != source:
                    continue
                if level and log.get("level") != level:
                    continue
                if client and log.get("client") != client:
                    continue
                if since:
                    log_time = log.get("received_at", "")
                    if log_time < since:
                        continue
                filtered.append(log)
            return filtered


class RemoteLogHandler(SimpleHTTPRequestHandler):
    log_store = None
    ngrok_process = None

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(self.get_html().encode())

        elif self.path == "/api/logs":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            # Get query params
            query = parse_qs(self.path.split("?")[1] if "?" in self.path else "")
            source = query.get("source", [None])[0]
            level = query.get("level", [None])[0]
            client = query.get("client", [None])[0]

            logs = self.log_store.get_filtered(source, level, client)
            self.wfile.write(json.dumps(logs).encode())

        elif self.path == "/api/clear":
            self.log_store.logs = []
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())

        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/logs/"):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")

            try:
                log_entry = json.loads(body)
                self.log_store.add(log_entry)
                print(
                    f"📨 Log received: [{log_entry.get('source', '?'):8}] {log_entry.get('level', '?'):5} - {log_entry.get('message', '')[:50]}"
                )

                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok"}).encode())
            except json.JSONDecodeError:
                self.send_response(400)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress default logging

    @staticmethod
    def get_html():
        return """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ATS Remote Log Viewer</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: 'Consolas', 'Monaco', monospace; 
            background: #1a1a2e; 
            color: #eee; 
            margin: 0; 
            padding: 0;
        }
        .header { 
            background: #16213e; 
            padding: 15px 20px; 
            display: flex; 
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #0f3460;
        }
        .header h1 { margin: 0; font-size: 18px; color: #00d9ff; }
        .stats { color: #888; font-size: 12px; }
        .controls {
            display: flex;
            gap: 10px;
            padding: 10px 20px;
            background: #16213e;
            border-bottom: 1px solid #0f3460;
        }
        .controls select, .controls button {
            padding: 6px 12px;
            border: 1px solid #0f3460;
            background: #1a1a2e;
            color: #eee;
            border-radius: 4px;
            cursor: pointer;
        }
        .controls button:hover { background: #0f3460; }
        .log-container {
            height: calc(100vh - 120px);
            overflow-y: auto;
            padding: 10px;
        }
        .log-entry {
            padding: 8px 12px;
            margin: 4px 0;
            background: #16213e;
            border-radius: 4px;
            font-size: 13px;
            border-left: 3px solid #555;
        }
        .log-entry.warn { border-left-color: #ffc107; }
        .log-entry.error { border-left-color: #dc3545; }
        .log-entry.success { border-left-color: #28a745; }
        .log-entry.info { border-left-color: #00d9ff; }
        .log-time { color: #666; font-size: 11px; margin-right: 10px; }
        .log-source { 
            font-weight: bold; 
            margin-right: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
        }
        .log-source.ctm { background: #e91e63; }
        .log-source.extension { background: #2196f3; }
        .log-source.server { background: #4caf50; }
        .log-level { 
            margin-right: 10px;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 3px;
        }
        .log-level.error { background: #dc3545; }
        .log-level.warn { background: #ffc107; color: #000; }
        .log-level.info { background: #00d9ff; color: #000; }
        .log-message { color: #fff; word-break: break-all; }
        .log-data { 
            margin-top: 5px; 
            padding: 5px; 
            background: #0f3460; 
            border-radius: 3px;
            font-size: 11px;
            color: #aaa;
            white-space: pre-wrap;
        }
        .no-logs { 
            text-align: center; 
            padding: 40px; 
            color: #666;
        }
        .url-box {
            background: #0f3460;
            padding: 10px 15px;
            font-size: 12px;
            border-radius: 4px;
            margin-left: 20px;
        }
        .url-box span { color: #00d9ff; }
        .client-badge {
            display: inline-block;
            padding: 2px 8px;
            background: #9333ea;
            border-radius: 3px;
            font-size: 11px;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📡 ATS Remote Log Viewer</h1>
        <div class="stats" id="stats">Waiting for logs...</div>
    </div>
    <div class="controls">
        <select id="filterSource">
            <option value="">All Sources</option>
            <option value="ctm">CTM</option>
            <option value="extension">Extension</option>
            <option value="server">Server</option>
        </select>
        <select id="filterLevel">
            <option value="">All Levels</option>
            <option value="log">Log</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
        </select>
        <select id="filterClient">
            <option value="">All Clients</option>
            <option value="flyland">Flyland</option>
            <option value="banyan">Banyan</option>
            <option value="element">Element</option>
            <option value="takami">Takami</option>
            <option value="tbt">TBT</option>
        </select>
        <button onclick="clearLogs()">Clear</button>
        <button onclick="location.reload()">Refresh</button>
        <div class="url-box">
            Extension endpoint: <span id="endpoint">http://localhost:5000/api/logs/client</span>
        </div>
    </div>
    <div class="log-container" id="logContainer">
        <div class="no-logs">Waiting for logs from remote extension...</div>
    </div>

    <script>
        let logs = [];
        
        async function fetchLogs() {
            try {
                const source = document.getElementById('filterSource').value;
                const level = document.getElementById('filterLevel').value;
                const client = document.getElementById('filterClient').value;
                
                let url = '/api/logs';
                const params = [];
                if (source) params.push('source=' + source);
                if (level) params.push('level=' + level);
                if (client) params.push('client=' + client);
                if (params.length) url += '?' + params.join('&');
                
                const response = await fetch(url);
                logs = await response.json();
                renderLogs();
            } catch (e) {
                console.error('Error fetching logs:', e);
            }
        }
        
        function renderLogs() {
            const container = document.getElementById('logContainer');
            const stats = document.getElementById('stats');
            
            if (logs.length === 0) {
                container.innerHTML = '<div class="no-logs">No logs match the current filter</div>';
                stats.textContent = '0 logs';
                return;
            }
            
            stats.textContent = `${logs.length} logs`;
            container.innerHTML = logs.map(log => {
                const time = new Date(log.received_at || log.timestamp).toLocaleTimeString();
                const data = log.data || {};
                const dataStr = Object.keys(data).length ? JSON.stringify(data, null, 2) : '';
                
                return `<div class="log-entry ${log.level || 'log'}">
                    <span class="log-time">${time}</span>
                    <span class="log-source ${log.source || 'unknown'}">${log.source || '?'}</span>
                    ${log.level ? `<span class="log-level ${log.level}">${log.level}</span>` : ''}
                    ${log.client ? `<span class="client-badge">${log.client}</span>` : ''}
                    <span class="log-message">${log.message || ''}</span>
                    ${dataStr ? `<div class="log-data">${dataStr}</div>` : ''}
                </div>`;
            }).join('');
        }
        
        function clearLogs() {
            fetch('/api/clear', { method: 'POST' });
            logs = [];
            renderLogs();
        }
        
        // Event listeners
        ['filterSource', 'filterLevel', 'filterClient'].forEach(id => {
            document.getElementById(id).addEventListener('change', fetchLogs);
        });
        
        // Poll for new logs
        setInterval(fetchLogs, 2000);
        
        // Initial fetch
        fetchLogs();
        
        // Update endpoint URL
        document.getElementById('endpoint').textContent = `${window.location.host}/api/logs/{client}`;
    </script>
</body>
</html>"""


def find_free_port():
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def start_ngrok(port):
    """Start ngrok tunnel if available"""
    ngrok_paths = ["ngrok", "C:\\ngrok.exe", "/usr/local/bin/ngrok", "/opt/homebrew/bin/ngrok"]

    for ngrok in ngrok_paths:
        try:
            print(f"Starting ngrok on port {port}...")
            process = subprocess.Popen(
                [ngrok, "http", str(port), "--log", "stdout"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            # Wait for ngrok to start
            time.sleep(3)

            # Try to get the public URL
            try:
                import requests

                response = requests.get("http://localhost:4040/api/tunnels", timeout=5)
                tunnels = response.json().get("tunnels", [])
                for tunnel in tunnels:
                    if tunnel.get("proto") == "https":
                        return tunnel["public_url"], process
            except:
                pass

            return f"http://localhost:{port}", process

        except Exception as e:
            print(f"ngrok not found or failed: {e}")
            continue

    return None, None


def run_server(port, use_ngrok=False):
    LogStore.log_store = LogStore()

    handler = RemoteLogHandler
    handler.log_store = LogStore()

    server = HTTPServer(("0.0.0.0", port), handler)

    print(f"""
╔════════════════════════════════════════════════════════════════╗
║           ATS Remote Log Viewer                               ║
╠════════════════════════════════════════════════════════════════╣
║  Local URL:  http://localhost:{port}                           ║
║  Extension:  POST http://localhost:{port}/api/logs/{{client}}     ║
╚════════════════════════════════════════════════════════════════╝
""")

    if use_ngrok:
        public_url, ngrok_process = start_ngrok(port)
        if public_url:
            print(f"""
╔════════════════════════════════════════════════════════════════╗
║  🔗 PUBLIC URL (share with remote agent)                      ║
║     {public_url}                            ║
╚════════════════════════════════════════════════════════════════╝

Update extension config with:
{public_url}/api/logs/flyland
""")
            if ngrok_process:
                print("Press Ctrl+C to stop ngrok...")

    print("Waiting for logs...\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        server.shutdown()
        if ngrok_process:
            ngrok_process.terminate()


def main():
    parser = argparse.ArgumentParser(description="ATS Remote Log Viewer")
    parser.add_argument("--port", "-p", type=int, default=0, help="Port to run on (default: auto)")
    parser.add_argument("--ngrok", "-n", action="store_true", help="Start ngrok tunnel")

    args = parser.parse_args()

    port = args.port if args.port else find_free_port()

    run_server(port, args.ngrok)


if __name__ == "__main__":
    main()
