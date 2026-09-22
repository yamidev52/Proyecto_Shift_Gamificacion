/**
 * API Express, persistencia SQLite y punto de entrada LTI 1.3.
 * Orden importante: parsers → cabeceras → rutas públicas → autenticación de API
 * → acciones protegidas → lanzamiento LTI → archivos estáticos → errores.
 * Nunca exponer las claves .env ni usar datos del cliente como saldo autorizado.
 * Ver docs/ARQUITECTURA.md, docs/API.md y docs/CANVAS.md antes de ampliar rutas.
 */
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import { courses, people, initialThreads, type Progress } from '../shared/catalog';
import {
  createProgress,
  weekKey,
  canAccess,
  complete,
  redeem,
  freeze,
  lessonById,
  settleWeeks,
  claimRescue,
} from './domain';
// Configuración del proceso: nunca obtener URLs LTI confiables del token recibido.
const app = express();
const port = Number(process.env.PORT || 3001);
const production = process.env.NODE_ENV === 'production';
const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
const dbPath = process.env.DB_PATH || 'data/shift.sqlite';
// SQLite vive fuera de Git. Las migraciones futuras deben preservar IDs y saldos.
mkdirSync(resolve(dbPath, '..'), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,csrf TEXT NOT NULL,expires INTEGER NOT NULL,mode TEXT NOT NULL,cohort TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS threads(id TEXT PRIMARY KEY,cohort TEXT NOT NULL,author TEXT NOT NULL,channel TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS answers(id TEXT PRIMARY KEY,thread_id TEXT NOT NULL,author TEXT NOT NULL,body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS votes(answer_id TEXT NOT NULL,user_id TEXT NOT NULL,PRIMARY KEY(answer_id,user_id));
CREATE TABLE IF NOT EXISTS chat_messages(id TEXT PRIMARY KEY, cohort TEXT NOT NULL, course_id TEXT NOT NULL, author TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,user_id TEXT,type TEXT,payload TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS oidc(state TEXT PRIMARY KEY,nonce TEXT NOT NULL,browser TEXT NOT NULL,expires INTEGER NOT NULL);
`);
// Fixtures públicos de demostración; nunca importar datos reales aquí.
for (const person of people) {
  db.prepare('INSERT OR IGNORE INTO users VALUES (?,?)').run(
    person.id,
    JSON.stringify({
      ...createProgress(false, person.name),
      profile: {
        name: person.name,
        role: person.role,
        industry: person.industry,
        goal: person.goal,
        skills: person.skills.join(', '),
        portfolio: '',
      },
    }),
  );
}
for (const t of initialThreads) {
  db.prepare('INSERT OR IGNORE INTO threads VALUES (?,?,?,?,?,?)').run(
    t.id,
    'demo',
    t.author,
    t.channel,
    t.title,
    t.body,
  );
  for (const a of t.answers)
    db.prepare('INSERT OR IGNORE INTO answers VALUES (?,?,?,?)').run(a.id, t.id, a.author, a.body);
}
const initialChats = [
  // 1. Modelación de procesos
  { id: 'chat-1', course: 'procesos', author: 'ana', text: '¡Hola a todos! ¿Alguien ya revisó el caso práctico de BPMN?', minsAgo: 60 },
  { id: 'chat-2', course: 'procesos', author: 'carlos', text: 'Hola Ana, sí, está bastante claro. Si te atoras con los carriles me avisas 👍', minsAgo: 30 },

  // 2. Estadística y pronósticos
  { id: 'chat-3', course: 'estadistica', author: 'ana', text: 'Buenas noches. ¿Recomiendan hacer los pronósticos en Excel o directamente con código?', minsAgo: 120 },
  { id: 'chat-4', course: 'estadistica', author: 'lucia', text: 'Con Excel es suficiente para las entregas, pero si sabes R o Python te ahorras tiempo en la limpieza.', minsAgo: 45 },

  // 3. Sistemas operativos
  { id: 'chat-5', course: 'sistemas', author: 'carlos', text: 'La parte de memoria virtual y concurrencia se me complicó un poco, ¿alguien para repasar mañana?', minsAgo: 90 },
  { id: 'chat-6', course: 'sistemas', author: 'ana', text: '¡Yo me apunto Carlos! En la noche después del trabajo le damos una repasada.', minsAgo: 20 },

  // 4. Proyectos de tecnología
  { id: 'chat-7', course: 'proyectos', author: 'lucia', text: '¿Quién más está aprovechando el domingo para avanzar el cronograma del proyecto?', minsAgo: 15 },
  { id: 'chat-8', course: 'proyectos', author: 'carlos', text: 'Aquí andamos en las mismas jaja, ¡ánimo con ese entregable!', minsAgo: 5 },
];

for (const c of initialChats) {
  db.prepare('INSERT OR IGNORE INTO chat_messages VALUES (?,?,?,?,?,?)').run(
    c.id, 'demo', c.course, c.author, c.text, Date.now() - (c.minsAgo * 60 * 1000)
  );
}
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '30kb' }));
app.use(cookieParser());
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    `frame-ancestors 'self' ${process.env.CANVAS_ORIGIN || 'https://*.instructure.com'}`,
  );
  next();
});
// Los tokens de sesión se devuelven en cookies; la base conserva únicamente su hash.
const token = () => randomBytes(32).toString('base64url');
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const cookie = {
  httpOnly: true,
  secure: production,
  sameSite: (production ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
  maxAge: 8 * 3600 * 1000,
  partitioned: production,
};
/** Recupera el perfil y liquida semanas vencidas; no persiste por sí misma. */
function readUser(id: string): Progress {
  const row = db.prepare('SELECT data FROM users WHERE id=?').get(id) as
    | { data: string }
    | undefined;
  if (!row) throw Error('Perfil no encontrado.');
  return settleWeeks(JSON.parse(row.data));
}
/** Persistencia interna. Toda mutación económica debe pasar por una transacción. */
function saveUser(id: string, p: Progress) {
  db.prepare('UPDATE users SET data=? WHERE id=?').run(JSON.stringify(p), id);
}
/** Registro de producto; enviar payloads mínimos, sin secretos ni contenido sensible. */
function event(id: string, type: string, payload: unknown) {
  db.prepare('INSERT INTO events(user_id,type,payload) VALUES (?,?,?)').run(
    id,
    type,
    JSON.stringify(payload),
  );
}
/** Crea una sesión de ocho horas y un token CSRF independiente del ID de sesión. */
function session(res: express.Response, id: string, mode: string, cohort: string) {
  const raw = token();
  db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(
    hash(raw),
    id,
    token(),
    Date.now() + 8 * 3600 * 1000,
    mode,
    cohort,
  );
  res.cookie('shift_session', raw, cookie);
}
// Única entrada de demo: debe deshabilitarse al desplegar en una institución.
app.post('/api/demo', (_req, res) => {
  if (production && process.env.ALLOW_DEMO !== 'true') {
    res.status(403).json({ error: 'Abre Shift desde tu curso en Canvas.' });
    return;
  }
  const id = `demo-${token().slice(0, 16)}`;
  db.prepare('INSERT INTO users VALUES (?,?)').run(id, JSON.stringify(createProgress()));
  session(res, id, 'demo', 'demo');
  res.json({ ok: true });
});
app.get('/api/health', (_req, res) => res.json({ ok: true }));
// Todas las rutas /api siguientes exigen sesión; las escrituras también exigen CSRF.
app.use('/api', (req, res, next) => {
  const raw = req.cookies.shift_session;
  const s =
    raw &&
    (db.prepare('SELECT * FROM sessions WHERE id=? AND expires>?').get(hash(raw), Date.now()) as
      | { user_id: string; csrf: string; mode: string; cohort: string }
      | undefined);
  if (!s) {
    res.status(401).json({ error: 'Inicia una sesión para continuar.' });
    return;
  }
  res.locals.session = s;
  if (req.method !== 'GET' && req.headers['x-csrf-token'] !== s.csrf) {
    res.status(403).json({ error: 'La sesión cambió. Recarga la página.' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  next();
});
/**
 * Unidad de trabajo: leer → validar/modificar → guardar → evento → commit.
 * BEGIN IMMEDIATE serializa los cambios de saldo; cualquier error revierte todo.
 * No agregar await dentro de esta transacción síncrona de SQLite.
 */
function mutate(
  res: express.Response,
  fn: (p: Progress) => Progress,
  type: string,
  payload: unknown = {},
) {
  const id = res.locals.session.user_id;
  db.exec('BEGIN IMMEDIATE');
  try {
    const previous = readUser(id);
    const before = JSON.stringify(previous);
    const p = fn(previous);
    saveUser(id, p);
    if (JSON.stringify(p) !== before) event(id, type, payload);
    db.exec('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
// Snapshot de la sesión: perfiles y conversaciones filtrados por cohorte.
app.get('/api/state', (_req, res) => {
  const s = res.locals.session;
  const current = readUser(s.user_id);
  saveUser(s.user_id, current);

  // 👇 Limpieza del chat (se borran los viejos dejando 1 hora de margen)
  const weekStartMs = new Date(weekKey() + 'T12:00:00Z').getTime();
  const cutoff = weekStartMs - 3600 * 1000;
  db.prepare('DELETE FROM chat_messages WHERE cohort=? AND created < ?').run(s.cohort, cutoff);

  // 👇 Lectura de mensajes del chat
  const chatMessages = (
    db
      .prepare('SELECT * FROM chat_messages WHERE cohort=? ORDER BY created ASC')
      .all(s.cohort) as any[]
  ).map((m) => ({
    id: m.id,
    courseId: m.course_id,
    author: m.author,
    authorName: readUser(m.author).profile.name,
    body: m.body,
    created: m.created,
  }));

  const threads = (
    db.prepare('SELECT * FROM threads WHERE cohort=? ORDER BY rowid DESC').all(s.cohort) as Record<
      string,
      string
    >[]
  ).map((t) => ({
    ...t,
    authorName: readUser(t.author).profile.name,
    answers: (
      db.prepare('SELECT * FROM answers WHERE thread_id=? ORDER BY rowid').all(t.id) as Record<
        string,
        string
      >[]
    ).map((a) => ({
      ...a,
      authorName: readUser(a.author).profile.name,
      helpful: (
        db.prepare('SELECT count(*) as n FROM votes WHERE answer_id=?').get(a.id) as { n: number }
      ).n,
      voted: !!db
        .prepare('SELECT 1 FROM votes WHERE answer_id=? AND user_id=?')
        .get(a.id, s.user_id),
    })),
  }));

  res.json({
    userId: s.user_id,
    mode: s.mode,
    progress: readUser(s.user_id),
    week: weekKey(),
    threads,
    chatMessages,
    csrf: s.csrf,
    aiEnabled: !!process.env.AI_SERVICE_URL,
  });
});
// Misiones: el cliente no decide acceso, XP ni cuándo desbloquear la siguiente.
app.post('/api/lessons/:id/start', (req, res) =>
  mutate(
    res,
    (p) => {
      if (!canAccess(p, req.params.id)) throw Error('Completa la misión anterior primero.');
      if (!p.started.includes(req.params.id)) p.started.push(req.params.id);
      return p;
    },
    'lesson_started',
    { id: req.params.id },
  ),
);
app.post('/api/lessons/:id/complete', (req, res) => {
  const { answer } = z.object({ answer: z.number().int().min(0).max(2) }).parse(req.body);
  mutate(res, (p) => complete(p, req.params.id, answer), 'lesson_completed', { id: req.params.id });
});
// Beneficios y metas: no escriben calificaciones ni vencimientos en Canvas.
app.post('/api/rewards/:id', (req, res) =>
  mutate(res, (p) => redeem(p, req.params.id), 'reward_redeemed', { id: req.params.id }),
);
app.post('/api/freeze', (_req, res) => mutate(res, (p) => freeze(p), 'week_protected'));
app.post('/api/rescue', (_req, res) => mutate(res, (p) => claimRescue(p), 'rescue_claimed'));
app.post('/api/goal', (req, res) => {
  const { goal } = z.object({ goal: z.enum(['days', 'minutes']) }).parse(req.body);
  mutate(res, (p) => ({ ...p, goal }), 'goal_changed', { goal });
});

app.post('/api/chat', (req, res) => {
  const { courseId, body } = z.object({ courseId: z.string(), body: z.string().trim().min(1).max(500) }).parse(req.body);
  const s = res.locals.session;
  db.prepare('INSERT INTO chat_messages VALUES (?,?,?,?,?,?)').run(token(), s.cohort, courseId, s.user_id, body, Date.now());
  res.json({ ok: true });
});

app.post('/api/chat/:id/delete', (req, res) => {
  const s = res.locals.session;
  db.prepare('DELETE FROM chat_messages WHERE id=? AND author=?').run(req.params.id, s.user_id);
  res.json({ ok: true });
});

app.post('/api/profile', (req, res) => {
  const profile = z
    .object({
      name: z.string().trim().min(2).max(80),
      role: z.string().trim().max(100),
      industry: z.string().max(80),
      goal: z.string().max(250),
      skills: z.string().max(200),
      portfolio: z.union([z.literal(''), z.string().url().refine((v) => /^https?:\/\//.test(v))]),
      linkedin: z.union([z.literal(''), z.string().url()]),
    })
    .parse(req.body);
  mutate(res, (p) => ({ ...p, profile }), 'profile_updated');
});
app.post('/api/connect/:id', (req, res) =>
  mutate(
    res,
    (p) => {
      if (res.locals.session.mode !== 'demo')
        throw Error('La comunidad real necesita sincronizar el directorio de Canvas.');
      if (!people.some((x) => x.id === req.params.id)) throw Error('Perfil no encontrado.');
      if (!p.connections.includes(req.params.id)) p.connections.push(req.params.id);
      return p;
    },
    'connection_requested',
  ),
);
app.post('/api/threads', (req, res) => {
  const t = z
    .object({
      channel: z.enum(['Procesos de negocio', 'Datos y decisiones', 'Tecnología']),
      title: z.string().trim().min(8).max(150),
      body: z.string().trim().min(15).max(2000),
    })
    .parse(req.body);
  const s = res.locals.session;
  db.prepare('INSERT INTO threads VALUES (?,?,?,?,?,?)').run(
    token(),
    s.cohort,
    s.user_id,
    t.channel,
    t.title,
    t.body,
  );
  event(s.user_id, 'thread_created', {});
  res.json({ ok: true });
});
/** Evita leer o responder hilos pertenecientes a otro curso/cohorte. */
function threadAccess(id: string, cohort: string) {
  if (!db.prepare('SELECT 1 FROM threads WHERE id=? AND cohort=?').get(id, cohort))
    throw Error('Conversación no encontrada.');
}
app.post('/api/threads/:id/reply', (req, res) => {
  threadAccess(req.params.id, res.locals.session.cohort);
  const { body } = z.object({ body: z.string().trim().min(10).max(2000) }).parse(req.body);
  db.prepare('INSERT INTO answers VALUES (?,?,?,?)').run(
    token(),
    req.params.id,
    res.locals.session.user_id,
    body,
  );
  res.json({ ok: true });
});
// La clave primaria (answer_id,user_id) hace idempotente cada voto útil.
app.post('/api/answers/:id/helpful', (req, res) => {
  const a = db.prepare('SELECT * FROM answers WHERE id=?').get(req.params.id) as
    | { author: string; thread_id: string }
    | undefined;
  if (!a) throw Error('Respuesta no encontrada.');
  threadAccess(a.thread_id, res.locals.session.cohort);
  const uid = res.locals.session.user_id;
  if (a.author === uid) throw Error('Tus compañeros pueden valorar tus respuestas.');
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = db.prepare('INSERT OR IGNORE INTO votes VALUES (?,?)').run(req.params.id, uid);
    if (result.changes) {
      const p = readUser(a.author);
      p.xp += 25;
      p.earned += 25;
      saveUser(a.author, p);
    }
    db.exec('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
});
app.post('/api/nps', (req, res) => {
  const { score } = z.object({ score: z.number().int().min(0).max(10) }).parse(req.body);
  mutate(res, (p) => ({ ...p, nps: score }), 'nps_submitted', { score });
});
// Adaptador de IA: únicamente contexto del catálogo accesible, con timeout y sin perfil.
app.post('/api/assistant', async (req, res) => {
  const { lessonId, action } = z
    .object({ lessonId: z.string(), action: z.enum(['analogy', 'quiz']) })
    .parse(req.body);
  const lesson = lessonById(lessonId);
  if (!lesson || !canAccess(readUser(res.locals.session.user_id), lessonId))
    throw Error('Tema no disponible.');
  if (!process.env.AI_SERVICE_URL) {
    res.json({ source: 'guided', text: lesson.analogy });
    return;
  }
  try {
    const r = await fetch(process.env.AI_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.AI_SERVICE_KEY
          ? { Authorization: `Bearer ${process.env.AI_SERVICE_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        action,
        context: { title: lesson.title, bullets: lesson.bullets, example: lesson.example },
        language: 'es',
        audience: 'adultos trabajadores',
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw Error();
    const result = z.object({ text: z.string().min(1).max(6000) }).parse(await r.json());
    res.json({ source: 'ai', text: result.text });
  } catch {
    res
      .status(503)
      .json({ error: 'El asistente no respondió. Puedes continuar con la guía del tema.' });
  }
});
// LTI 1.3: plataforma de confianza fija. Nunca aceptar URLs de claves del lanzamiento.
const claim = 'https://purl.imsglobal.org/spec/lti/claim/';
const ltiReady = () =>
  [
    'LTI_ISSUER',
    'LTI_CLIENT_ID',
    'LTI_DEPLOYMENT_ID',
    'LTI_AUTH_URL',
    'LTI_JWKS_URL',
    'APP_ORIGIN',
  ].every((k) => process.env[k]);
app.all('/lti/login', (req, res) => {
  if (!ltiReady()) {
    res.status(503).send('Canvas aún no está configurado. Consulta docs/CANVAS.md.');
    return;
  }
  const q = { ...req.query, ...req.body };
  if (
    q.iss !== process.env.LTI_ISSUER ||
    (q.client_id && q.client_id !== process.env.LTI_CLIENT_ID) ||
    typeof q.login_hint !== 'string'
  ) {
    res.status(400).send('Plataforma o solicitud no válida.');
    return;
  }
  const state = token(),
    nonce = token(),
    browser = token();
  db.prepare('INSERT INTO oidc VALUES (?,?,?,?)').run(
    state,
    nonce,
    hash(browser),
    Date.now() + 300000,
  );
  res.cookie('shift_oidc', browser, { ...cookie, maxAge: 300000 });
  const url = new URL(process.env.LTI_AUTH_URL!);
  Object.entries({
    scope: 'openid',
    response_type: 'id_token',
    response_mode: 'form_post',
    prompt: 'none',
    client_id: process.env.LTI_CLIENT_ID!,
    redirect_uri: `${origin}/lti/launch`,
    login_hint: q.login_hint,
    state,
    nonce,
    lti_message_hint: typeof q.lti_message_hint === 'string' ? q.lti_message_hint : '',
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  res.redirect(url.toString());
});
// Validar firma y claims antes de crear identidad o sesión. state se consume una vez.
app.post('/lti/launch', async (req, res) => {
  try {
    if (!ltiReady()) throw Error();
    const { state, id_token } = z
      .object({ state: z.string(), id_token: z.string() })
      .parse(req.body);
    const pending = db
      .prepare('SELECT * FROM oidc WHERE state=? AND expires>?')
      .get(state, Date.now()) as { nonce: string; browser: string } | undefined;
    if (!pending || !req.cookies.shift_oidc || pending.browser !== hash(req.cookies.shift_oidc))
      throw Error();
    db.prepare('DELETE FROM oidc WHERE state=?').run(state);
    const jwks = createRemoteJWKSet(new URL(process.env.LTI_JWKS_URL!));
    const { payload } = await jwtVerify(id_token, jwks, {
      issuer: process.env.LTI_ISSUER,
      audience: process.env.LTI_CLIENT_ID,
      algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'sub', 'nonce'],
      maxTokenAge: '10m',
    });
    if (
      payload.nonce !== pending.nonce ||
      payload[claim + 'deployment_id'] !== process.env.LTI_DEPLOYMENT_ID ||
      payload[claim + 'version'] !== '1.3.0' ||
      payload[claim + 'message_type'] !== 'LtiResourceLinkRequest' ||
      payload[claim + 'target_link_uri'] !== `${origin}/lti/launch`
    )
      throw Error();
    if (
      Array.isArray(payload.aud) &&
      payload.aud.length > 1 &&
      payload.azp !== process.env.LTI_CLIENT_ID
    )
      throw Error();
    const context = payload[claim + 'context'] as { id?: string } | undefined;
    const resource = payload[claim + 'resource_link'] as { id?: string } | undefined;
    if (!context?.id || !resource?.id) throw Error();
    const uid = hash(`${payload.iss}|${process.env.LTI_CLIENT_ID}|${payload.sub}`);
    db.prepare('INSERT OR IGNORE INTO users VALUES (?,?)').run(
      uid,
      JSON.stringify(
        createProgress(false, typeof payload.name === 'string' ? payload.name : 'Estudiante MAPS'),
      ),
    );
    session(res, uid, 'lti', hash(`${payload.iss}|${context.id}`));
    res.clearCookie('shift_oidc', cookie);
    res.redirect('/');
  } catch {
    res
      .status(401)
      .send(
        'No se pudo validar el lanzamiento. Vuelve a abrir Shift desde Canvas. Si tu navegador bloquea cookies de terceros, abre la herramienta en una pestaña nueva.',
      );
  }
});
// Producción sirve el resultado de Vite; los secretos y data/ no son archivos públicos.
app.use(express.static(resolve('dist')));
app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).json({
      error:
        err instanceof z.ZodError
          ? 'Revisa los campos del formulario.'
          : err instanceof Error
            ? err.message
            : 'No se pudo realizar la acción.',
    });
  },
);
app.listen(port, '127.0.0.1', () =>
  console.log(`Shift API disponible en http://127.0.0.1:${port}`),
);
