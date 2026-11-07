import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer as createNetServer, type Socket } from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import pg from 'pg';

const projectRoot = process.cwd();
let app: ChildProcess | undefined;
let appUrl = '';
let smtpServer: ReturnType<typeof createNetServer> | undefined;
let smtpPort = 0;
let oneTimeCode = '';
let appOutput = '';
let rejectNextRecipient = false;

const emailCode = (message: string) => {
  const match = message.match(/sign-in code is\s*(?:=3D)?(\d{6})/i);
  if (match) oneTimeCode = match[1];
};

function fakeSmtpConnection(socket: Socket) {
  let pending = '';
  let inMessage = false;
  let message = '';
  socket.write('220 localhost ESMTP\r\n');
  socket.on('data', chunk => {
    pending += chunk.toString('utf8');
    while (pending.includes('\r\n')) {
      const end = pending.indexOf('\r\n');
      const line = pending.slice(0, end + 2);
      pending = pending.slice(end + 2);
      if (inMessage) {
        if (line === '.\r\n') {
          inMessage = false;
          emailCode(message);
          message = '';
          socket.write('250 2.0.0 queued\r\n');
        } else message += line;
        continue;
      }
      const command = line.trim().toUpperCase();
      if (command.startsWith('EHLO') || command.startsWith('HELO')) socket.write('250-localhost\r\n250 AUTH PLAIN LOGIN\r\n');
      else if (command.startsWith('AUTH')) socket.write('235 2.7.0 authenticated\r\n');
      else if (command.startsWith('RCPT TO') && rejectNextRecipient) {
        rejectNextRecipient = false;
        socket.write('550 5.1.1 simulated recipient rejection\r\n');
      }
      else if (command.startsWith('MAIL FROM') || command.startsWith('RCPT TO') || command === 'RSET') socket.write('250 2.1.0 ok\r\n');
      else if (command === 'DATA') { inMessage = true; socket.write('354 end with dot\r\n'); }
      else if (command === 'QUIT') { socket.write('221 2.0.0 bye\r\n'); socket.end(); }
      else socket.write('250 2.0.0 ok\r\n');
    }
  });
}

async function freePort() {
  const server = createNetServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not reserve a test port.');
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port;
}

describe('database-backed administrator session', { skip: !process.env.DATABASE_URL }, () => {
  before(async () => {
    smtpServer = createNetServer(fakeSmtpConnection);
    smtpServer.listen(0, '127.0.0.1');
    await once(smtpServer, 'listening');
    const smtpAddress = smtpServer.address();
    if (!smtpAddress || typeof smtpAddress === 'string') throw new Error('Fake SMTP did not start.');
    smtpPort = smtpAddress.port;

    const appPort = await freePort();
    appUrl = `http://127.0.0.1:${appPort}`;
    const tsxCli = path.join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    app = spawn(process.execPath, [tsxCli, 'server.ts'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT: String(appPort),
        APP_ORIGIN: appUrl,
        SESSION_SECRET: 'phase5-db-session-integration-secret',
        SMTP_HOST: '127.0.0.1',
        SMTP_PORT: String(smtpPort),
        SMTP_SECURE: 'false',
        SMTP_USER: 'test-user',
        SMTP_PASSWORD: 'test-password',
        SMTP_FROM_EMAIL: 'LicensePulse Test <licensepulse@example.test>',
        EMAIL_OUTBOX_ENCRYPTION_KEY: 'a'.repeat(64),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    app.stdout?.on('data', chunk => { appOutput += String(chunk); });
    app.stderr?.on('data', chunk => { appOutput += String(chunk); });

    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      if (app.exitCode !== null) throw new Error(`Test app exited early:\n${appOutput}`);
      try {
        const response = await fetch(`${appUrl}/api/health/ready`);
        if (response.ok) return;
      } catch { /* Wait for the local app to bind. */ }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error(`Test app did not become ready:\n${appOutput}`);
  });

  after(async () => {
    if (app && app.exitCode === null) {
      app.kill('SIGTERM');
      await Promise.race([once(app, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]);
      if (app.exitCode === null) app.kill('SIGKILL');
    }
    if (smtpServer?.listening) await new Promise<void>(resolve => smtpServer!.close(() => resolve()));
  });

  it('authenticates, issues and retries a license, enforces seats, and revokes copied sessions', async () => {
    const codeRequest = await fetch(`${appUrl}/api/auth/request-code`, {
      method: 'POST', headers: { Origin: appUrl, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mistervela@gmail.com' }),
    });
    assert.equal(codeRequest.status, 200);

    const codeDeadline = Date.now() + 5000;
    while (!oneTimeCode && Date.now() < codeDeadline) await new Promise(resolve => setTimeout(resolve, 50));
    assert.match(oneTimeCode, /^\d{6}$/);

    const verified = await fetch(`${appUrl}/api/auth/verify-code`, {
      method: 'POST', headers: { Origin: appUrl, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mistervela@gmail.com', code: oneTimeCode }),
    });
    assert.equal(verified.status, 200);
    const setCookie = verified.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';', 1)[0];
    assert.match(cookie, /^licensepulse_session=/);
    assert.equal(setCookie.includes('HttpOnly'), true);
    const signedToken = decodeURIComponent(cookie.slice('licensepulse_session='.length));
    const sessionId = JSON.parse(Buffer.from(signedToken.split('.')[0], 'base64url').toString('utf8')).sid as string;

    const validSession = await fetch(`${appUrl}/api/auth/session`, { headers: { Cookie: cookie } });
    assert.equal(validSession.status, 200);
    const adminAccess = await fetch(`${appUrl}/api/v1/admin/session`, { headers: { Cookie: cookie } });
    assert.equal(adminAccess.status, 200);

    rejectNextRecipient = true;
    const productSlug = `phase-5-smoke-${Date.now()}`;
    const issuedResponse = await fetch(`${appUrl}/api/v1/admin/licenses`, {
      method: 'POST',
      headers: { Origin: appUrl, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: 'Phase 5 Smoke Product', productSlug, plan: 'pro', type: 'single_device',
        userEmail: 'customer@example.test', userName: 'Phase 5 Test', maxDevices: 1, durationDays: 365,
        features: ['smoke'], price: 0, billingCycle: 'annual', autoRenew: false, notes: 'Disposable integration fixture',
      }),
    });
    assert.equal(issuedResponse.status, 201);
    const issued = await issuedResponse.json() as {
      license: { id: string; key: string };
      keyRevealOnce: boolean;
      emailDelivery: { id: string; status: string; retryable: boolean };
    };
    assert.equal(issued.keyRevealOnce, true);
    assert.match(issued.license.key, /^[A-Z0-9]+(?:-[A-Z0-9]{4}){4}$/);
    assert.equal(issued.emailDelivery.status, 'failed');
    assert.equal(issued.emailDelivery.retryable, true);

    const retryResponse = await fetch(`${appUrl}/api/v1/admin/email-deliveries/${issued.emailDelivery.id}/retry`, {
      method: 'POST', headers: { Origin: appUrl, Cookie: cookie },
    });
    assert.equal(retryResponse.status, 200);
    assert.equal((await retryResponse.json()).delivery.status, 'accepted');

    const keyHash = createHash('sha256').update(issued.license.key.trim().toUpperCase(), 'utf8').digest();
    const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await database.connect();
    try {
      const licenseStored = await database.query<{ key_hash: Buffer }>('SELECT key_hash FROM licenses WHERE id = $1', [issued.license.id]);
      assert.equal(licenseStored.rows[0].key_hash.equals(keyHash), true);
      const outboxStored = await database.query<{ payload_ciphertext: Buffer }>('SELECT payload_ciphertext FROM email_outbox WHERE id = $1', [issued.emailDelivery.id]);
      assert.equal(outboxStored.rows[0].payload_ciphertext.includes(Buffer.from(issued.license.key)), false);
    } finally { await database.end(); }

    const licenseRequest = (fingerprint: string, route: string) => fetch(`${appUrl}/api/v1/license/${route}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: issued.license.key, productSlug, fingerprint, deviceName: 'Test Device',
        platform: 'macOS', clientVersion: '1.0.0',
      }),
    });
    assert.equal((await licenseRequest('device-validation', 'validate')).status, 200);
    const concurrentActivations = await Promise.all([
      licenseRequest('device-one', 'activate-device'),
      licenseRequest('device-two', 'activate-device'),
    ]);
    assert.deepEqual(concurrentActivations.map(response => response.status).sort(), [200, 409]);
    const winningIndex = concurrentActivations[0].status === 200 ? 0 : 1;
    const winnerFingerprint = winningIndex === 0 ? 'device-one' : 'device-two';
    const waitingFingerprint = winningIndex === 0 ? 'device-two' : 'device-one';
    assert.equal((await licenseRequest(winnerFingerprint, 'deactivate')).status, 200);
    assert.equal((await licenseRequest(waitingFingerprint, 'activate-device')).status, 200);

    const expireLicense = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await expireLicense.connect();
    try {
      await expireLicense.query("UPDATE licenses SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 day' WHERE id = $1", [issued.license.id]);
    } finally { await expireLicense.end(); }
    const expiredValidation = await licenseRequest(waitingFingerprint, 'validate');
    assert.equal(expiredValidation.status, 403);
    assert.equal((await expiredValidation.json()).error_code, 'LICENSE_EXPIRED');
    const expiredList = await fetch(`${appUrl}/api/v1/admin/licenses?status=expired&search=${encodeURIComponent('customer@example.test')}`, {
      headers: { Cookie: cookie },
    });
    assert.equal(expiredList.status, 200);
    assert.equal((await expiredList.json()).licenses.some((license: { id: string }) => license.id === issued.license.id), true);

    const renewResponse = await fetch(`${appUrl}/api/v1/admin/licenses/${issued.license.id}/renew`, {
      method: 'POST', headers: { Origin: appUrl, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ months: 1 }),
    });
    assert.equal(renewResponse.status, 200);
    const renewed = await renewResponse.json() as { status: string; expiresAt: string };
    assert.equal(renewed.status, 'active');
    assert.ok(Date.parse(renewed.expiresAt) > Date.now());
    assert.equal((await licenseRequest(waitingFingerprint, 'validate')).status, 200);

    const revoke = await fetch(`${appUrl}/api/v1/admin/licenses/${issued.license.id}/status`, {
      method: 'PATCH',
      headers: { Origin: appUrl, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'revoked', reason: 'Integration test cleanup' }),
    });
    assert.equal(revoke.status, 200);
    assert.equal((await licenseRequest(waitingFingerprint, 'validate')).status, 403);

    const logout = await fetch(`${appUrl}/api/auth/logout`, {
      method: 'POST', headers: { Origin: appUrl, Cookie: cookie },
    });
    assert.equal(logout.status, 204);

    const copiedSessionAfterLogout = await fetch(`${appUrl}/api/auth/session`, { headers: { Cookie: cookie } });
    assert.equal(copiedSessionAfterLogout.status, 401);
    const adminAfterLogout = await fetch(`${appUrl}/api/v1/admin/session`, { headers: { Cookie: cookie } });
    assert.equal(adminAfterLogout.status, 401);

    const databaseSessionAudit = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await databaseSessionAudit.connect();
    try {
      const stored = await databaseSessionAudit.query<{ session_id_hash: Buffer; revoked_at: Date | null }>(
        'SELECT session_id_hash, revoked_at FROM admin_sessions WHERE session_id_hash = $1',
        [createHash('sha256').update(sessionId, 'utf8').digest()],
      );
      assert.equal(stored.rows.length, 1);
      assert.equal(stored.rows[0].session_id_hash.length, 32);
      assert.ok(stored.rows[0].revoked_at);
    } finally { await databaseSessionAudit.end(); }
  });
});
