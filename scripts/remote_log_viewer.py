#!/usr/bin/env python3
"""
ATS Remote Log Viewer - Persistent Version
Creates a static-ish tunnel URL that persists across restarts
"""

import os
import sys
import json
import time
import subprocess
import threading
import socket
from pathlib import Path
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler

LOG_STORE = {"logs": [], "lock": threading.Lock()}


class LogHandler(SimpleHTTPRequestHandler):
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
            with LOG_STORE["lock"]:
                self.wfile.write(json.dumps(LOG_STORE["logs"]).encode())
        elif self.path == "/api/clear":
            with LOG_STORE["lock"]:
                LOG_STORE["logs"] = []
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path.startswith("/api/logs/"):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                log_entry = json.loads(body)
                with LOG_STORE["lock"]:
                    LOG_STORE["logs"].insert(
                        0, {**log_entry, "received_at": datetime.now().isoformat()}
                    )
                    if len(LOG_STORE["logs"]) > 5000:
                        LOG_STORE["logs"] = LOG_STORE["logs"][:5000]
                print(
                    f"📨 [{log_entry.get('source', '?'):8}] {log_entry.get('level', '?'):5} - {log_entry.get('message', '')[:60]}"
                )
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok"}).encode())
            except:
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
        pass

    @staticmethod
    def get_html():
        return """<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>ATS Remote Log Viewer</title>
<style>
*{box-sizing:border-box}body{font-family:Consolas,Monaco,monospace;background:#0d1117;color:#c9d1d9;margin:0;padding:0}
.header{background:#161b22;padding:15px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #30363d}
.header h1{margin:0;font-size:18px;color:#58a6ff}.stats{color:#8b949e;font-size:12px}
.controls{display:flex;gap:10px;padding:10px 20px;background:#161b22;border-bottom:1px solid #30363d;flex-wrap:wrap}
select,button{padding:6px 12px;border:1px solid #30363d;background:#0d1117;color:#c9d1d9;border-radius:6px;cursor:pointer}
button:hover{background:#21262d}.log-container{height:calc(100vh-120px);overflow-y:auto;padding:10px}
.log-entry{padding:10px 12px;margin:4px 0;background:#161b22;border-radius:6px;border-left:3px solid #30363d}
.log-entry.warn{border-left-color:#d29922}.log-entry.error{border-left-color:#f85149}.log-entry.info{border-left-color:#58a6ff}
.time{color:#484f58;font-size:11px;margin-right:10px}.source{font-weight:bold;margin-right:10px;padding:2px 8px;border-radius:4px;font-size:11px}
.source.ctm{background:#a371f7}.source.extension{background:#388bfd}.source.server{background:#3fb950}
.level{margin-right:10px;font-size:11px;padding:2px 6px;border-radius:4px}.level.error{background:#f85149}.level.warn{background:#d29922;color:#000}.level.info{background:#58a6ff;color:#000}
.message{color:#c9d1d9;word-break:break-all}.data{margin-top:8px;padding:8px;background:#0d1117;border-radius:4px;font-size:11px;color:#8b949e;white-space:pre-wrap;max-height:100px;overflow-y:auto}
.no-logs{text-align:center;padding:60px;color:#484f58}.badge{display:inline-block;padding:2px 8px;background:#238636;border-radius:4px;font-size:10px;margin-left:10px}
.live{color:#3fb950;font-size:10px;margin-left:10px}.url-box{background:#0d1117;padding:10px 15px;font-size:12px;border-radius:6px;margin-left:auto}
.url-box span{color:#58a6ff;font-weight:bold}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}.pulse{animation:pulse 2s infinite}
</style></head><body>
<div class="header"><h1>📡 ATS Remote Log Viewer <span class="live pulse">● LIVE</span></h1><div class="stats" id="stats">0 logs</div></div>
<div class="controls">
<select id="fs"><option value="">All Sources</option><option value="ctm">CTM</option><option value="extension">Extension</option><option value="server">Server</option></select>
<select id="fl"><option value="">All Levels</option><option value="log">Log</option><option value="info">Info</option><option value="warn">Warning</option><option value="error">Error</option></select>
<select id="fc"><option value="">All Clients</option><option value="flyland">Flyland</option><option value="banyan">Banyan</option><option value="element">Element</option><option value="takami">Takami</option><option value="tbt">TBT</option></select>
<button onclick="clearLogs()">Clear</button>
<div class="url-box">Endpoint: <span id="ep">-</span></div>
</div>
<div class="log-container" id="lc"><div class="no-logs">Waiting for logs...</div></div>
<script>
let logs=[];
async function fetchLogs(){
  try{
    let url='/api/logs?';
    if(document.getElementById('fs').value)url+='source='+document.getElementById('fs').value+'&';
    if(document.getElementById('fl').value)url+='level='+document.getElementById('fl').value+'&';
    if(document.getElementById('fc').value)url+='client='+document.getElementById('fc').value+'&';
    const r=await fetch(url);
    logs=await r.json();
    render();
  }catch(e){console.error(e)}}
function render(){
  const c=document.getElementById('lc');
  const s=document.getElementById('stats');
  if(logs.length===0){c.innerHTML='<div class="no-logs">No logs</div>';s.textContent='0 logs';return}
  s.textContent=logs.length+' logs';
  c.innerHTML=logs.map(l=>{
    const t=new Date(l.received_at||l.timestamp).toLocaleTimeString();
    const d=l.data||{};
    const ds=Object.keys(d).length?JSON.stringify(d,null,2):'';
    return`<div class="log-entry ${l.level||'log'}">
      <span class="time">${t}</span>
      <span class="source ${l.source||'?'}">${l.source||'?'}</span>
      ${l.level?'<span class="level '+l.level+'">'+l.level+'</span>':''}
      ${l.client?'<span class="badge">'+l.client+'</span>':''}
      <span class="message">${l.message||''}</span>
      ${ds?'<div class="data">'+ds+'</div>':''}
    </div>`;
  }).join('')
}
['fs','fl','fc'].forEach(id=>document.getElementById(id).addEventListener('change',fetchLogs));
setInterval(fetchLogs,2000);fetchLogs();
document.getElementById('ep').textContent=window.location.host+'/api/logs/{client}';
function clearLogs(){fetch('/api/clear',{method:'POST'});logs=[];render()}
</script></body></html>"""


def find_free_port():
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def save_url(url, port):
    """Save URL to config file"""
    config = {
        "url": url,
        "port": port,
        "last_updated": datetime.now().isoformat(),
        "setup_command": f'chrome.storage.local.set({{remoteLogUrl: "{url}"}});',
    }
    config_path = Path.home() / ".ats_log_viewer.json"
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"\n📝 URL saved to: {config_path}")
    return config_path


def load_saved_url():
    """Load previously saved URL"""
    config_path = Path.home() / ".ats_log_viewer.json"
    if config_path.exists():
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except:
            pass
    return None


def main():
    port = find_free_port()
    saved = load_saved_url()

    print(
        """
╔══════════════════════════════════════════════════════════════════════╗
║                   ATS Remote Log Viewer                               ║
╠══════════════════════════════════════════════════════════════════════╣
║  Starting server on port: """
        + str(port)
        + """                                   ║
╚══════════════════════════════════════════════════════════════════════╝
"""
    )

    # Try to start cloudflared tunnel
    tunnel_process = None
    tunnel_url = None

    try:
        print("🌐 Starting Cloudflare tunnel...")
        tunnel_process = subprocess.Popen(
            ["cloudflared", "tunnel", "--url", f"http://localhost:{port}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )

        # Read output to get URL
        import re

        for line in tunnel_process.stdout:
            print(line.rstrip())
            if "trycloudflare.com" in line:
                match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
                if match:
                    tunnel_url = match.group(0)
                    print(f"\n✅ Tunnel URL: {tunnel_url}")
                    break

        if tunnel_process.poll() is not None:
            print("⚠️  Tunnel process ended unexpectedly")

    except FileNotFoundError:
        print(
            "⚠️  cloudflared not found. Install with: brew install cloudflare/cloudflare/cloudflared"
        )
        print("   Server will only be accessible locally.")

    # Save config
    if tunnel_url:
        config_path = save_url(tunnel_url, port)
        print(f"\n📋 Windows Extension Setup:")
        print(f"   Run in Chrome DevTools (F12):")
        print(f"   chrome.storage.local.set({{remoteLogUrl: '{tunnel_url}'}});")
    else:
        print(f"\n📋 Local access: http://localhost:{port}")

    print(f"\n🔗 View logs: http://localhost:{port}")

    # Start HTTP server
    server = HTTPServer(("0.0.0.0", port), LogHandler)

    print("\n⏳ Waiting for logs... Press Ctrl+C to stop.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        server.shutdown()
        if tunnel_process:
            tunnel_process.terminate()


if __name__ == "__main__":
    main()
