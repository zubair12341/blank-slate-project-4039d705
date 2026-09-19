const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, 'config.test.json');
fs.writeFileSync(configPath, JSON.stringify({ printer: 'TEST', token: 'test-token', allowedOrigins: ['http://localhost:8080'], dryRun: true }));

const child = spawn(process.execPath, [path.join(__dirname, 'server.cjs')], {
  env: { ...process.env, PRINT_BRIDGE_PORT: '18182', PRINT_BRIDGE_CONFIG: configPath },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const request = (method, route, body) => new Promise((resolve, reject) => {
  const req = http.request({ hostname: '127.0.0.1', port: 18182, path: route, method, headers: {
    Origin: 'http://localhost:8080',
    'X-Print-Bridge-Token': 'test-token',
    'Content-Type': 'application/json',
  }}, res => {
    let raw=''; res.on('data', d => raw += d); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') }));
  });
  req.on('error', reject);
  if (body) req.write(JSON.stringify(body));
  req.end();
});

(async () => {
  try {
    await new Promise((resolve, reject) => {
      const timer=setTimeout(()=>reject(new Error('bridge startup timeout')),3000);
      child.stdout.on('data', d => { if (d.toString().includes('listening')) { clearTimeout(timer); resolve(); } });
      child.on('exit', code => reject(new Error('bridge exited '+code)));
    });
    const health=await request('GET','/health');
    if (health.status!==200 || !health.body.ok) throw new Error('health check failed');
    const job={jobId:'test-job-1',type:'TEST',content:'TEST PRINT'};
    const first=await request('POST','/print',job);
    const duplicate=await request('POST','/print',job);
    if (!first.body.ok || duplicate.body.duplicate!==true) throw new Error('print/idempotency test failed');
    console.log('PASS: health, authenticated print, dry-run printer, duplicate-job protection');
    process.exitCode=0;
  } catch(e) {
    console.error('FAIL:',e.message); process.exitCode=1;
  } finally {
    child.kill();
    try { fs.unlinkSync(configPath); } catch {}
  }
})();
