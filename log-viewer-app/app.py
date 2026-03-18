"""
ATS Remote Log Viewer - Flask App for Azure
Receives logs and forwards to AI server for persistence.
Reads logs from AI server for display.
"""

import os
import requests
from datetime import datetime
from flask import Flask, request, jsonify, render_template_string

app = Flask(__name__)

AI_SERVER_URL = os.environ.get(
    "AI_SERVER_URL", "https://ags-ai-server.ashyocean-acabefe6.eastus.azurecontainerapps.io"
)

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
.ai-status{font-size:10px;margin-left:15px}.ai-status.connected{color:#3fb950}.ai-status.disconnected{color:#f85149}
</style></head><body>
<div class="header"><h1>📡 ATS Remote Log Viewer <span class="live pulse">● LIVE</span><span class="ai-status" id="aiStatus">checking AI server...</span></h1><div class="stats" id="stats">0 logs</div></div>
<div class="controls">
<select id="fs"><option value="">All Sources</option><option value="ctm">CTM</option><option value="extension">Extension</option><option value="server">Server</option></select>
<select id="fl"><option value="">All Levels</option><option value="log">Log</option><option value="info">Info</option><option value="warn">Warning</option><option value="error">Error</option></select>
<select id="fc"><option value="">All Clients</option><option value="flyland">Flyland</option><option value="banyan">Banyan</option><option value="element">Element</option><option value="takami">Takami</option><option value="tbt">TBT</option></select>
<button onclick="clearLogs()">Clear</button>
<div class="url-box">Backend: <span id="ep">-</span></div>
</div>
<div class="log-container" id="lc"><div class="no-logs">Waiting for logs...</div></div>
<script>
const AI_SERVER = document.currentScript?._aiServer || '';
let logs=[];
let aiConnected=false;
async function fetchLogs(){
  try{
    let url=AI_SERVER+'/api/logs?';
    if(document.getElementById('fs').value)url+='source='+document.getElementById('fs').value+'&';
    if(document.getElementById('fl').value)url+='level='+document.getElementById('fl').value+'&';
    if(document.getElementById('fc').value)url+='client='+document.getElementById('fc').value+'&';
    const r=await fetch(url);logs=await r.json();render();aiConnected=true;
  }catch(e){
    console.error('AI server unreachable:',e);
    aiConnected=false;
    render();
  }
  updateAiStatus();
}
function render(){
  const c=document.getElementById('lc');
  const s=document.getElementById('stats');
  if(!aiConnected&&logs.length===0){c.innerHTML='<div class="no-logs">AI server unreachable. Waiting for connection...</div>';s.textContent='?';return}
  if(logs.length===0){c.innerHTML='<div class="no-logs">No logs</div>';s.textContent='0 logs';return}
  s.textContent=logs.length+' logs';
  c.innerHTML=logs.map(l=>{
    const t=new Date(l.received_at||l.timestamp||Date.now()).toLocaleTimeString();
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
function updateAiStatus(){
  const el=document.getElementById('aiStatus');
  if(el){el.textContent=aiConnected?'✓ AI server connected':'✗ AI server unreachable';el.className='ai-status '+(aiConnected?'connected':'disconnected');}
}
['fs','fl','fc'].forEach(id=>document.getElementById(id).addEventListener('change',fetchLogs));
setInterval(fetchLogs,2000);fetchLogs();
document.getElementById('ep').textContent=AI_SERVER.replace('https://','');
function clearLogs(){
  if(!aiConnected){alert('AI server unreachable. Cannot clear logs.');return}
  fetch(AI_SERVER+'/api/logs/clear',{method:'POST'}).then(()=>{logs=[];render()}).catch(()=>{alert('Failed to clear logs')});
}
</script></body></html>"""


@app.route("/")
def index():
    return render_template_string(HTML_TEMPLATE)


@app.route("/api/logs")
def get_logs():
    source = request.args.get("source")
    level = request.args.get("level")
    client = request.args.get("client")

    try:
        params = {}
        if source:
            params["source"] = source
        if level:
            params["level"] = level
        if client:
            params["client"] = client

        resp = requests.get(f"{AI_SERVER_URL}/api/logs", params=params, timeout=10)
        resp.raise_for_status()
        return jsonify(resp.json())
    except Exception as e:
        print(f"Error fetching from AI server: {e}")
        return jsonify([])


@app.route("/api/logs/<client>", methods=["POST"])
def add_log(client):
    try:
        log_entry = request.get_json()
        log_entry["received_at"] = datetime.now().isoformat()
        log_entry["client"] = client

        print(
            f"📨 [{client}] {log_entry.get('level', 'log')} - {log_entry.get('message', '')[:60]}"
        )

        try:
            resp = requests.post(f"{AI_SERVER_URL}/api/logs/{client}", json=log_entry, timeout=5)
            if resp.status_code == 200:
                return jsonify({"status": "ok", "forwarded": True})
        except Exception as e:
            print(f"Warning: Could not forward to AI server: {e}")

        return jsonify({"status": "ok", "forwarded": False})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route("/api/clear", methods=["POST"])
def clear_logs():
    try:
        resp = requests.post(f"{AI_SERVER_URL}/api/logs/clear", timeout=10)
        resp.raise_for_status()
        return jsonify({"status": "ok"})
    except Exception as e:
        print(f"Error clearing logs on AI server: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/health")
def health():
    try:
        resp = requests.get(f"{AI_SERVER_URL}/api/logs", timeout=5)
        ai_ok = resp.status_code == 200
    except:
        ai_ok = False
    return jsonify({"status": "ok", "ai_server_connected": ai_ok})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
