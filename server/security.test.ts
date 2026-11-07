import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { safeErrorCode } from './logging.ts';

const projectRoot = process.cwd();
let server: ChildProcess | undefined;
let baseUrl = '';
let appOrigin = '';
let serverOutput = '';

async function availablePort() {
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const address = listener.address();
  if (!address || typeof address === 'string') throw new Error('Could not reserve a local test port.');
  await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return address.port;
}

before(async () => {
  const port = await availablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  appOrigin = baseUrl;
  const tsxCli = path.join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  server = spawn(process.execPath, [tsxCli, 'server.ts'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(port),
      APP_ORIGIN: appOrigin,
      SESSION_SECRET: 'phase5-security-smoke-secret-value-only',
      DATABASE_URL: '',
      SMTP_HOST: '',
      SMTP_FROM_EMAIL: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout?.on('data', chunk => { serverOutput += String(chunk); });
  server.stderr?.on('data', chunk => { serverOutput += String(chunk); });

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Test server exited early:\n${serverOutput}`);
    try {
      const response = await fetch(`${baseUrl}/api/health/live`);
      if (response.ok) return;
    } catch { /* Server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Test server did not become ready:\n${serverOutput}`);
});

after(async () => {
  if (!server || server.exitCode !== null) return;
  server.kill('SIGTERM');
  await Promise.race([once(server, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]);
  if (server.exitCode === null) server.kill('SIGKILL');
});

describe('server hardening', () => {
  it('reduces logged errors to safe diagnostic codes', () => {
    const error = Object.assign(new Error('license key CUSTOMER-ABCD-EFGH-IJKL-MNOP'), { code: 'EENVELOPE' });
    assert.equal(safeErrorCode(error), 'EENVELOPE');
    assert.equal(safeErrorCode(new Error('smtp-password-secret')), 'INTERNAL_ERROR');
    assert.equal(safeErrorCode({ code: 'password=secret' }), 'INTERNAL_ERROR');
  });

  it('sends baseline security and no-cache headers', async () => {
    const response = await fetch(`${baseUrl}/api/health/live`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });

  it('rejects missing and cross-origin authentication mutations', async () => {
    const missing = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
    assert.equal(missing.status, 403);
    assert.equal((await missing.json()).code, 'ORIGIN_NOT_ALLOWED');

    const crossOrigin = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST', headers: { Origin: 'https://attacker.example' },
    });
    assert.equal(crossOrigin.status, 403);
  });

  it('accepts same-origin logout and rejects unauthenticated admin writes afterward', async () => {
    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST', headers: { Origin: appOrigin },
    });
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get('set-cookie') || '', /HttpOnly/);

    const crossOriginAdmin = await fetch(`${baseUrl}/api/v1/admin/licenses`, {
      method: 'POST', headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(crossOriginAdmin.status, 403);

    const sameOriginUnauthenticatedAdmin = await fetch(`${baseUrl}/api/v1/admin/licenses`, {
      method: 'POST', headers: { Origin: appOrigin, 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(sameOriginUnauthenticatedAdmin.status, 401);
  });

  it('applies OTP request throttling without disclosing whether an address is allowed', async () => {
    const requestCode = () => fetch(`${baseUrl}/api/auth/request-code`, {
      method: 'POST',
      headers: { Origin: appOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-authorized@example.test' }),
    });
    const first = await requestCode();
    assert.equal(first.status, 200);
    assert.match((await first.json()).message, /If this address is authorized/);
    const second = await requestCode();
    assert.equal(second.status, 429);
  });

  it('keeps native client validation independent of browser Origin headers', async () => {
    const response = await fetch(`${baseUrl}/api/v1/license/validate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error_code, 'INVALID_REQUEST');
  });
});
