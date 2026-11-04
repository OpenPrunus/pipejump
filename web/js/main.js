// Pipejump — interface : écrans, boucle à 60 pas par seconde, clavier et boutons tactiles (un doigt par bouton).
import { Game, TPS } from './engine.js';
import { LEVELS } from './levels.js';
import { Renderer } from './render.js';
import * as audio from './audio.js';
import * as i18n from './i18n.js';

const { t } = i18n;
const $ = (sel) => document.querySelector(sel);
const SCREENS = ['title', 'levels', 'help', 'game'];

// ---------------------------------------------------------------- progression (gardée dans le navigateur)
const progress = { v: 1, best: {} };                                          // best[id] = { score, stars }
try { Object.assign(progress, JSON.parse(localStorage.getItem('pipejump.progress') ?? '{}')); } catch { /* stockage indisponible */ }
const saveProgress = () => { try { localStorage.setItem('pipejump.progress', JSON.stringify(progress)); } catch { /* ignoré */ } };
const done = (i) => progress.best[LEVELS[i].id] !== undefined;
const unlocked = (i) => i === 0 || done(i - 1);
const firstOpen = () => { for (let i = 0; i < LEVELS.length; i++) if (!done(i)) return i; return LEVELS.length - 1; };

// ---------------------------------------------------------------- état
const app = { idx: 0, game: null, renderer: null, paused: true, acc: 0, last: 0, hold: { left: false, right: false, run: false, jump: false }, resultTimer: null, hintTimer: 0 };
const clearHold = () => { app.hold.left = app.hold.right = app.hold.run = app.hold.jump = false; };

function show(name) {
  for (const id of SCREENS) $(`#${id}`).hidden = id !== name;
}

function refreshLabels() {
  i18n.apply();
  $('#opt-sound').textContent = t(audio.isMuted() ? 'soundOff' : 'soundOn');
  $('#btn-sound').setAttribute('aria-label', t(audio.isMuted() ? 'soundOff' : 'soundOn'));
  $('#btn-sound').classList.toggle('on', audio.isMuted());
  $('#opt-lang').textContent = t('langToggle');
  $('#btn-continue').textContent = Object.keys(progress.best).length > 0 ? t('continue') : t('play');
  buildLevelGrid();
  if (app.game) { setTexts(); updateBar(); }
}

// ---------------------------------------------------------------- niveaux
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

function buildLevelGrid() {
  const grid = $('#level-grid');
  grid.replaceChildren();
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button');
    b.className = `level-card${done(i) ? ' done' : ''}`;
    b.disabled = !unlocked(i);
    const n = document.createElement('b');
    n.textContent = t('level', { n: lv.id });
    const name = document.createElement('span');
    name.textContent = i18n.pick(lv.name);
    const info = document.createElement('small');
    const best = progress.best[lv.id];
    info.textContent = !unlocked(i) ? t('locked') : best ? t('best', { n: best.score }) : '';
    b.append(n, name, info);
    if (best) {
      const st = document.createElement('small');
      st.className = 'stars';
      st.textContent = starText(best.stars);
      b.append(st);
    }
    b.addEventListener('click', () => { audio.unlock(); audio.play('click'); startLevel(i); });
    grid.append(b);
  });
}

function setTexts() {
  const lv = LEVELS[app.idx];
  $('#lvl-name').textContent = `${t('level', { n: lv.id })} · ${i18n.pick(lv.name)}`;
  $('#brief-title').textContent = i18n.pick(lv.name);
  $('#brief-hint').textContent = i18n.pick(lv.hint);
  $('#brief-goal').textContent = t('briefing');
}

function startLevel(i) {
  clearTimeout(app.resultTimer);
  app.resultTimer = null;
  app.idx = i;
  app.game = new Game(LEVELS[i], { lives: 3 });
  app.renderer = new Renderer($('#canvas'), app.game);
  app.paused = true;
  app.acc = 0;
  app.hintTimer = 0;
  clearHold();
  setTexts();
  $('#briefing').hidden = false;
  $('#result').hidden = true;
  $('#pausebox').hidden = true;
  $('#btn-pause').classList.remove('on');
  show('game');
  updateBar();
  app.renderer.draw(0);
}

function begin() {
  $('#briefing').hidden = true;
  app.paused = false;
  audio.unlock();
}

// ---------------------------------------------------------------- barre du haut
function updateBar() {
  const g = app.game;
  $('#st-score').textContent = String(g.score).padStart(6, '0');
  $('#st-coins').textContent = String(g.coins);
  $('#st-time').textContent = String(g.time);
  $('#st-time').classList.toggle('low', g.time <= 100);
  $('#st-lives').textContent = '♥'.repeat(Math.max(0, g.lives));
  $('#st-lives').setAttribute('aria-label', String(g.lives));
  const hint = app.hintTimer > 0 ? t('hurry') : i18n.pick(LEVELS[app.idx].hint);
  if ($('#hint').textContent !== hint) $('#hint').textContent = hint;
}

// ---------------------------------------------------------------- fin de partie
function showResult() {
  const g = app.game;
  const lv = LEVELS[app.idx];
  let record = false;
  if (g.won) {
    const prev = progress.best[lv.id];
    record = !prev || g.score > prev.score;
    progress.best[lv.id] = { score: Math.max(g.score, prev?.score ?? 0), stars: Math.max(g.stars, prev?.stars ?? 0) };
    saveProgress();
    buildLevelGrid();
  }
  $('#res-title').textContent = t(g.won ? 'won' : 'lost');
  $('#res-stars').textContent = g.won ? starText(g.stars) : '';
  const last = app.idx === LEVELS.length - 1;
  $('#res-detail').textContent = [t(g.won ? 'wonDetail' : 'lostDetail', { score: g.score, coins: g.coins }), record && g.won ? t('newBest') : '', g.won && last ? t('finished') : ''].filter(Boolean).join(' ');
  const main = $('#res-main');
  if (g.won && !last) { main.textContent = t('next'); main.dataset.action = 'next'; } else { main.textContent = t('retry'); main.dataset.action = 'restart'; }
  $('#result').hidden = false;
  clearHold();
}

const SOUNDS = { jump: 'jump', coin: 'coin', stomp: 'stomp', kick: 'kick', bump: 'bump', break: 'break', item: 'item', powerup: 'powerup', shrink: 'shrink', die: 'die', life: 'life', flag: 'flag', hurry: 'hurry', win: 'win', over: 'lose' };

function handleEvents() {
  const g = app.game;
  const seen = new Set();
  for (const e of g.events) {
    if (e.type === 'hurry') app.hintTimer = 240;
    const s = e.type === 'jump' && e.big ? 'bigjump' : SOUNDS[e.type];
    if (s && !seen.has(s)) { seen.add(s); audio.play(s); }
  }
  g.events.length = 0;
}

// ---------------------------------------------------------------- boucle
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(100, now - (app.last || now));
  app.last = now;
  const g = app.game;
  if (!g || $('#game').hidden) return;
  if (!app.paused && !g.over) {
    app.acc += dt;
    const stepMs = 1000 / TPS;
    let guard = 0;
    while (app.acc >= stepMs && !g.over && guard++ < 8) {
      g.step(app.hold);
      app.acc -= stepMs;
    }
    if (app.hintTimer > 0) app.hintTimer--;
    handleEvents();
    updateBar();
  }
  if (g.over && $('#result').hidden && !app.resultTimer) app.resultTimer = setTimeout(() => { app.resultTimer = null; showResult(); }, 600);
  app.renderer.draw(now);
}

// ---------------------------------------------------------------- boutons à l'écran (chacun suit son propre doigt)
for (const b of document.querySelectorAll('.hold')) {
  const key = b.dataset.hold;
  const press = (e) => {
    e.preventDefault();
    audio.unlock();
    try { b.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
    b.classList.add('on');
    app.hold[key] = true;
  };
  const release = () => { b.classList.remove('on'); app.hold[key] = false; };
  b.addEventListener('pointerdown', press);
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, release);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ---------------------------------------------------------------- commandes
function togglePause() {
  if (!app.game || !$('#briefing').hidden || app.game.over || $('#game').hidden) return;
  app.paused = !app.paused;
  $('#btn-pause').classList.toggle('on', app.paused);
  $('#pausebox').hidden = !app.paused;
  app.acc = 0;
  clearHold();
}

const ACTIONS = {
  continue: () => startLevel(firstOpen()),
  levels: () => { clearTimeout(app.resultTimer); app.resultTimer = null; app.paused = true; clearHold(); buildLevelGrid(); show('levels'); },
  help: () => show('help'),
  title: () => show('title'),
  begin,
  next: () => startLevel(Math.min(LEVELS.length - 1, app.idx + 1)),
  restart: () => { startLevel(app.idx); begin(); },
  pause: togglePause,
  toggleSound: () => { audio.setMuted(!audio.isMuted()); refreshLabels(); },
  toggleLang: () => { i18n.setLang(i18n.getLang() === 'fr' ? 'en' : 'fr'); refreshLabels(); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  audio.unlock();
  audio.play('click');
  ACTIONS[el.dataset.action]?.();
});

const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', q: 'left', Q: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'jump', ' ': 'jump', w: 'jump', W: 'jump', z: 'jump', Z: 'jump', Shift: 'run', x: 'run', X: 'run' };
document.addEventListener('keydown', (e) => {
  if ($('#game').hidden) return;
  const k = KEYMAP[e.key];
  if (k) {
    e.preventDefault();
    if (!$('#briefing').hidden) { if (k === 'jump') begin(); return; }
    app.hold[k] = true;
    return;
  }
  if (e.key === 'Enter' && !$('#briefing').hidden) { e.preventDefault(); begin(); }
  else if (e.key === 'p' || e.key === 'P') togglePause();
  else if (e.key === 'r' || e.key === 'R') ACTIONS.restart();
  else if (e.key === 'Escape') ACTIONS.levels();
});
document.addEventListener('keyup', (e) => { const k = KEYMAP[e.key]; if (k) app.hold[k] = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden && !app.paused && app.game && !app.game.over) togglePause(); });
window.addEventListener('blur', clearHold);

// ---------------------------------------------------------------- démarrage
i18n.setLang(i18n.detectLang());
refreshLabels();
show('title');
requestAnimationFrame(frame);

// Accès pour les tests de bout en bout dans le navigateur.
window.__pj = { app, progress, LEVELS };
