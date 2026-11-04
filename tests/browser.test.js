// Navigateur : un vrai Chrome (headless) piloté par DevTools, sans dépendance. Le site est statique : un petit serveur Node le sert.
//   npm run test:browser          (CHROME_BIN réglable ; SHOTS=/dossier enregistre des captures d'écran)
import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  s.on('error', reject);
});
async function waitFor(fn, ms, what) {
  const t0 = Date.now();
  let last;
  for (;;) {
    try { last = await fn(); if (last) return last; } catch (e) { last = `erreur : ${e.message}`; }
    if (Date.now() - t0 > ms) throw new Error(`délai dépassé : ${what} (dernière valeur : ${JSON.stringify(last)})`);
    await sleep(50);
  }
}

let BASE, server, chrome, tmpDir, cdp, nextId = 0;
const pending = new Map();
const errors = [];

before(async () => {
  server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] ?? 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  const port = await freePort();
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  BASE = `http://localhost:${port}`;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pj-chrome-'));
  const dbg = await freePort();
  chrome = spawn(process.env.CHROME_BIN || 'google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
    `--remote-debugging-port=${dbg}`, `--user-data-dir=${tmpDir}`, 'about:blank',
  ], { stdio: 'ignore' });
  const tab = await waitFor(async () => (await (await fetch(`http://127.0.0.1:${dbg}/json`)).json()).find((t) => t.type === 'page'), 15000, 'Chrome');
  cdp = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { cdp.onopen = resolve; cdp.onerror = () => reject(new Error('DevTools')); });
  cdp.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(`${m.params.entry.text} ${m.params.entry.url ?? ''}`);
  };
  await call('Page.enable'); await call('Runtime.enable'); await call('Log.enable');
});
after(() => {
  try { cdp.close(); } catch { /* déjà fermé */ }
  try { chrome?.kill(); } catch { /* déjà arrêté */ }
  server?.close();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignoré */ }
});

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    cdp.send(JSON.stringify({ id, method, params }));
  });
}
async function ev(expr) {
  const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`page : ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  return r.result.value;
}
async function shot(name) {
  if (!process.env.SHOTS) return;
  fs.mkdirSync(process.env.SHOTS, { recursive: true });
  const { data } = await call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(process.env.SHOTS, `${name}.png`), Buffer.from(data, 'base64'));
}
const DESKTOP = { w: 1100, h: 760, touch: false };
const PHONE_PORTRAIT = { w: 390, h: 844, touch: true };
const PHONE_LANDSCAPE = { w: 844, h: 390, touch: true };

async function open(device, lang = 'fr', progress = null) {
  await call('Emulation.setDeviceMetricsOverride', { width: device.w, height: device.h, deviceScaleFactor: 1, mobile: !!device.touch });
  await call('Emulation.setTouchEmulationEnabled', device.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
  await call('Storage.clearDataForOrigin', { origin: new URL(BASE).origin, storageTypes: 'local_storage' });
  await call('Page.navigate', { url: `${BASE}/` });
  await waitFor(() => ev('document.readyState === "complete" && !!window.__pj'), 10000, 'page chargée');
  await ev(`localStorage.setItem('pipejump.lang', ${JSON.stringify(lang)}); ${progress ? `localStorage.setItem('pipejump.progress', ${JSON.stringify(JSON.stringify(progress))});` : ''} location.reload()`);
  await waitFor(() => ev('document.readyState === "complete" && !!window.__pj'), 10000, 'page rechargée');
}
const click = (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).click()`);
const visible = (sel) => ev(`!document.querySelector(${JSON.stringify(sel)}).hidden`);
const text = (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).textContent`);
const state = () => ev('(() => { const a = window.__pj.app; const g = a.game; const p = g.player; return { tick: g.tick, phase: g.phase, x: p.x, y: p.y, vx: p.vx, vy: p.vy, onGround: p.onGround, run: p.input.run, left: p.input.left, right: p.input.right, jump: p.input.jump, paused: a.paused, over: g.over, won: g.won, lives: g.lives, score: g.score, cam: g.cam }; })()');
const key = (k, type = 'keydown') => ev(`document.dispatchEvent(new KeyboardEvent(${JSON.stringify(type)}, { key: ${JSON.stringify(k)} }))`);
const startLevel = async (i = 0) => { await click('[data-action=levels]'); await ev(`document.querySelectorAll('.level-card')[${i}].disabled = false; document.querySelectorAll('.level-card')[${i}].click()`); };
const begin = () => click('[data-action=begin]');
const center = (sel) => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
/** Fait jouer le joueur automatique du moteur, sans attendre le temps réel. */
const autoplay = (n) => ev(`(async () => { const { botInput } = await import('./js/engine.js'); const g = window.__pj.app.game; for (let i = 0; i < ${n} && !g.over; i++) g.step(botInput(g)); g.events.length = 0; return g.tick; })()`);

describe('pages et menus', () => {
  test('le menu et le choix du niveau s\'affichent, sans erreur, en français puis en anglais', async () => {
    errors.length = 0;
    await open(DESKTOP);
    assert.equal(await ev('document.title'), 'Pipejump');
    assert.match(await text('[data-action=continue]'), /Jouer/);
    assert.equal(await ev('document.querySelector("#title a.all").href'), 'https://games.prunus.dev/');
    await shot('title');
    await click('[data-action=levels]');
    assert.equal(await ev('document.querySelectorAll(".level-card").length'), 4);
    assert.equal(await ev('document.querySelectorAll(".level-card:not(:disabled)").length'), 1, 'seul le niveau 1 est ouvert au début');
    await shot('levels');
    await click('[data-action=title]');
    await click('[data-action=help]');
    assert.ok(await visible('#help'));
    await open(DESKTOP, 'en');
    assert.match(await text('[data-action=continue]'), /Play/);
    assert.deepEqual(errors, []);
  });
});

describe('partie', () => {
  test('présentation, départ, le joueur avance et saute au clavier, pause, recommencer', async () => {
    errors.length = 0;
    await open(DESKTOP);
    await startLevel(0);
    assert.ok(await visible('#briefing'));
    assert.equal((await state()).paused, true);
    await shot('briefing');
    await begin();
    assert.equal((await state()).paused, false);
    const x0 = (await state()).x;
    await key('ArrowRight');
    await waitFor(async () => (await state()).x > x0 + 30, 3000, 'le joueur avance');
    await key('Shift');
    await waitFor(async () => (await state()).run === true, 1000, 'Maj = courir');
    await key(' ');
    await waitFor(async () => !(await state()).onGround, 1000, 'Espace = saut');
    await key(' ', 'keyup'); await key('Shift', 'keyup'); await key('ArrowRight', 'keyup');
    await waitFor(async () => (await state()).vx === 0 || Math.abs((await state()).vx) < 0.3, 4000, 'il freine');
    await key('p');
    assert.ok(await visible('#pausebox'));
    const t1 = (await state()).tick;
    await new Promise((r) => setTimeout(r, 300));
    assert.equal((await state()).tick, t1, 'en pause le temps s\'arrête');
    await key('p');
    await waitFor(async () => (await state()).tick > t1, 1000, 'reprise');
    await key('r');
    await waitFor(async () => (await state()).tick < 60 && !(await state()).paused, 2000, 'recommencer');
    assert.deepEqual(errors, []);
  });

  test('un niveau terminé affiche le résultat, garde le score, ouvre le suivant', async () => {
    errors.length = 0;
    await open(DESKTOP);
    await startLevel(0);
    await begin();
    await ev('window.__pj.app.paused = true');
    await autoplay(4000);
    await ev('window.__pj.app.paused = false');
    await waitFor(() => visible('#result'), 6000, 'résultat affiché');
    assert.equal((await state()).won, true);
    assert.match(await text('#res-title'), /terminé/);
    assert.ok((await ev('window.__pj.progress.best["1"].score')) > 1000);
    assert.equal(await text('#res-main'), 'Niveau suivant');
    await shot('result');
    await click('#res-main');
    assert.ok(await visible('#game'));
    assert.match(await text('#lvl-name'), /Niveau 2/);
    assert.deepEqual(errors, []);
  });

  test('plus de vies : écran de fin, « Réessayer » relance le niveau', async () => {
    await open(DESKTOP);
    await startLevel(0);
    await begin();
    await ev('(() => { const g = window.__pj.app.game; g.lives = 1; g.die(); })()');
    await waitFor(() => visible('#result'), 8000, 'écran de fin');
    assert.match(await text('#res-title'), /Plus de vies/);
    assert.equal(await text('#res-main'), 'Réessayer');
    await click('#res-main');
    await waitFor(async () => (await state()).lives === 3, 2000, 'nouvelle partie');
  });
});

describe('téléphone : tout tient à l\'écran et se joue aux doigts', () => {
  for (const [name, device] of [['portrait', PHONE_PORTRAIT], ['paysage', PHONE_LANDSCAPE]]) {
    test(`${name} : jeu et commandes entiers, sans défilement, boutons assez grands`, async () => {
      await open(device);
      await startLevel(1);
      await begin();
      const box = await ev(`(() => {
        const r = (s) => document.querySelector(s).getBoundingClientRect();
        const c = r('#canvas');
        const btns = [...document.querySelectorAll('#pad .hold, #controls .ctl')].map((b) => { const q = b.getBoundingClientRect(); return { w: q.width, h: q.height, l: q.left, r: q.right, t: q.top, b: q.bottom, n: b.dataset.hold || b.dataset.action }; });
        return { cw: c.width, ch: c.height, cb: c.bottom, btns, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight };
      })()`);
      assert.ok(box.cw > device.w * (device.w > device.h ? 0.45 : 0.9), `jeu de ${box.cw}px sur ${device.w}`);
      assert.ok(box.cb <= device.h, 'jeu entier');
      assert.ok(Math.abs(box.cw / box.ch - 8 / 7) < 0.02, 'rapport 8:7 conservé');
      assert.ok(box.sw <= device.w && box.sh <= device.h + 1, `pas de défilement (${box.sw}×${box.sh} sur ${device.w}×${device.h})`);
      for (const b of box.btns) {
        assert.ok(b.w >= 40 && b.h >= 40, `bouton ${b.n} de ${b.w}×${b.h}px`);
        assert.ok(b.l >= 0 && b.r <= device.w && b.b <= device.h, `bouton ${b.n} hors écran`);
      }
      assert.equal(box.btns.filter((b) => ['left', 'right', 'run', 'jump'].includes(b.n)).length, 4);
      await shot(`phone-${name}`);
    });
  }

  test('aux doigts : ▶ avance, A saute, B court, plusieurs doigts à la fois', async () => {
    errors.length = 0;
    await open(PHONE_PORTRAIT);
    await startLevel(0);
    await begin();
    const right = await center('[data-hold=right]');
    const jump = await center('[data-hold=jump]');
    const run = await center('[data-hold=run]');
    const x0 = (await state()).x;
    await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: right.x, y: right.y, id: 1 }] });
    await waitFor(async () => (await state()).x > x0 + 20 && (await state()).right, 3000, 'un doigt sur ▶ avance');
    await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: right.x, y: right.y, id: 1 }, { x: jump.x, y: jump.y, id: 2 }] });
    await waitFor(async () => !(await state()).onGround, 2000, 'deuxième doigt sur A : saut pendant la marche');
    assert.ok((await state()).right, '▶ est toujours tenu');
    await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: jump.x, y: jump.y, id: 2 }] });
    await waitFor(async () => !(await state()).jump, 2000, 'relâcher A');
    assert.ok((await state()).right, '▶ reste tenu quand A est relâché');
    await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: right.x, y: right.y, id: 1 }, { x: run.x, y: run.y, id: 3 }] });
    await waitFor(async () => (await state()).run, 2000, 'B = courir');
    await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await waitFor(async () => { const s = await state(); return !s.right && !s.run && !s.jump; }, 2000, 'tout relâché');
    assert.deepEqual(errors, []);
  });
});

describe('hors ligne (PWA)', () => {
  test('après une première visite, la page se charge sans réseau et un niveau démarre', async () => {
    await open(DESKTOP);
    assert.equal(await ev('navigator.serviceWorker.ready.then(() => true)'), true);
    await call('Page.navigate', { url: `${BASE}/` });
    await waitFor(() => ev('!!window.__pj && !!navigator.serviceWorker.controller'), 10000, 'page contrôlée par le service worker');
    await call('Network.enable');
    await call('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    try {
      await call('Page.navigate', { url: `${BASE}/` });
      await waitFor(() => ev('!!window.__pj'), 8000, 'page chargée hors ligne');
      await startLevel(0);
      await begin();
      await waitFor(async () => (await state()).tick >= 30, 5000, 'le niveau tourne hors ligne');
    } finally {
      await call('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    }
  });
});
