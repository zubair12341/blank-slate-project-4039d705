const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const VERSION = '1.0.0';
const HOST = process.env.PRINT_BRIDGE_HOST || '127.0.0.1';
const PORT = Number(process.env.PRINT_BRIDGE_PORT || 18181);
const CONFIG_PATH = process.env.PRINT_BRIDGE_CONFIG || path.join(__dirname, 'config.json');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return { printer: '', token: '', allowedOrigins: ['http://localhost:8080'], dryRun: true }; }
}
const config = readConfig();
const recentJobs = new Map();

function json(res, status, body, origin) {
  if (origin && isAllowedOrigin(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Print-Bridge-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(status);
  res.end(JSON.stringify(body));
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return (config.allowedOrigins || []).includes(origin);
}
function authorized(req) {
  if (!config.token) return true;
  return req.headers['x-print-bridge-token'] === config.token;
}
function pruneJobs() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, at] of recentJobs) if (at < cutoff) recentJobs.delete(id);
}
function printText(content, printer) {
  if (config.dryRun) {
    process.stdout.write('\n--- DRY RUN PRINT ---\n' + content + '\n--- END PRINT ---\n');
    return Promise.resolve();
  }
  if (!printer) return Promise.reject(new Error('No printer configured'));

  return new Promise((resolve, reject) => {
    let child;
    if (process.platform === 'win32') {
      const script = '$input | Out-Printer -Name $env:POS_PRINTER';
      child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        env: { ...process.env, POS_PRINTER: printer },
        windowsHide: true,
      });
    } else {
      child = spawn('lp', ['-d', printer], { env: process.env });
    }
    let stderr = '';
    child.stderr.on('data', d => stderr += d.toString());
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(stderr || `Printer process exited ${code}`)));
    child.stdin.end(content, 'utf8');
  });
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) return json(res, 403, { ok: false, error: 'Origin not allowed' });
  if (req.method === 'OPTIONS') return json(res, 204, {}, origin);
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'Unauthorized' }, origin);

  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { ok: true, service: 'arabic-shinwari-print-bridge', version: VERSION, printer: config.printer || undefined, dryRun: !!config.dryRun }, origin);
  }

  if (req.method === 'POST' && req.url === '/print') {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) req.destroy();
    });
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw || '{}');
        if (!body.jobId || !body.content || !body.type) return json(res, 400, { ok: false, error: 'jobId, type and content are required' }, origin);
        pruneJobs();
        if (recentJobs.has(body.jobId)) return json(res, 200, { ok: true, duplicate: true, jobId: body.jobId }, origin);
        const copies = Math.max(1, Math.min(Number(body.copies || 1), 3));
        const printer = body.printer || config.printer;
        for (let i = 0; i < copies; i++) await printText(String(body.content), printer);
        recentJobs.set(body.jobId, Date.now());
        return json(res, 200, { ok: true, jobId: body.jobId }, origin);
      } catch (error) {
        return json(res, 500, { ok: false, error: error.message || 'Print failed' }, origin);
      }
    });
    return;
  }
  return json(res, 404, { ok: false, error: 'Not found' }, origin);
});

server.listen(PORT, HOST, () => {
  console.log(`Arabic Shinwari Print Bridge v${VERSION} listening on http://${HOST}:${PORT}`);
  console.log(`Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE'} | Printer: ${config.printer || '(not configured)'}`);
});
