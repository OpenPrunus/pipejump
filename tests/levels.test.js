import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, botInput, parseLevel, ROWS, TILE, SOLID } from '../web/js/engine.js';
import { LEVELS } from '../web/js/levels.js';

test('quatre niveaux bien formés : 14 lignes, même largeur, un départ, un drapeau, une fin posée sur le sol', () => {
  assert.equal(LEVELS.length, 4);
  for (const lv of LEVELS) {
    assert.equal(lv.rows.length, ROWS, `niveau ${lv.id}`);
    const w = lv.rows[0].length;
    assert.ok(lv.rows.every((r) => r.length === w), 'largeur');
    assert.ok(/^[.#HB?MUlrogkSF]+$/.test(lv.rows.join('')), 'caractères inconnus');
    const d = parseLevel(lv);
    assert.ok(d.flag, 'drapeau');
    assert.ok(d.cols >= 100, 'assez long');
    assert.ok(d.enemies.length >= 5);
    assert.ok(d.coins >= 10);
    assert.ok(lv.rows.join('').split('S').length === 2, 'un seul départ');
    assert.ok(lv.name.fr && lv.name.en && lv.hint.fr && lv.hint.en);
    assert.ok(['day', 'cave', 'dusk', 'snow'].includes(lv.theme));
  }
});

test('les ennemis sont posés sur du sol, rien ne bloque le dessus des tuyaux', () => {
  for (const lv of LEVELS) {
    const d = parseLevel(lv);
    for (const e of d.enemies) {
      const c = Math.floor((e.x + 6) / TILE);
      const r = Math.floor(e.bottom / TILE);
      assert.ok(SOLID.has(d.grid[r]?.[c] ?? '.'), `niveau ${lv.id} : ennemi en l'air à la colonne ${c}`);
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < d.cols; c++) {
        if (d.grid[r][c] !== 'l' || (d.grid[r - 1]?.[c] ?? '.') === 'l') continue;
        for (const dr of [1, 2]) for (const dc of [0, 1]) assert.ok(!SOLID.has(d.grid[r - dr]?.[c + dc] ?? '.'), `niveau ${lv.id} : un bloc gêne le tuyau de la colonne ${c}`);
      }
    }
  }
});

test('aucun trou n\'est plus large que ce qu\'un saut avec élan peut franchir', () => {
  for (const lv of LEVELS) {
    const d = parseLevel(lv);
    let run = 0;
    for (let c = 0; c < d.cols; c++) {
      const hole = !SOLID.has(d.grid[12][c]);
      run = hole ? run + 1 : 0;
      assert.ok(run <= 4, `niveau ${lv.id} : trou de ${run} tuiles`);
    }
  }
});

test('un joueur automatique termine chaque niveau (sans ennemis : le relief seul est franchissable)', () => {
  for (const lv of LEVELS) {
    const g = new Game(lv, { lives: 1 });
    g.ents = [];
    let n = 0;
    while (!g.over && n < 12000) { g.step(botInput(g)); n++; g.events.length = 0; }
    assert.ok(g.won, `niveau ${lv.id} non terminé (x = ${Math.round(g.player.x)} / ${g.width}, vies ${g.lives})`);
    assert.equal(g.deaths, 0, `niveau ${lv.id} : le relief ne doit pas tuer`);
  }
});

test('le 1er niveau se termine aussi avec ses ennemis, sans une seule mort', () => {
  const g = new Game(LEVELS[0], { lives: 1 });
  let n = 0;
  while (!g.over && n < 12000) { g.step(botInput(g)); n++; g.events.length = 0; }
  assert.ok(g.won, `x = ${Math.round(g.player.x)}`);
  assert.equal(g.deaths, 0);
  assert.ok(g.score > 2000);
});
