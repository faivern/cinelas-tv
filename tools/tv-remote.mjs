// Browser-based TV remote for the Android emulator (WSLg's Qt Extended
// Controls window is unresponsive, so this replaces its D-pad panel).
//
//   node tools/tv-remote.mjs        → open http://localhost:5599
//
// Buttons (or your keyboard: arrows, Enter=OK, Esc/Backspace=Back, H=Home)
// are sent to the connected emulator/device via `adb shell input`.
import http from 'node:http';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';

const PORT = 5599;
const ADB =
  process.env.ADB ||
  path.join(process.env.ANDROID_HOME || path.join(homedir(), 'Android', 'Sdk'), 'platform-tools', 'adb');

function adb(args, res) {
  execFile(ADB, args, { timeout: 10000 }, (err) => {
    res.writeHead(err ? 500 : 204).end(err ? String(err) : undefined);
  });
}

const PAGE = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><title>Cinelas TV Remote</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root { --bg:#111318; --btn:#23262e; --btn-hi:#2f3340; --accent:#3ea6ff; }
  * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  body { margin:0; min-height:100vh; display:grid; place-items:center;
         background:#05060a; font-family:system-ui,sans-serif; color:#dfe3ea; }
  .remote { width:230px; padding:26px 20px 30px; border-radius:40px; background:var(--bg);
            box-shadow:0 20px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06);
            display:flex; flex-direction:column; align-items:center; gap:18px; }
  h1 { font-size:11px; letter-spacing:.35em; font-weight:600; color:#8a90a0; margin:0; }
  .dpad { position:relative; width:170px; height:170px; border-radius:50%; background:var(--btn); }
  .dpad button { position:absolute; width:56px; height:56px; border:0; border-radius:50%;
                 background:transparent; color:#cfd4de; font-size:20px; cursor:pointer; }
  .dpad button:hover { color:var(--accent); }
  .dpad button:active { background:var(--btn-hi); }
  .up{top:2px;left:57px} .down{bottom:2px;left:57px} .left{left:2px;top:57px} .right{right:2px;top:57px}
  .ok { top:50%; left:50%; transform:translate(-50%,-50%); width:64px; height:64px;
        border-radius:50%; border:0; background:#05060a; color:#fff; font-size:12px;
        font-weight:700; letter-spacing:.1em; cursor:pointer;
        box-shadow:0 0 0 2px rgba(255,255,255,.08); position:absolute; }
  .ok:active { box-shadow:0 0 0 2px var(--accent); color:var(--accent); }
  .row { display:flex; gap:14px; }
  .row button { width:56px; height:56px; border-radius:50%; border:0; background:var(--btn);
                color:#cfd4de; font-size:18px; cursor:pointer; }
  .row button:hover { color:var(--accent); }
  .row button:active { background:var(--btn-hi); }
  form { display:flex; gap:8px; width:100%; }
  input { flex:1; min-width:0; background:var(--btn); border:1px solid #333845; border-radius:10px;
          padding:9px 10px; color:#fff; font-size:13px; }
  input:focus { outline:none; border-color:var(--accent); }
  form button { border:0; border-radius:10px; background:var(--accent); color:#04121f;
                font-weight:700; padding:0 12px; cursor:pointer; }
  .hint { font-size:10px; color:#5a6070; text-align:center; line-height:1.6; margin:0; }
</style></head><body>
<div class="remote">
  <h1>CINELAS</h1>
  <div class="dpad">
    <button class="up"    data-key="19">&#9650;</button>
    <button class="left"  data-key="21">&#9664;</button>
    <button class="ok"    data-key="23">OK</button>
    <button class="right" data-key="22">&#9654;</button>
    <button class="down"  data-key="20">&#9660;</button>
  </div>
  <div class="row">
    <button data-key="4"  title="Back">&#8617;</button>
    <button data-key="3"  title="Home">&#8962;</button>
    <button data-key="85" title="Play/Pause">&#9199;</button>
    <button data-key="67" title="Delete">&#9003;</button>
  </div>
  <form id="textform">
    <input id="text" placeholder="Type text, press Send" autocomplete="off">
    <button type="submit">Send</button>
  </form>
  <p class="hint">Keyboard: arrows &middot; Enter = OK<br>Esc/Backspace = Back &middot; H = Home</p>
</div>
<script>
  const send = (k) => fetch('/key/' + k, { method: 'POST' });
  document.querySelectorAll('button[data-key]').forEach((b) =>
    b.addEventListener('click', () => send(b.dataset.key)));

  const KEYS = { ArrowUp:19, ArrowDown:20, ArrowLeft:21, ArrowRight:22,
                 Enter:23, Escape:4, Backspace:4, h:3, H:3, ' ':85 };
  addEventListener('keydown', (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    const k = KEYS[e.key];
    if (k !== undefined) { e.preventDefault(); send(k); }
  });

  document.getElementById('textform').addEventListener('submit', (e) => {
    e.preventDefault();
    const el = document.getElementById('text');
    if (el.value) fetch('/text?value=' + encodeURIComponent(el.value), { method: 'POST' });
    el.value = '';
    el.blur();
  });
</script>
</body></html>`;

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(PAGE);
      return;
    }

    const keyMatch = url.pathname.match(/^\/key\/(\d{1,3})$/);
    if (req.method === 'POST' && keyMatch) {
      adb(['shell', 'input', 'keyevent', keyMatch[1]], res);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/text') {
      // `input text` uses %s for spaces; keep to characters it handles safely.
      const value = (url.searchParams.get('value') || '')
        .replace(/[^a-zA-Z0-9 .,'!?:-]/g, '')
        .slice(0, 200)
        .replace(/ /g, '%s');
      if (!value) {
        res.writeHead(400).end('empty');
        return;
      }
      adb(['shell', 'input', 'text', value], res);
      return;
    }

    res.writeHead(404).end();
  })
  .listen(PORT, () => console.log(`TV remote: http://localhost:${PORT}`));
