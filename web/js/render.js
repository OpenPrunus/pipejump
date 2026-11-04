// Pipejump — dessin : toute l'image est faite de petits rectangles et de sprites en caractères (aucun fichier image).
// Le canvas fait 256 × 224 pixels de jeu ; la page l'agrandit sans lisser.
import { TILE, VW, VH, ROWS } from './engine.js';

const PAL = { R: '#d82800', S: '#fca044', B: '#6b3800', U: '#1f4fd8', Y: '#f8d838', W: '#ffffff', K: '#101010', G: '#00a800', D: '#e8b878', P: '#f87858', O: '#f07a18', C: '#18b8c8', c: '#0c7a88', o: '#b85408', E: '#f4f4f4' };

export const SPRITES = {
  stand: ['....CCCCCC......', '...CCCCEECCC....', '...CCCCEECCCC...', '..cccccccccccc..', '...SSSSSSSKS....', '..SSSSSSSSSSSS..', '..SSKKKKKKKSSS..', '...SSKKKKKSS....', '....EEEEEE......', '..EEEOEEOEEE....', '.EEEEOOOOEEEE...', '.EEEOOYOOYOEEE..', '..EEOOOOOOOOEE..', '...OOOOOOOOO....', '...OOO....OOO...', '..BBBB....BBBB..'],
  walk1: ['....CCCCCC......', '...CCCCEECCC....', '...CCCCEECCCC...', '..cccccccccccc..', '...SSSSSSSKS....', '..SSSSSSSSSSSS..', '..SSKKKKKKKSSS..', '...SSKKKKKSS....', '....EEEEEE......', '..EEEOEEOEEE....', '.EEEEOOOOEEEE...', '.EEEOOYOOYOEEE..', '..EEOOOOOOOOEE..', '...OOOOOOOO.....', '....OOO.OOOO....', '...BBBB..BBBB...'],
  walk2: ['....CCCCCC......', '...CCCCEECCC....', '...CCCCEECCCC...', '..cccccccccccc..', '...SSSSSSSKS....', '..SSSSSSSSSSSS..', '..SSKKKKKKKSSS..', '...SSKKKKKSS....', '....EEEEEE......', '..EEEOEEOEEE....', '.EEEEOOOOEEEE...', '.EEEOOYOOYOEEE..', '..EEOOOOOOOOEE..', '...OOOOOOO......', '..OOO.....OOO...', '.BBBB.....BBBB..'],
  jump: ['....CCCCCC......', '...CCCCEECCC....', '...CCCCEECCCC...', '..cccccccccccc..', '...SSSSSSSKS....', '..SSSSSSSSSSSS..', '..SSKKKKKKKSSS..', '...SSKKKKKSS....', '....EEEEEE..EE..', '..EEEOEEOEEEEEE.', '.EEEEOOOOEEEE...', '.EEEOOYOOYOE....', '..EEOOOOOOOOE...', '..OOOOOOOOOO....', '.BBBO....OOBB...', '.BBBB.....BBB...'],
  goomba: ['......BBBB......', '....BBBBBBBB....', '...BBBBBBBBBB...', '..BBBBBBBBBBBB..', '..BWWBBBBBBWWB..', '.BBWKWBBBBWKWBB.', '.BBBBBBBBBBBBBB.', '..BBBBBBBBBBBB..', '...DDDDDDDDDD...', '....DDDDDDDD....', '....DDDDDDDD....', '...KKKKK.KKKKK..', '..KKKKKK.KKKKKK.', '..KKKKK...KKKKK.'],
  koopa: ['.....YYYY.......', '....YYYYYY......', '....YKWYYY......', '....YYYYYYY.....', '.....YYY.GGGG...', '....GGGGGGGGGG..', '...GGWWGGGWWGGG.', '...GWWWWGWWWWGG.', '...GGWWGGGWWGGG.', '...GGGGGGGGGGGG.', '...WWWWWWWWWWWW.', '....YYYYYYYYYY..', '....YYY....YYY..', '...YYYY....YYYY.', '..YYYY......YYY.', '................'],
  shell: ['....GGGGGGGG....', '..GGGGWWWWGGGG..', '.GGGWWWWWWWWGGG.', '.GGWWWWWWWWWWGG.', '.GGGWWWWWWWWGGG.', 'GGGGGWWWWWWGGGGG', 'GWWWWWWWWWWWWWWG', '..WWWWWWWWWWWW..', '...WWYYYYYYWW...', '....WWWWWWWW....', '................', '................'],
  mush: ['.....RRRRRR.....', '...RRRWWRRRRR...', '..RRRWWWWRRRRR..', '.RRRRWWWWRRWWRR.', '.RWWRRRRRRWWWWRR', 'RRWWWRRRRRRWWWRR', 'RRWWWRRRRRRRRRRR', 'RRRRRRRRRRRRRRRR', '.RRRSSSSSSSSRRR.', '....SSKSSKSS....', '....SSSSSSSS....', '....SSSSSSSS....', '....SSSSSSSS....', '.....SSSSSS.....'],
};

const cache = new Map();
function sprite(name, flip = false) {
  const key = name + (flip ? 'f' : '');
  let c = cache.get(key);
  if (c) return c;
  const rows = SPRITES[name];
  c = document.createElement('canvas');
  c.width = 16;
  c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const ch = row[flip ? 15 - x : x];
      if (ch === '.') continue;
      g.fillStyle = PAL[ch] ?? '#f0f';
      g.fillRect(x, y, 1, 1);
    }
  });
  cache.set(key, c);
  return c;
}

const THEMES = {
  day: { sky: ['#5c94fc', '#a8d0ff'], ground: '#c84c0c', top: '#58d858', topEdge: '#00a800', line: '#6b1c00', brick: '#c84c0c', brickLine: '#f8b878', hill: '#2f9b3a', hill2: '#58d858', cloud: '#ffffff' },
  cave: { sky: ['#04040e', '#10102c'], ground: '#2c5a9a', top: '#4c82c8', topEdge: '#1c3a6c', line: '#10264a', brick: '#2c5a9a', brickLine: '#6ca0e0', hill: '#12163a', hill2: '#1c2250', cloud: '#2a2a5a' },
  dusk: { sky: ['#2a1a5a', '#f08a4a'], ground: '#6a3a1c', top: '#d88a2c', topEdge: '#a85a14', line: '#2c1408', brick: '#7a3a2c', brickLine: '#e0906c', hill: '#3a2050', hill2: '#5a2c5c', cloud: '#f8b878' },
  snow: { sky: ['#9ec4ec', '#eaf4ff'], ground: '#5c7ab0', top: '#ffffff', topEdge: '#c8dcf4', line: '#2c3c64', brick: '#6a88bc', brickLine: '#d8e8ff', hill: '#bcd0ec', hill2: '#e4efff', cloud: '#ffffff' },
};
const QGLYPH = ['..1111..', '.11..11.', '.....11.', '....11..', '...11...', '........', '...11...', '........'];

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.th = THEMES[game.level.theme] ?? THEMES.day;
    canvas.width = VW;
    canvas.height = VH;
  }

  draw(now = 0) {
    const g = this.game;
    const x = this.ctx;
    const th = this.th;
    const cam = Math.floor(g.cam);
    const t = g.tick;
    // ciel
    const grad = x.createLinearGradient(0, 0, 0, VH);
    grad.addColorStop(0, th.sky[0]);
    grad.addColorStop(1, th.sky[1]);
    x.fillStyle = grad;
    x.fillRect(0, 0, VW, VH);
    this.drawBackdrop(cam, t);
    // tuiles
    const c0 = Math.max(0, Math.floor(cam / TILE));
    const c1 = Math.min(g.cols - 1, c0 + VW / TILE + 1);
    for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) this.drawTile(g.grid[r][c], c, r, cam, t);
    this.drawFlag(cam);
    // objets
    for (const e of g.ents) this.drawEntity(e, cam, t);
    this.drawPlayer(cam);
    for (const p of g.particles) {
      if (p.coin) { x.fillStyle = '#f8d838'; x.fillRect(Math.round(p.x - cam), Math.round(p.y), 4, 6); continue; }
      x.fillStyle = th.brick;
      x.fillRect(Math.round(p.x - cam), Math.round(p.y), 5, 5);
      x.fillStyle = th.brickLine;
      x.fillRect(Math.round(p.x - cam), Math.round(p.y), 5, 1);
    }
    x.font = 'bold 8px ui-monospace, monospace';
    x.textAlign = 'center';
    for (const p of g.pops) {
      const px = Math.round(p.x - cam + 8);
      const py = Math.round(p.y - p.t * 0.6);
      x.fillStyle = '#000';
      x.fillText(p.text, px + 1, py + 1);
      x.fillStyle = '#fff';
      x.fillText(p.text, px, py);
    }
  }

  drawBackdrop(cam, t) {
    const x = this.ctx;
    const th = this.th;
    const theme = this.game.level.theme;
    if (theme === 'dusk') {                                                         // soleil bas
      x.fillStyle = '#ffd890';
      x.beginPath(); x.arc(176, 150, 26, 0, Math.PI * 2); x.fill();
    }
    // collines lointaines (défilent moitié moins vite)
    for (let i = -1; i < 6; i++) {
      const bx = i * 120 - ((cam * 0.35) % 120);
      x.fillStyle = th.hill;
      x.beginPath(); x.ellipse(bx + 60, 192, 70, 40 + ((i * 7) & 3) * 8, 0, Math.PI, 0); x.fill();
      x.fillStyle = th.hill2;
      x.beginPath(); x.ellipse(bx + 30, 192, 38, 24 + ((i * 5) & 3) * 4, 0, Math.PI, 0); x.fill();
    }
    if (theme === 'cave') {                                                         // stalactites
      x.fillStyle = th.hill2;
      for (let i = -1; i < 12; i++) {
        const bx = i * 40 - ((cam * 0.6) % 40);
        x.beginPath(); x.moveTo(bx, 40); x.lineTo(bx + 14, 40); x.lineTo(bx + 7, 72 + ((i * 13) & 3) * 8); x.fill();
      }
      return;
    }
    // nuages
    x.fillStyle = th.cloud;
    for (let i = -1; i < 5; i++) {
      const bx = i * 150 - ((cam * 0.5) % 150) + 20;
      const by = 24 + ((i * 37) & 3) * 14;
      x.fillRect(bx + 6, by, 28, 10); x.fillRect(bx, by + 4, 40, 8); x.fillRect(bx + 12, by - 4, 14, 8);
    }
    if (theme === 'snow') {                                                         // neige qui tombe
      x.fillStyle = '#fff';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 53 + t * 0.35 * (1 + (i % 3) * 0.3) - cam * 0.2) % VW;
        const sy = (i * 31 + t * (0.6 + (i % 4) * 0.2)) % VH;
        x.fillRect(Math.floor((sx + VW) % VW), Math.floor(sy), 2, 2);
      }
    }
  }

  drawTile(ch, c, r, cam, t) {
    if (ch === '.') return;
    const x = this.ctx;
    const th = this.th;
    const px = c * TILE - cam;
    let py = r * TILE;
    if (ch === 'o') { this.drawCoin(px, py, t); return; }
    const bump = this.game.bumps.find((b) => b.c === c && b.r === r);
    if (bump) py -= Math.round(Math.sin((Math.PI * bump.t) / 10) * 5);
    switch (ch) {
      case '#': {
        const top = r === 12;
        x.fillStyle = th.ground; x.fillRect(px, py, TILE, TILE);
        x.fillStyle = th.line;
        x.fillRect(px, py + 15, TILE, 1); x.fillRect(px + 15, py, 1, TILE);
        x.fillRect(px + 5, py + 7, 4, 1); x.fillRect(px + 10, py + 11, 3, 1);
        if (top) { x.fillStyle = th.top; x.fillRect(px, py, TILE, 5); x.fillStyle = th.topEdge; x.fillRect(px, py + 5, TILE, 1); x.fillRect(px + 2, py + 6, 3, 1); x.fillRect(px + 9, py + 6, 4, 1); }
        break;
      }
      case 'B': {
        x.fillStyle = th.brick; x.fillRect(px, py, TILE, TILE);
        x.fillStyle = th.line;
        x.fillRect(px, py + 7, TILE, 1); x.fillRect(px, py + 15, TILE, 1);
        x.fillRect(px + 7, py, 1, 7); x.fillRect(px + 3, py + 8, 1, 7); x.fillRect(px + 11, py + 8, 1, 7); x.fillRect(px + 15, py, 1, 8);
        x.fillStyle = th.brickLine; x.fillRect(px, py, TILE - 1, 1); x.fillRect(px, py + 8, TILE - 1, 1);
        break;
      }
      case '?': case 'M': {
        const flick = Math.floor(t / 14) % 4;
        x.fillStyle = flick === 3 ? '#c87800' : '#fcb838'; x.fillRect(px, py, TILE, TILE);
        x.fillStyle = '#7a3a00'; x.fillRect(px, py, TILE, 1); x.fillRect(px, py + 15, TILE, 1); x.fillRect(px, py, 1, TILE); x.fillRect(px + 15, py, 1, TILE);
        x.fillStyle = '#fff4c0'; x.fillRect(px + 1, py + 1, 1, 1); x.fillRect(px + 14, py + 1, 1, 1); x.fillRect(px + 1, py + 14, 1, 1); x.fillRect(px + 14, py + 14, 1, 1);
        x.fillStyle = '#7a3a00';
        QGLYPH.forEach((row, yy) => { for (let xx = 0; xx < 8; xx++) if (row[xx] === '1') x.fillRect(px + 4 + xx, py + 4 + yy, 1, 1); });
        break;
      }
      case 'U': {
        x.fillStyle = '#8a5a30'; x.fillRect(px, py, TILE, TILE);
        x.fillStyle = '#4a2a10'; x.fillRect(px, py, TILE, 1); x.fillRect(px, py + 15, TILE, 1); x.fillRect(px, py, 1, TILE); x.fillRect(px + 15, py, 1, TILE);
        x.fillRect(px + 3, py + 3, 2, 2); x.fillRect(px + 11, py + 3, 2, 2); x.fillRect(px + 3, py + 11, 2, 2); x.fillRect(px + 11, py + 11, 2, 2);
        break;
      }
      case 'H': {
        x.fillStyle = '#b8b8c8'; x.fillRect(px, py, TILE, TILE);
        x.fillStyle = '#f0f0f8'; x.fillRect(px, py, TILE, 2); x.fillRect(px, py, 2, TILE);
        x.fillStyle = '#585868'; x.fillRect(px, py + 14, TILE, 2); x.fillRect(px + 14, py, 2, TILE);
        x.fillStyle = '#8888a0'; x.fillRect(px + 4, py + 4, 8, 8);
        break;
      }
      case 'l': case 'r': {
        const cap = !SOLIDPIPE.has(this.game.grid[r - 1]?.[c] ?? '.');
        const left = ch === 'l';
        x.fillStyle = '#00a800'; x.fillRect(px, py, TILE, TILE);
        x.fillStyle = '#58f858'; x.fillRect(px + (left ? 3 : 0), py, 3, TILE);
        x.fillStyle = '#005800'; x.fillRect(px + (left ? 0 : 13), py, left ? 1 : 3, TILE);
        if (cap) { x.fillStyle = '#00a800'; x.fillRect(px - (left ? 1 : 0), py, TILE + 1, 8); x.fillStyle = '#58f858'; x.fillRect(px + (left ? 3 : 0), py, 3, 8); x.fillStyle = '#005800'; x.fillRect(px - (left ? 1 : 0), py + 7, TILE + 1, 1); x.fillRect(px - (left ? 1 : 0), py, TILE + 1, 1); }
        break;
      }
      default: break;
    }
  }

  drawCoin(px, py, t) {
    const x = this.ctx;
    const w = 2 + Math.round(Math.abs(Math.cos(t / 9)) * 3) * 2;
    x.fillStyle = '#7a5a00'; x.fillRect(px + 8 - w / 2 - 1, py + 3, w + 2, 11);
    x.fillStyle = '#f8d838'; x.fillRect(px + 8 - w / 2, py + 4, w, 9);
    x.fillStyle = '#fff4a0'; x.fillRect(px + 8 - w / 2 + 1, py + 5, Math.max(1, w / 2 - 1), 4);
  }

  drawEntity(e, cam, t) {
    const x = this.ctx;
    const px = Math.round(e.x - cam);
    const py = Math.round(e.y);
    if (px < -24 || px > VW + 24) return;
    if (e.type === 'goomba') {
      if (e.dead && !e.flip) { x.fillStyle = '#6b3800'; x.fillRect(px - 2, py + e.h - 6, 16, 6); x.fillStyle = '#000'; x.fillRect(px + 2, py + e.h - 4, 2, 2); x.fillRect(px + 8, py + e.h - 4, 2, 2); return; }
      this.blit(sprite('goomba', Math.floor(t / 10) % 2 === 0), px - 2, py + e.h - 14, e.flip);
    } else if (e.type === 'koopa') {
      this.blit(sprite('koopa', e.dir > 0), px - 2, py + e.h - 16, e.flip);
    } else if (e.type === 'shell') {
      this.blit(sprite('shell'), px - 2, py + e.h - 12, e.flip);
    } else if (e.type === 'mush') {
      if (e.dead) return;
      this.blit(sprite('mush'), px - 2, py + e.h - 14, false);
    }
  }

  blit(img, x, y, flipV) {
    const c = this.ctx;
    if (flipV) { c.save(); c.translate(0, y * 2 + img.height); c.scale(1, -1); c.drawImage(img, x, y); c.restore(); } else c.drawImage(img, x, y);
  }

  drawPlayer(cam) {
    const g = this.game;
    const p = g.player;
    const x = this.ctx;
    if (p.invul > 0 && Math.floor(p.invul / 4) % 2 === 0 && g.phase === 'play') return;
    if (g.phase === 'walk' && g.data.flag && p.x > (g.cols - 4) * TILE) return;     // il est entré au château
    let name = 'stand';
    if (g.phase === 'dying' || g.phase === 'flag' || !p.onGround) name = 'jump';
    else if (Math.abs(p.vx) > 0.15 || g.phase === 'walk') name = ['stand', 'walk1', 'walk2', 'walk1'][Math.floor(p.anim / 7) % 4];
    const img = sprite(name, p.facing < 0);
    const px = Math.round(p.x - cam);
    const py = Math.round(p.y);
    if (p.big) x.drawImage(img, px - 6, py, 24, 24);
    else x.drawImage(img, px - 2, py);
  }

  drawFlag(cam) {
    const g = this.game;
    const f = g.data.flag;
    if (!f) return;
    const x = this.ctx;
    const px = f.c * TILE - cam;
    // hampe
    x.fillStyle = '#e8e8e8'; x.fillRect(px + 7, 2 * TILE, 2, (f.r + 1) * TILE - 2 * TILE);
    x.fillStyle = '#f8d838'; x.fillRect(px + 5, 2 * TILE - 4, 6, 6);
    const fy = g.flagY ?? 3 * TILE;
    x.fillStyle = '#00a800';
    x.beginPath(); x.moveTo(px + 7, fy); x.lineTo(px - 9, fy + 6); x.lineTo(px + 7, fy + 12); x.fill();
    x.fillStyle = '#fff'; x.fillRect(px - 3, fy + 4, 3, 3);
    // château
    const cx = (g.cols - 6) * TILE - cam;
    if (cx < VW + 8) {
      const base = (f.r + 1) * TILE;
      x.fillStyle = this.th.brick; x.fillRect(cx, base - 64, 80, 64);
      x.fillStyle = this.th.line;
      for (let yy = base - 64; yy < base; yy += 8) x.fillRect(cx, yy, 80, 1);
      x.fillStyle = this.th.brick; x.fillRect(cx - 4, base - 80, 88, 16);
      x.fillStyle = this.th.line;
      for (let i = 0; i < 5; i++) x.fillRect(cx - 4 + i * 20 + 14, base - 80, 8, 6);
      x.fillStyle = '#000'; x.fillRect(cx + 30, base - 24, 20, 24); x.fillRect(cx + 34, base - 28, 12, 6);
    }
  }
}

const SOLIDPIPE = new Set(['l', 'r']);
