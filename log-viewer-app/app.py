"""
ATS Remote Log Viewer - Flask App for Azure
Simple web app that receives and displays logs from remote extensions
"""

import os
import json
import threading
from datetime import datetime
from flask import Flask, request, jsonify, render_template_string

app = Flask(__name__)

# Thread-safe log storage
LOG_STORE = {"logs": [], "lock": threading.Lock()}
MAX_LOGS = 5000

HTML_TEMPLATE = """<!DOCTYPE html>
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
    const r=await fetch(url);logs=await r.json();render();
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


@app.route("/")
def index():
    return render_template_string(HTML_TEMPLATE)


@app.route("/api/logs")
def get_logs():
    source = request.args.get("source")
    level = request.args.get("level")
    client = request.args.get("client")

    with LOG_STORE["lock"]:
        logs = list(LOG_STORE["logs"])

    filtered = []
    for log in logs:
        if source and log.get("source") != source:
            continue
        if level and log.get("level") != level:
            continue
        if client and log.get("client") != client:
            continue
        filtered.append(log)

    return jsonify(filtered)


@app.route("/api/logs/<client>", methods=["POST"])
def add_log(client):
    try:
        log_entry = request.get_json()
        log_entry["received_at"] = datetime.now().isoformat()
        log_entry["client"] = client

        with LOG_STORE["lock"]:
            LOG_STORE["logs"].insert(0, log_entry)
            if len(LOG_STORE["logs"]) > MAX_LOGS:
                LOG_STORE["logs"] = LOG_STORE["logs"][:MAX_LOGS]

        print(
            f"📨 [{client}] {log_entry.get('level', 'log')} - {log_entry.get('message', '')[:60]}"
        )
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route("/api/clear", methods=["POST"])
def clear_logs():
    with LOG_STORE["lock"]:
        LOG_STORE["logs"] = []
    return jsonify({"status": "ok"})


@app.route("/health")
def health():
    return jsonify({"status": "ok", "logs_count": len(LOG_STORE["logs"])})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
