import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, parseLevel, TILE, ROWS, WALK, RUN, TIME_START, TIME_TICKS, SHELL_SPEED } from '../web/js/engine.js';

/** Petit niveau de test : sol sur les lignes 12-13, `edit(set)` pose le reste. */
function level(edit = () => {}, cols = 40) {
  const g = Array.from({ length: ROWS }, () => Array(cols).fill('.'));
  for (let c = 0; c < cols; c++) { g[12][c] = '#'; g[13][c] = '#'; }
  g[11][2] = 'S';
  edit((c, r, ch) => { g[r][c] = ch; });
  return { id: 99, theme: 'day', rows: g.map((r) => r.join('')) };
}
const mk = (edit, opts) => new Game(level(edit), opts);
const run = (g, n, input = {}) => { for (let i = 0; i < n && !g.over; i++) g.step(input); };
const types = (g) => g.events.map((e) => e.type);

test('un niveau mal formé est refusé ; le départ, les ennemis, le drapeau et les pièces sont lus', () => {
  assert.throws(() => parseLevel({ id: 1, rows: ['....'] }), /lignes/);
  const l = level((s) => { s(10, 11, 'g'); s(12, 11, 'k'); s(20, 11, 'F'); s(5, 9, 'o'); s(6, 9, 'o'); });
  const d = parseLevel(l);
  assert.equal(d.enemies.length, 2);
  assert.deepEqual(d.flag, { c: 20, r: 11 });
  assert.equal(d.coins, 2);
  assert.equal(d.spawn.y, 11 * TILE);
  assert.equal(d.grid[11][10], '.', 'les ennemis ne restent pas dans la grille');
});

test('le joueur se tient sur le sol, marche puis court plus vite, et freine', () => {
  const g = mk();
  run(g, 5);
  assert.ok(g.player.onGround);
  const y0 = g.player.y;
  run(g, 60, { right: true });
  assert.ok(g.player.vx <= WALK + 1e-9 && g.player.vx > WALK - 0.2);
  run(g, 60, { right: true, run: true });
  assert.ok(g.player.vx > WALK + 0.5 && g.player.vx <= RUN + 1e-9);
  run(g, 60, {});
  assert.equal(g.player.vx, 0);
  assert.equal(g.player.y, y0);
});

test('saut : maintenu il monte plus haut que relâché tôt ; hauteur raisonnable', () => {
  const peak = (hold) => {
    const g = mk();
    run(g, 5);
    const y0 = g.player.y;
    let top = y0;
    for (let i = 0; i < 80; i++) { g.step({ jump: i < hold }); top = Math.min(top, g.player.y); }
    return y0 - top;
  };
  const full = peak(60);
  const short = peak(4);
  assert.ok(full > 55 && full < 90, `plein : ${full}`);
  assert.ok(short < full * 0.6, `court : ${short}`);
});

test('un saut demandé juste avant l\'atterrissage part, et quelques pas de grâce après le bord', () => {
  const g = mk();
  run(g, 5);
  g.step({ jump: true });
  g.step({ jump: false });
  while (!g.player.onGround) g.step({ jump: false });
  const g2 = mk();                                                 // tampon : on appuie en l'air, juste avant de toucher le sol
  run(g2, 5);
  g2.step({ jump: true }); g2.step({ jump: false });
  while (g2.player.vy < 3) g2.step({});
  g2.step({ jump: true });
  g2.step({ jump: true });
  while (!g2.player.onGround && g2.player.vy > 0) g2.step({ jump: true });
  run(g2, 3, { jump: true });
  assert.ok(g2.player.vy < 0 || !g2.player.onGround, 'le saut tamponné est parti');
  // grâce : on quitte le bord, puis on saute 3 pas plus tard
  const h = mk((s) => { for (let c = 8; c < 40; c++) { s(c, 12, '.'); s(c, 13, '.'); } });
  run(h, 5);
  while (h.player.onGround) h.step({ right: true });
  const yFall = h.player.y;
  h.step({ right: true, jump: true });
  assert.ok(h.player.vy < 0 && h.player.y < yFall + 1, 'saut de grâce');
});

test('frapper un bloc « ? » par en dessous donne une pièce et le vide', () => {
  const g = mk((s) => s(2, 8, '?'));
  run(g, 5);
  let guard = 0;
  while (g.grid[8][2] === '?' && guard++ < 80) g.step({ jump: true });
  assert.equal(g.grid[8][2], 'U');
  assert.equal(g.coins, 1);
  assert.ok(g.score >= 200);
  assert.ok(g.bumps.length > 0 || types(g).includes('coin'));
});

test('bloc « M » : un champignon sort, le manger fait grandir, un coup fait rapetisser, un 2e coup tue', () => {
  const g = mk((s) => { s(2, 8, 'M'); });
  run(g, 5);
  let guard = 0;
  while (g.grid[8][2] === 'M' && guard++ < 80) g.step({ jump: true });
  assert.equal(g.grid[8][2], 'U');
  const mush = g.ents.find((e) => e.type === 'mush');
  assert.ok(mush, 'un champignon est sorti');
  g.step({}); g.player.x = 0;
  for (let i = 0; i < 200 && !g.player.big; i++) { g.player.x = mush.x - 4; g.player.y = Math.min(g.player.y, mush.y); g.step({}); }
  assert.ok(g.player.big, 'le joueur a grandi');
  assert.equal(g.player.h, 24);
  g.hurt();
  assert.ok(!g.player.big && g.player.invul > 0, 'il rapetisse et devient invulnérable un moment');
  g.player.invul = 0;
  g.hurt();
  assert.equal(g.phase, 'dying');
});

test('brique : petit on la cogne sans la casser, grand on la casse', () => {
  const small = mk((s) => s(2, 8, 'B'));
  run(small, 5);
  for (let i = 0; i < 60; i++) small.step({ jump: true });
  assert.equal(small.grid[8][2], 'B');
  const big = mk((s) => s(2, 8, 'B'));
  run(big, 5);
  big.grow();
  for (let i = 0; i < 60; i++) big.step({ jump: true });
  assert.equal(big.grid[8][2], '.');
  assert.ok(big.particles.length > 0);
});

test('écraser un gloumpf le tue et fait rebondir ; le toucher de côté fait mourir', () => {
  const g = mk((s) => s(8, 11, 'g'));
  run(g, 3);
  const e = g.ents[0];
  e.active = true;
  g.player.x = e.x + 1; g.player.y = e.y - 40; g.player.vy = 3;
  for (let i = 0; i < 20 && !e.dead; i++) g.step({});
  assert.ok(e.dead > 0, 'écrasé');
  assert.ok(g.player.vy < 0, 'rebond');
  assert.ok(g.score >= 100);
  const g2 = mk((s) => s(8, 11, 'g'));
  g2.ents[0].active = true;
  g2.player.x = g2.ents[0].x - 8;
  for (let i = 0; i < 30 && g2.phase === 'play'; i++) g2.step({ right: true });
  assert.equal(g2.phase, 'dying');
  assert.equal(g2.deaths, 1);
});

test('tortue : écrasée elle devient carapace, on la lance, elle renverse un gloumpf puis la tortue immobile ne blesse pas', () => {
  const g = mk((s) => { s(6, 11, 'k'); s(20, 11, 'g'); });
  const k = g.ents.find((e) => e.type === 'koopa');
  const gm = g.ents.find((e) => e.type === 'goomba');
  k.active = true; gm.active = true;
  g.player.x = k.x + 1; g.player.y = k.y - 40; g.player.vy = 3;
  for (let i = 0; i < 20 && k.type === 'koopa'; i++) g.step({});
  assert.equal(k.type, 'shell');
  assert.equal(k.vx, 0);
  g.player.vy = 0; g.player.x = k.x - 11; g.player.y = k.y;                       // on la touche de côté : elle part
  for (let i = 0; i < 12 && k.vx === 0; i++) g.step({ right: true });
  assert.ok(Math.abs(k.vx) >= SHELL_SPEED - 1e-9, 'lancée');
  assert.equal(g.phase, 'play', 'la carapace qu\'on vient de lancer ne blesse pas');
  for (let i = 0; i < 200 && !gm.dead; i++) { g.player.x = 4; g.step({}); }
  assert.ok(gm.dead > 0, 'le gloumpf est renversé par la carapace');
});

test('un trou, le temps écoulé : on perd une vie, le niveau recommence ; plus de vies = fin', () => {
  const g = mk((s) => { for (let c = 6; c < 40; c++) { s(c, 12, '.'); s(c, 13, '.'); } }, { lives: 2 });
  g.step({}); g.score = 500;
  for (let i = 0; i < 400 && g.lives === 2; i++) g.step({ right: true });
  assert.equal(g.lives, 1);
  assert.equal(g.score, 500, 'le score reste');
  assert.equal(g.player.x, g.data.spawn.x, 'retour au départ');
  assert.equal(g.time, TIME_START);
  const t = mk(() => {}, { lives: 3 });
  for (let i = 0; i < TIME_START * TIME_TICKS + 200 && t.lives === 3; i++) t.step({});
  assert.equal(t.lives, 2, 'le temps écoulé fait perdre une vie');
  const o = mk((s) => { for (let c = 6; c < 40; c++) { s(c, 12, '.'); s(c, 13, '.'); } }, { lives: 1 });
  for (let i = 0; i < 400 && !o.over; i++) o.step({ right: true });
  assert.ok(o.over && !o.won);
  assert.ok(types(o).includes('over'));
});

test('pièces : ramassées une fois ; cent pièces donnent une vie', () => {
  const g = mk((s) => { s(4, 11, 'o'); s(5, 11, 'o'); });
  run(g, 60, { right: true });
  assert.equal(g.coins, 2);
  assert.equal(g.grid[11][4], '.');
  const h = mk(() => {});
  h.coins = 99;
  h.data.grid[11][3] = 'o'; h.grid[11][3] = 'o';
  run(h, 30, { right: true });
  assert.equal(h.lives, 4);
});

test('le drapeau termine le niveau : bonus de temps, étoiles', () => {
  const g = mk((s) => { s(12, 11, 'F'); });
  let guard = 0;
  while (!g.over && guard++ < 1500) g.step({ right: true, run: true });
  assert.ok(g.won && g.over);
  assert.ok(g.score >= 400 + (TIME_START - 5) * 10);
  assert.equal(g.stars >= 2, true, 'aucune mort : au moins 2 étoiles');
  assert.ok(types(g).includes('win') || g.phase === 'done');
});

test('le monde est déterministe : mêmes gestes, même partie', () => {
  const play = () => {
    const g = new Game({ id: 1, theme: 'day', rows: level((s) => { s(10, 11, 'g'); s(15, 8, '?'); }).rows });
    for (let i = 0; i < 600; i++) g.step({ right: i % 200 < 150, jump: i % 50 < 20, run: true });
    return JSON.stringify([g.player.x, g.player.y, g.score, g.ents.map((e) => [e.x, e.y, e.dead])]);
  };
  assert.equal(play(), play());
});

test('le joueur ne peut pas revenir en arrière hors de l\'écran', () => {
  const g = mk(() => {}, {});
  run(g, 120, { right: true, run: true });
  const cam = g.cam;
  run(g, 120, { left: true });
  assert.ok(g.player.x >= cam - 0.01);
});
