/**
 * Pruebas HTTP con SQLite temporal y plataforma LTI simulada.
 * Usan los puertos locales 3012/3013 y claves RSA creadas para cada ejecución.
 * No contactan Canvas real, no necesitan secretos y limpian sus datos al salir.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
const base = 'http://127.0.0.1:3012';
const platform = 'http://127.0.0.1:3013';
test('HTTP API, persistence and signed LTI launch', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'shift-test-'));
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const key = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const keys = createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ keys: [key] }));
  });
  await new Promise<void>((r) => keys.listen(3013, '127.0.0.1', r));
  const server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    env: {
      ...process.env,
      PORT: '3012',
      DB_PATH: join(dir, 'test.sqlite'),
      APP_ORIGIN: base,
      LTI_ISSUER: platform,
      LTI_CLIENT_ID: 'test-client',
      LTI_DEPLOYMENT_ID: 'test-deployment',
      LTI_AUTH_URL: platform + '/authorize',
      LTI_JWKS_URL: platform + '/jwks',
    },
    stdio: 'pipe',
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('server timeout')), 10000);
      server.stdout.on('data', (d) => {
        if (d.toString().includes('Shift API')) {
          clearTimeout(timer);
          resolve();
        }
      });
      server.once('exit', () => {
        clearTimeout(timer);
        reject(Error('server exited'));
      });
    });
    const request = (path: string, init: RequestInit = {}) => fetch(base + path, init);
    let cookie = '',
      csrf = '';
    const api = async (path: string, body: unknown = {}) =>
      request(path, {
        method: 'POST',
        headers: { cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify(body),
      });
    await t.test('authentication and CSRF enforced', async () => {
      assert.equal((await request('/api/state')).status, 401);
      const demo = await request('/api/demo', { method: 'POST' });
      cookie = demo.headers.getSetCookie()[0].split(';')[0];
      const state = await (await request('/api/state', { headers: { cookie } })).json();
      csrf = state.csrf;
      assert.equal(state.progress.xp, 1450);
      assert.equal(
        (await request('/api/freeze', { method: 'POST', headers: { cookie } })).status,
        403,
      );
    });
    await t.test('completion is durable, idempotent and prerequisite protected', async () => {
      assert.equal((await api('/api/lessons/procesos-8/complete', { answer: 1 })).status, 400);
      assert.equal((await api('/api/lessons/procesos-7/complete', { answer: 1 })).status, 200);
      assert.equal((await api('/api/lessons/procesos-7/complete', { answer: 1 })).status, 200);
      const state = await (await request('/api/state', { headers: { cookie } })).json();
      assert.equal(state.progress.xp, 1530);
      assert.ok(state.progress.completed.includes('procesos-7'));
    });
    await t.test('redemption and week protection persist', async () => {
      assert.equal((await api('/api/rewards/freeze')).status, 200);
      assert.equal((await api('/api/freeze')).status, 200);
      assert.equal((await api('/api/freeze')).status, 400);
      const state = await (await request('/api/state', { headers: { cookie } })).json();
      assert.equal(state.progress.xp, 1280);
      assert.equal(state.progress.freezes, 1);
      assert.equal(state.progress.protectedWeeks.length, 1);
    });
    await t.test('helpful votes are idempotent and do not reward the voter', async () => {
      assert.equal((await api('/api/answers/a1/helpful')).status, 200);
      assert.equal((await api('/api/answers/a1/helpful')).status, 200);
      const state = await (await request('/api/state', { headers: { cookie } })).json();
      const a = state.threads.flatMap((x: any) => x.answers).find((x: any) => x.id === 'a1');
      assert.equal(a.helpful, 1);
      assert.equal(state.progress.xp, 1280);
    });
    await t.test('profile rejects script URLs and NPS enforces valid scale', async () => {
      assert.equal(
        (
          await api('/api/profile', {
            name: 'Prueba',
            role: '',
            industry: '',
            goal: '',
            skills: '',
            portfolio: 'javascript:alert(1)',
          })
        ).status,
        400,
      );
      assert.equal((await api('/api/nps', { score: 11 })).status, 400);
      assert.equal((await api('/api/nps', { score: 9 })).status, 200);
    });
    const ltiClaim = 'https://purl.imsglobal.org/spec/lti/claim/';
    async function login() {
      const r = await request(
        '/lti/login?' +
          new URLSearchParams({ iss: platform, client_id: 'test-client', login_hint: 'student1' }),
        { redirect: 'manual' },
      );
      assert.equal(r.status, 302);
      const url = new URL(r.headers.get('location')!);
      return {
        state: url.searchParams.get('state')!,
        nonce: url.searchParams.get('nonce')!,
        cookie: r.headers.getSetCookie()[0].split(';')[0],
      };
    }
    async function signed(nonce: string, overrides: Record<string, unknown> = {}) {
      return new SignJWT({
        nonce,
        [ltiClaim + 'deployment_id']: 'test-deployment',
        [ltiClaim + 'version']: '1.3.0',
        [ltiClaim + 'message_type']: 'LtiResourceLinkRequest',
        [ltiClaim + 'target_link_uri']: base + '/lti/launch',
        [ltiClaim + 'context']: { id: 'course1' },
        [ltiClaim + 'resource_link']: { id: 'resource1' },
        ...overrides,
      })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer(platform)
        .setAudience('test-client')
        .setSubject('student1')
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(privateKey);
    }
    async function launch(s: Awaited<ReturnType<typeof login>>, jwt: string, c = s.cookie) {
      return request('/lti/launch', {
        method: 'POST',
        headers: { cookie: c, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ state: s.state, id_token: jwt }),
        redirect: 'manual',
      });
    }
    await t.test(
      'trusted signed launch yields a clean learner profile and rejects replay',
      async () => {
        const s = await login();
        const jwt = await signed(s.nonce);
        const r = await launch(s, jwt);
        assert.equal(r.status, 302);
        const sessionCookie = r.headers
          .getSetCookie()
          .find((x) => x.startsWith('shift_session='))!
          .split(';')[0];
        const state = await (
          await request('/api/state', { headers: { cookie: sessionCookie } })
        ).json();
        assert.equal(state.mode, 'lti');
        assert.equal(state.progress.xp, 0);
        assert.equal(state.threads.length, 0);
        assert.equal((await launch(s, jwt)).status, 401);
      },
    );
    await t.test(
      'launch rejects wrong nonce, deployment, missing browser binding and untrusted issuer',
      async () => {
        for (const override of [{ nonce: 'wrong' }, { [ltiClaim + 'deployment_id']: 'other' }]) {
          const s = await login();
          assert.equal((await launch(s, await signed(s.nonce, override))).status, 401);
        }
        const s = await login();
        assert.equal((await launch(s, await signed(s.nonce), '')).status, 401);
        assert.equal(
          (await request('/lti/login?iss=https://evil.example&login_hint=x')).status,
          400,
        );
      },
    );
  } finally {
    server.kill('SIGTERM');
    await new Promise<void>((r) => server.once('exit', () => r()));
    await new Promise<void>((r) => keys.close(() => r()));
    rmSync(dir, { recursive: true, force: true });
  }
});
