// Pipejump — moteur de plateforme : tuiles de 16 px, 60 pas par seconde, aucune aléa (le même niveau donne toujours la même partie).
// Le moteur ne touche ni au DOM ni au son : l'interface lit `events` à chaque pas.
export const TPS = 60;
export const TILE = 16;
export const VW = 256;                                 // largeur visible (px de jeu)
export const VH = 224;                                 // hauteur visible = 14 tuiles
export const ROWS = 14;
export const SOLID = new Set(['#', 'H', 'B', '?', 'M', 'U', 'l', 'r']);

// physique (px par pas)
export const WALK = 1.5;
export const RUN = 2.4;
export const GRAV = 0.3;
export const GRAV_CUT = 0.85;                          // gravité quand on lâche le saut en montée : saut court
export const JUMP = 6.4;
export const MAXFALL = 6.6;
export const COYOTE = 6;                               // pas de grâce après avoir quitté le bord
export const BUFFER = 7;                               // un saut demandé juste avant l'atterrissage part quand même
export const TIME_START = 300;
export const TIME_TICKS = 40;                          // pas par unité de temps
export const SHELL_SPEED = 3.6;

const SMALL_H = 16;
const BIG_H = 24;
const PW = 12;

/** Lit un niveau (tableau de lignes) : grille, ennemis, point de départ, drapeau. */
export function parseLevel(level) {
  const rows = level.rows;
  if (rows.length !== ROWS) throw new Error(`niveau ${level.id} : ${rows.length} lignes au lieu de ${ROWS}`);
  const cols = rows[0].length;
  const grid = rows.map((r) => {
    if (r.length !== cols) throw new Error(`niveau ${level.id} : lignes de longueurs différentes`);
    return r.split('');
  });
  const enemies = [];
  let spawn = { x: 2 * TILE, y: 11 * TILE };
  let flag = null;
  let coins = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c];
      if (ch === 'g' || ch === 'k') { enemies.push({ type: ch === 'g' ? 'goomba' : 'koopa', x: c * TILE + 2, bottom: (r + 1) * TILE }); grid[r][c] = '.'; }
      else if (ch === 'S') { spawn = { x: c * TILE + 2, y: (r + 1) * TILE - SMALL_H }; grid[r][c] = '.'; }
      else if (ch === 'F') { flag = { c, r }; grid[r][c] = '.'; }
      else if (ch === 'o') coins++;
    }
  }
  return { grid, cols, enemies, spawn, flag, coins };
}

export class Game {
  /** @param level  { id, rows, ... }  @param opts { lives } */
  constructor(level, opts = {}) {
    this.level = level;
    this.data = parseLevel(level);
    this.cols = this.data.cols;
    this.width = this.cols * TILE;
    this.coinsTotal = this.data.coins;
    this.lives = opts.lives ?? 3;
    this.score = 0;
    this.coins = 0;
    this.deaths = 0;
    this.over = false;
    this.won = false;
    this.stars = 0;
    this.tick = 0;
    this.events = [];
    this.reset();
  }

  /** (Re)commence le niveau : la grille, les ennemis et le temps reviennent au départ ; le score et les vies restent. */
  reset() {
    this.grid = this.data.grid.map((r) => r.slice());
    this.coinsTaken = 0;
    this.coins = 0;
    this.time = TIME_START;
    this.timeTick = 0;
    this.cam = 0;
    this.bumps = [];
    this.particles = [];
    this.pops = [];
    this.flagY = null;
    this.phase = 'play';                               // play | dying | flag | walk | done
    this.phaseTick = 0;
    this.stompChain = 0;
    this.player = { x: this.data.spawn.x, y: this.data.spawn.y, w: PW, h: SMALL_H, vx: 0, vy: 0, big: false, onGround: false, facing: 1, coyote: 0, buffer: 0, jumpHeld: false, prevJump: false, invul: 0, anim: 0, input: { left: false, right: false, run: false, jump: false } };
    this.ents = this.data.enemies.map((e) => this.makeEnemy(e));
  }

  makeEnemy(e) {
    const goomba = e.type === 'goomba';
    const h = goomba ? 14 : 16;
    return { type: e.type, x: e.x, y: e.bottom - h, w: 12, h, vx: 0, vy: 0, dir: -1, active: false, dead: 0, grace: 0 };
  }

  solidAt(c, r) {
    if (c < 0) return true;
    if (c >= this.cols) return true;
    if (r < 0) return false;
    if (r >= ROWS) return false;
    return SOLID.has(this.grid[r][c]);
  }

  /** Déplace sur l'axe x et s'arrête contre un mur. Renvoie vrai en cas de choc. */
  moveX(e, dx) {
    e.x += dx;
    if (dx === 0) return false;
    const r0 = Math.floor(e.y / TILE);
    const r1 = Math.floor((e.y + e.h - 0.01) / TILE);
    if (dx > 0) {
      const c = Math.floor((e.x + e.w - 0.01) / TILE);
      for (let r = r0; r <= r1; r++) if (this.solidAt(c, r)) { e.x = c * TILE - e.w; return true; }
    } else {
      const c = Math.floor(e.x / TILE);
      for (let r = r0; r <= r1; r++) if (this.solidAt(c, r)) { e.x = (c + 1) * TILE; return true; }
    }
    return false;
  }

  /** Déplace sur l'axe y. Renvoie 'floor', 'ceil' (avec la tuile cognée dans this.hit) ou null. */
  moveY(e, dy) {
    e.y += dy;
    if (dy === 0) return null;
    const c0 = Math.floor(e.x / TILE);
    const c1 = Math.floor((e.x + e.w - 0.01) / TILE);
    if (dy > 0) {
      const r = Math.floor((e.y + e.h - 0.01) / TILE);
      for (let c = c0; c <= c1; c++) if (this.solidAt(c, r)) { e.y = r * TILE - e.h; return 'floor'; }
    } else {
      const r = Math.floor(e.y / TILE);
      let best = null;
      for (let c = c0; c <= c1; c++) {
        if (!this.solidAt(c, r)) continue;
        const overlap = Math.min(e.x + e.w, (c + 1) * TILE) - Math.max(e.x, c * TILE);
        if (!best || overlap > best.overlap) best = { c, r, overlap };
      }
      if (best) { e.y = (r + 1) * TILE; this.hit = best; return 'ceil'; }
    }
    return null;
  }

  emit(type, extra = {}) { this.events.push({ type, ...extra }); }
  add(points, x, y) { this.score += points; this.pops.push({ x, y, text: String(points), t: 0 }); }

  // ---------------------------------------------------------------- pas de simulation
  step(input) {
    if (this.over) return;
    if (input) this.player.input = { left: false, right: false, run: false, jump: false, ...input };
    this.tick++;
    for (const b of this.bumps) b.t++;
    this.bumps = this.bumps.filter((b) => b.t < 10);
    for (const p of this.pops) p.t++;
    this.pops = this.pops.filter((p) => p.t < 40);
    for (const p of this.particles) { p.vy += 0.25; p.x += p.vx; p.y += p.vy; p.t++; }
    this.particles = this.particles.filter((p) => p.t < 60);

    if (this.phase === 'dying') { this.stepDying(); return; }
    if (this.phase === 'flag' || this.phase === 'walk') { this.stepFinish(); return; }
    if (this.phase === 'done') return;

    this.stepPlayer();
    this.stepEntities();
    this.collideEntities();
    this.collectCoins();
    this.checkFlag();
    this.timeTick++;
    if (this.timeTick >= TIME_TICKS) { this.timeTick = 0; this.time--; if (this.time === 100) this.emit('hurry'); if (this.time <= 0) { this.time = 0; this.die(); } }
    const p = this.player;
    this.cam = Math.min(Math.max(this.cam, p.x + p.w / 2 - 104), this.width - VW);
    if (p.x < this.cam) { p.x = this.cam; if (p.vx < 0) p.vx = 0; }
  }

  stepPlayer() {
    const p = this.player;
    const inp = p.input;
    const max = inp.run ? RUN : WALK;
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const accel = p.onGround ? (inp.run ? 0.1 : 0.09) : 0.06;
    if (dir) {
      p.facing = dir;
      if (Math.sign(p.vx) === -dir) p.vx += dir * (p.onGround ? 0.22 : 0.1);           // demi-tour plus vif
      else if (Math.abs(p.vx) < max) p.vx = Math.min(max, Math.abs(p.vx) + accel) * dir;
      else if (p.onGround) p.vx -= Math.sign(p.vx) * 0.04;                            // on ralentit si on lâche « courir »
    } else if (p.onGround) {
      const f = 0.08;
      p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
    }
    p.anim += Math.abs(p.vx);

    // saut : appui (front montant) mémorisé quelques pas, et quelques pas de grâce après le bord
    if (inp.jump && !p.prevJump) p.buffer = BUFFER;
    p.prevJump = inp.jump;
    p.jumpHeld = inp.jump;
    if (p.buffer > 0) p.buffer--;
    if (p.onGround) p.coyote = COYOTE; else if (p.coyote > 0) p.coyote--;
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -(JUMP + Math.abs(p.vx) * 0.12);
      p.onGround = false;
      p.coyote = 0;
      p.buffer = 0;
      this.stompChain = 0;
      this.emit('jump', { big: p.big });
    }

    this.moveX(p, p.vx);
    if (this.collideSide(p)) p.vx = 0;
    p.vy = Math.min(MAXFALL, p.vy + (p.vy < 0 && !p.jumpHeld ? GRAV_CUT : GRAV));
    const was = p.onGround;
    const res = this.moveY(p, p.vy);
    p.onGround = false;
    if (res === 'floor') { p.onGround = true; p.vy = 0; this.stompChain = 0; if (!was) this.emit('land'); }
    else if (res === 'ceil') { p.vy = 0.5; this.bump(this.hit.c, this.hit.r); }
    if (p.invul > 0) p.invul--;
    if (p.y > ROWS * TILE + 32) this.die();
  }

  /** Après moveX : y a-t-il eu un mur ? (moveX l'a déjà recollé) */
  collideSide(e) {
    const r0 = Math.floor(e.y / TILE);
    const r1 = Math.floor((e.y + e.h - 0.01) / TILE);
    const probe = e.vx >= 0 ? Math.floor((e.x + e.w) / TILE) : Math.floor((e.x - 0.01) / TILE);
    const touching = e.vx >= 0 ? Math.abs(e.x + e.w - probe * TILE) < 0.001 : Math.abs(e.x - (probe + 1) * TILE) < 0.001;
    if (!touching) return false;
    for (let r = r0; r <= r1; r++) if (this.solidAt(probe, r)) return true;
    return false;
  }

  // ---------------------------------------------------------------- blocs
  bump(c, r) {
    const ch = this.grid[r][c];
    const x = c * TILE;
    const y = r * TILE;
    this.bumps.push({ c, r, t: 0 });
    if (ch === '?') {
      this.grid[r][c] = 'U';
      this.coins++; this.coinsTaken++;
      this.add(200, x, y - 8);
      this.emit('coin');
      this.particles.push({ x: x + 6, y: y - 4, vx: 0, vy: -5, t: 40, coin: true });
    } else if (ch === 'M') {
      this.grid[r][c] = 'U';
      this.ents.push({ type: 'mush', x: x + 2, y: y, w: 12, h: 12, vx: 0, vy: 0, dir: 1, active: true, dead: 0, grace: 0, emerge: 16, fromY: y - 12 });
      this.emit('item');
    } else if (ch === 'B') {
      if (this.player.big) {
        this.grid[r][c] = '.';
        this.add(50, x, y - 8);
        this.emit('break');
        for (const [dx, dy] of [[-1.5, -4], [1.5, -4], [-1, -2.5], [1, -2.5]]) this.particles.push({ x: x + 6, y: y + 6, vx: dx, vy: dy, t: 0 });
      } else this.emit('bump');
    } else this.emit('bump');
    // ce qui se tient sur le bloc cogné est renversé
    for (const e of this.ents) {
      if (e.dead || e.type === 'mush' || Math.abs(e.y + e.h - y) > 2) continue;
      if (e.x + e.w > x && e.x < x + TILE) { this.kill(e, 'flip'); this.add(100, e.x, e.y); }
    }
  }

  // ---------------------------------------------------------------- ennemis
  stepEntities() {
    for (const e of this.ents) {
      if (e.dead) { e.dead++; if (e.flip) { e.vy += 0.3; e.y += e.vy; e.x += e.dir * 0.4; } continue; }
      if (!e.active) { if (e.x < this.cam + VW + 24) e.active = true; else continue; }
      if (e.emerge) {
        e.emerge--;
        e.y = e.fromY + 12 * (e.emerge / 16);
        continue;
      }
      const speed = e.type === 'mush' ? 0.8 : e.type === 'shell' ? (e.vx === 0 ? 0 : SHELL_SPEED) : e.type === 'goomba' ? 0.5 : 0.5;
      if (e.grace > 0) e.grace--;
      if (e.type === 'shell') { if (e.vx !== 0) e.dir = Math.sign(e.vx); }
      e.vx = speed * e.dir;
      if (e.type === 'shell' && speed === 0) e.vx = 0;
      if (this.moveX(e, e.vx) && e.vx !== 0) {
        e.dir = -e.dir;
        if (e.type === 'shell') { e.vx = SHELL_SPEED * e.dir; this.emit('bump'); }
      }
      e.vy = Math.min(MAXFALL, e.vy + GRAV);
      if (this.moveY(e, e.vy) === 'floor') e.vy = 0;
      if (e.y > ROWS * TILE + 32) e.dead = 999;
      if (e.type === 'shell' && e.vx !== 0) {                                           // la carapace en mouvement renverse tout
        for (const o of this.ents) {
          if (o === e || o.dead || o.type === 'mush' || !o.active || !overlap(e, o)) continue;
          this.kill(o, 'flip'); this.add(200, o.x, o.y); this.emit('stomp');
        }
      }
    }
    this.ents = this.ents.filter((e) => e.dead === 0 || e.dead < (e.flip ? 90 : 30));
  }

  kill(e, how) {
    e.dead = 1;
    if (how === 'flip') { e.flip = true; e.vy = -3; }
  }

  collideEntities() {
    const p = this.player;
    for (const e of this.ents) {
      if (e.dead || !e.active || e.emerge || !overlap(p, e)) continue;
      if (e.type === 'mush') {
        e.dead = 999;
        if (!p.big) this.grow(); else this.add(1000, e.x, e.y);
        this.emit('powerup');
        continue;
      }
      const falling = p.vy > 0 && p.y + p.h - p.vy <= e.y + 8;
      if (e.type === 'shell' && e.vx === 0) {                                           // carapace immobile : on la lance
        if (e.grace > 0) continue;
        e.vx = SHELL_SPEED * (p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1);
        e.dir = Math.sign(e.vx);
        e.grace = 14;
        this.add(400, e.x, e.y);
        this.emit('kick');
        if (falling) { p.vy = -4; }
        continue;
      }
      if (falling) {
        this.stompChain++;
        const pts = [100, 200, 400, 800, 1000][Math.min(this.stompChain - 1, 4)];
        this.add(pts, e.x, e.y - 8);
        p.vy = p.jumpHeld ? -5.6 : -3.8;
        if (e.type === 'goomba') e.dead = 1;
        else if (e.type === 'koopa') { e.type = 'shell'; e.h = 12; e.y += 4; e.vx = 0; e.grace = 8; }
        else if (e.type === 'shell') { e.vx = 0; e.grace = 10; }
        this.emit('stomp');
        continue;
      }
      if (e.grace > 0 || p.invul > 0) continue;
      this.hurt();
    }
  }

  grow() {
    const p = this.player;
    p.big = true;
    p.h = BIG_H;
    p.y -= BIG_H - SMALL_H;
    this.add(1000, p.x, p.y);
  }

  hurt() {
    const p = this.player;
    if (p.big) {
      p.big = false;
      p.y += BIG_H - SMALL_H;
      p.h = SMALL_H;
      p.invul = 100;
      this.emit('shrink');
    } else this.die();
  }

  die() {
    if (this.phase !== 'play') return;
    this.phase = 'dying';
    this.phaseTick = 0;
    this.deaths++;
    const p = this.player;
    p.vx = 0;
    p.vy = -5.5;
    this.emit('die');
  }

  stepDying() {
    const p = this.player;
    this.phaseTick++;
    if (this.phaseTick > 18) { p.vy = Math.min(MAXFALL + 2, p.vy + GRAV); p.y += p.vy; }
    if (this.phaseTick > 110) {
      this.lives--;
      if (this.lives <= 0) { this.over = true; this.won = false; this.phase = 'done'; this.emit('over'); } else { this.reset(); this.emit('respawn'); }
    }
  }

  // ---------------------------------------------------------------- pièces et drapeau
  collectCoins() {
    const p = this.player;
    const c0 = Math.floor(p.x / TILE);
    const c1 = Math.floor((p.x + p.w - 0.01) / TILE);
    const r0 = Math.floor(p.y / TILE);
    const r1 = Math.floor((p.y + p.h - 0.01) / TILE);
    for (let r = Math.max(0, r0); r <= Math.min(ROWS - 1, r1); r++) {
      for (let c = Math.max(0, c0); c <= Math.min(this.cols - 1, c1); c++) {
        if (this.grid[r][c] !== 'o') continue;
        this.grid[r][c] = '.';
        this.coins++; this.coinsTaken++;
        this.score += 200;
        this.emit('coin');
        if (this.coins % 100 === 0) { this.lives++; this.emit('life'); }
      }
    }
  }

  checkFlag() {
    const f = this.data.flag;
    if (!f) return;
    const p = this.player;
    if (p.x + p.w > f.c * TILE + 6) {
      this.phase = 'flag';
      this.phaseTick = 0;
      p.vx = 0;
      p.x = f.c * TILE - 5;
      const ground = f.r * TILE + TILE;                                                // pied de la hampe
      const height = Math.max(0, Math.min(1, (ground - (p.y + p.h)) / (ground - 3 * TILE)));
      this.finishBonus = Math.round(height * 4000 / 100) * 100 + 400;
      this.flagY = 3 * TILE;
      this.emit('flag');
    }
  }

  stepFinish() {
    const p = this.player;
    const f = this.data.flag;
    this.phaseTick++;
    if (this.phase === 'flag') {
      const ground = f.r * TILE + TILE;
      this.flagY = Math.min(ground - 14, this.flagY + 2);
      if (p.y + p.h < ground) p.y = Math.min(ground - p.h, p.y + 2); else if (this.flagY >= ground - 14) { this.phase = 'walk'; this.phaseTick = 0; p.x = f.c * TILE + 8; p.facing = 1; }
      return;
    }
    p.facing = 1;
    p.vy = Math.min(MAXFALL, p.vy + GRAV);
    if (this.moveY(p, p.vy) === 'floor') p.vy = 0;
    if (this.phaseTick < 75) { this.moveX(p, 1); p.anim += 1; }
    if (this.phaseTick === 90) this.endLevel();
  }

  endLevel() {
    const bonus = this.time * 10;
    this.score += this.finishBonus + bonus;
    this.won = true;
    this.over = true;
    this.phase = 'done';
    const need = Math.ceil(this.coinsTotal * 0.6);
    this.stars = 1 + (this.deaths === 0 ? 1 : 0) + (this.coinsTaken >= need ? 1 : 0);
    this.emit('win');
  }
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------------------------------------------------------------- joueur automatique
// Il simule quelques gestes possibles sur une copie de la partie et choisit le premier qui ne le fait pas mourir.
// Les tests s'en servent pour prouver que chaque niveau peut se terminer.
Game.prototype.clone = function clone() {
  const { level, data, bot, events, ...rest } = this;
  const c = Object.create(Game.prototype);
  Object.assign(c, structuredClone(rest));
  c.level = level; c.data = data; c.events = [];
  return c;
};

const PLANS = [{ hold: 0, run: true }, { hold: 10, run: true }, { hold: 14, run: true }, { hold: 40, run: true }, { hold: 0, run: false }, { hold: 10, run: false }, { hold: 40, run: false }];
const HORIZON = 80;

function survives(g, plan) {
  const sim = g.clone();
  const deaths = sim.deaths;
  const big = sim.player.big;
  const x0 = sim.player.x;
  let airborne = false;
  for (let i = 0; i < HORIZON; i++) {
    sim.step({ left: false, right: true, run: plan.run, jump: i < plan.hold });
    sim.events.length = 0;
    if (sim.deaths !== deaths || sim.player.big !== big) return false;
    if (sim.phase !== 'play') return true;
    if (!sim.player.onGround) airborne = true;
  }
  return sim.player.x - x0 > 12;
}

export function botInput(g) {
  const p = g.player;
  const bot = g.bot ?? (g.bot = { plan: null, t: 0, air: false });
  if (!p.onGround) bot.air = true;
  if (p.onGround && p.prevJump) { bot.t = 99; return { left: false, right: true, run: false, jump: false }; }       // il faut relâcher avant de ressauter
  if (p.onGround && (!bot.plan || bot.air || (bot.plan.hold === 0 && bot.t >= 2) || bot.t > 90)) {
    bot.plan = PLANS.find((pl) => survives(g, pl)) ?? PLANS[0];
    bot.t = 0;
    bot.air = false;
  }
  const plan = bot.plan ?? PLANS[0];
  const input = { left: false, right: true, run: plan.run, jump: bot.t < plan.hold };
  bot.t++;
  return input;
}
