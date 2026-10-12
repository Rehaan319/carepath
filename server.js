const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const root = __dirname;

function loadEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const equalsIdx = trimmed.indexOf('=');
      if (equalsIdx <= 0) return;
      const key = trimmed.slice(0, equalsIdx).trim();
      let value = trimmed.slice(equalsIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
  } catch (err) {
    console.error('Notice: Could not load .env file:', err.message);
  }
}
loadEnv();

const port = Number(process.env.PORT) || 3000;
const apiKey = (process.env.OPENAI_API_KEY || '').trim();
const isGroq = apiKey.startsWith('gsk_');
const defaultBaseUrl = isGroq ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1';
const defaultModel = isGroq ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';
const baseUrl = (process.env.OPENAI_BASE_URL || defaultBaseUrl).replace(/\/+$/, '');
let model = process.env.OPENAI_MODEL || defaultModel;
if (isGroq && (model.startsWith('gpt-') || model.includes('70b'))) {
  model = 'llama-3.1-8b-instant';
}
const accountFile = path.join(root, '.carepath-data', 'accounts.json');
const rateLimits = new Map();
const authLimits = new Map();
const revokedSessions = new Set();
const scrypt = promisify(crypto.scrypt);
let accountsCache;
let accountWriteQueue = Promise.resolve();

function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const secretPath = path.join(root, '.carepath-data', 'session.secret');
  try {
    if (fs.existsSync(secretPath)) {
      return fs.readFileSync(secretPath, 'utf8').trim();
    }
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, secret, { mode: 0o600 });
    return secret;
  } catch {
    return 'carepath-secret-salt-' + root;
  }
}
const sessionSecret = getSessionSecret();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

function sendJson(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(data));
}

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return request.socket.remoteAddress || 'unknown';
}

function isConnectionSecure(request) {
  if (process.env.NODE_ENV === 'production') return true;
  const forwardedProto = request.headers['x-forwarded-proto'];
  return forwardedProto === 'https';
}

function allowRequest(request) {
  const now = Date.now();
  const address = getClientIp(request);
  const entry = rateLimits.get(address);
  if (!entry || now - entry.startedAt > 60_000) {
    rateLimits.set(address, { startedAt: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= 25;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 24_000) {
        reject(Object.assign(new Error('Request too large'), { status: 413 }));
        request.resume();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    request.on('error', reject);
  });
}

async function loadAccounts() {
  if (accountsCache) return accountsCache;
  try {
    const content = await fs.promises.readFile(accountFile, 'utf8');
    const parsed = JSON.parse(content);
    accountsCache = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    accountsCache = [];
  }
  return accountsCache;
}

async function saveAccounts(accounts) {
  await fs.promises.mkdir(path.dirname(accountFile), { recursive: true });
  const temporaryFile = `${accountFile}.${crypto.randomUUID()}.tmp`;
  await fs.promises.writeFile(temporaryFile, JSON.stringify(accounts), { mode: 0o600 });
  await fs.promises.rename(temporaryFile, accountFile);
}

function allowAuthRequest(request) {
  const now = Date.now();
  const address = getClientIp(request);
  const entry = authLimits.get(address);
  if (!entry || now - entry.startedAt > 60_000) {
    authLimits.set(address, { startedAt: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= 15;
}

function publicAccount(account) {
  return { name: account.name, email: account.email };
}

function signSessionToken(accountId, expiresAt) {
  const payload = Buffer.from(JSON.stringify({ id: accountId, exp: expiresAt })).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadBase64, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', sessionSecret).update(payloadBase64).digest('base64url');
  if (signature.length !== expectedSignature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (!payload || !payload.id || !payload.exp || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function setSession(request, response, account) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const token = signSessionToken(account.id, expiresAt);
  const secure = isConnectionSecure(request) ? '; Secure' : '';
  response.setHeader('Set-Cookie', `carepath_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure}`);
  sendJson(response, 200, { user: publicAccount(account) });
}

async function sessionAccount(request) {
  const cookie = request.headers.cookie || '';
  const token = cookie.split(';').map(part => part.trim()).find(part => part.startsWith('carepath_session='))?.slice('carepath_session='.length);
  if (!token || revokedSessions.has(token)) return null;
  const session = verifySessionToken(token);
  if (!session) return null;
  return (await loadAccounts()).find(account => account.id === session.id) || null;
}

async function createAccount(name, email, password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
  const account = { id: crypto.randomUUID(), name, email, salt, passwordHash, createdAt: Date.now() };
  const operation = accountWriteQueue.then(async () => {
    const accounts = await loadAccounts();
    if (accounts.some(item => item.email === email)) {
      throw Object.assign(new Error('An account with this email already exists.'), { status: 409 });
    }
    const nextAccounts = [...accounts, account];
    await saveAccounts(nextAccounts);
    accountsCache = nextAccounts;
    return account;
  });
  accountWriteQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

async function handleAuth(request, response, pathname) {
  if (pathname === '/api/auth/me' && request.method === 'GET') {
    const account = await sessionAccount(request);
    return sendJson(response, 200, { user: account ? publicAccount(account) : null });
  }
  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    const token = (request.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('carepath_session='))?.slice('carepath_session='.length);
    if (token) revokedSessions.add(token);
    response.setHeader('Set-Cookie', 'carepath_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return sendJson(response, 200, { user: null });
  }
  if (!['/api/auth/signup', '/api/auth/login'].includes(pathname) || request.method !== 'POST') {
    response.writeHead(405, { Allow: 'GET, POST' });
    return response.end('Method not allowed');
  }
  if (!allowAuthRequest(request)) return sendJson(response, 429, { error: 'Too many account attempts. Please try again shortly.' });

  const body = await readJson(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return sendJson(response, 400, { error: 'Enter a valid email and password.' });
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length > 128) {
    return sendJson(response, 400, { error: 'Enter a valid email and password.' });
  }

  try {
    if (pathname === '/api/auth/signup') {
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
      if (name.length < 2) return sendJson(response, 400, { error: 'Enter your name (at least 2 characters).' });
      if (password.length < 12) return sendJson(response, 400, { error: 'Use a password with at least 12 characters.' });
      const account = await createAccount(name, email, password);
      return setSession(request, response, account);
    }

    const accounts = await loadAccounts();
    const account = accounts.find(item => item.email === email);
    const salt = account?.salt || 'carepath-invalid-account-salt';
    const attemptedHash = await scrypt(password, salt, 64);
    const expectedHash = account ? Buffer.from(account.passwordHash, 'hex') : Buffer.alloc(64);
    if (!account || !crypto.timingSafeEqual(attemptedHash, expectedHash)) {
      return sendJson(response, 401, { error: 'Email or password is incorrect.' });
    }
    return setSession(request, response, account);
  } catch (error) {
    return sendJson(response, error.status || 500, { error: error.status ? error.message : 'Account could not be saved. Please try again.' });
  }
}

async function handleChat(request, response) {
  if (!allowRequest(request)) return sendJson(response, 429, { error: 'Too many requests. Please try again shortly.' });
  if (!apiKey) return sendJson(response, 503, { error: 'AI provider is not configured.' });

  const body = await readJson(request);
  if (!body || typeof body.message !== 'string' || !body.message.trim() || body.message.length > 1200) {
    return sendJson(response, 400, { error: 'Please provide a message of up to 1200 characters.' });
  }

  const history = Array.isArray(body.history) ? body.history.slice(-10).filter(item =>
    item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string'
  ).map(item => ({ role: item.role, content: item.content.slice(0, 2000) })) : [];
  const profile = body.profile && typeof body.profile === 'object' ? body.profile : {};
  const profileDetails = [
    typeof profile.age === 'string' && profile.age ? `Age range: ${profile.age.slice(0, 30)}.` : '',
    typeof profile.context === 'string' && profile.context.trim() ? `User-shared health context: ${profile.context.slice(0, 300)}` : ''
  ].filter(Boolean).join('\n');
  const userMessage = profileDetails ? `${body.message.trim()}\n\nOptional context the user chose to share:\n${profileDetails}` : body.message.trim();

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are Carepath, a cautious health-information assistant. Provide general educational information only; do not diagnose, claim certainty, or tell users to start, stop, or change prescription medicines. Ask concise follow-up questions when important context is missing. Clearly recommend a qualified clinician for personalized care. For possible emergencies, tell the user to contact local emergency services now. Be empathetic, concise, and transparent about uncertainty.'
        },
        ...history,
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 700
    })
  });

  if (!upstream.ok) {
    let errorDetail = '';
    try {
      const errJson = await upstream.json();
      errorDetail = errJson?.error?.message || '';
    } catch {}
    const msg = errorDetail ? `AI service error: ${errorDetail}` : 'The AI service could not respond. Local guidance is available.';
    return sendJson(response, 502, { error: msg });
  }
  const result = await upstream.json();
  const reply = result.choices?.[0]?.message?.content;
  if (typeof reply !== 'string' || !reply.trim()) return sendJson(response, 502, { error: 'The AI service returned an empty response.' });
  sendJson(response, 200, { reply: reply.trim() });
}

const server = http.createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');

  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/api/status' && request.method === 'GET') {
    const providerName = apiKey ? (baseUrl.includes('groq.com') ? 'Groq' : (baseUrl.includes('openai.com') ? 'OpenAI' : 'Compatible')) : null;
    return sendJson(response, 200, {
      configured: Boolean(apiKey),
      model: apiKey ? model : null,
      provider: providerName
    });
  }
  if (pathname.startsWith('/api/auth/')) {
    try {
      return await handleAuth(request, response, pathname);
    } catch {
      if (!response.headersSent) sendJson(response, 500, { error: 'Account service is temporarily unavailable.' });
      return;
    }
  }
  if (pathname === '/api/chat' && request.method === 'POST') {
    try {
      return await handleChat(request, response);
    } catch (error) {
      if (!response.headersSent) sendJson(response, error.status || 502, { error: error.status ? error.message : 'The AI service is temporarily unavailable.' });
      return;
    }
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD, POST' });
    return response.end('Method not allowed');
  }
  const filename = pathname === '/' ? 'index.html' : path.basename(pathname);
  if (!['index.html', 'styles.css', 'app.js'].includes(filename)) {
    response.writeHead(404);
  } else {
    const filePath = path.join(root, filename);
    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(404);
        return response.end('Not found');
      }
      response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] });
      response.end(request.method === 'HEAD' ? undefined : content);
    });
    return;
  }
  response.end('Not found');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Carepath is running at http://localhost:${port}`);
  console.log(apiKey ? `AI provider active (${model} via ${baseUrl}).` : 'AI is not configured; local guidance is active.');
});