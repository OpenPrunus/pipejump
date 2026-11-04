// Pipejump — sons synthétisés (aucun fichier audio). Les navigateurs exigent un geste utilisateur : unlock().
let ctx = null;
let muted = false;
try { muted = localStorage.getItem('pipejump.muted') === '1'; } catch { /* ignoré */ }

export function unlock() {
  if (ctx || typeof AudioContext === 'undefined') {
    if (ctx?.state === 'suspended') ctx.resume();
    return;
  }
  ctx = new AudioContext();
}

export const isMuted = () => muted;

export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('pipejump.muted', m ? '1' : '0'); } catch { /* ignoré */ }
}

function tone(freq, dur, { type = 'square', gain = 0.06, slide = 0, delay = 0 } = {}) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function play(name) {
  switch (name) {
    case 'jump': tone(300, 0.18, { type: 'square', gain: 0.05, slide: 500 }); break;
    case 'bigjump': tone(220, 0.22, { type: 'square', gain: 0.05, slide: 560 }); break;
    case 'coin': tone(988, 0.07, { gain: 0.05 }); tone(1319, 0.2, { gain: 0.05, delay: 0.07 }); break;
    case 'stomp': tone(260, 0.1, { type: 'square', gain: 0.07, slide: -120 }); break;
    case 'kick': tone(180, 0.12, { type: 'sawtooth', gain: 0.07, slide: 300 }); break;
    case 'bump': tone(120, 0.08, { type: 'triangle', gain: 0.12 }); break;
    case 'break': tone(90, 0.16, { type: 'sawtooth', gain: 0.1, slide: -40 }); tone(60, 0.12, { type: 'square', gain: 0.05, delay: 0.03 }); break;
    case 'item': [330, 440, 550].forEach((f, i) => tone(f, 0.08, { type: 'triangle', gain: 0.06, delay: i * 0.05 })); break;
    case 'powerup': [392, 494, 587, 784, 988, 1175].forEach((f, i) => tone(f, 0.07, { gain: 0.05, delay: i * 0.045 })); break;
    case 'shrink': [800, 600, 400, 300].forEach((f, i) => tone(f, 0.08, { gain: 0.06, delay: i * 0.06 })); break;
    case 'die': [494, 466, 440, 330, 262].forEach((f, i) => tone(f, 0.14, { type: 'square', gain: 0.07, delay: i * 0.12 })); break;
    case 'life': [659, 784, 1319, 1047, 1175, 1568].forEach((f, i) => tone(f, 0.09, { gain: 0.06, delay: i * 0.07 })); break;
    case 'flag': tone(1400, 0.9, { type: 'triangle', gain: 0.07, slide: -1100 }); break;
    case 'hurry': [880, 660, 880, 660].forEach((f, i) => tone(f, 0.08, { gain: 0.05, delay: i * 0.1 })); break;
    case 'click': tone(700, 0.04, { gain: 0.04 }); break;
    case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.14, { gain: 0.07, delay: i * 0.11 })); break;
    case 'lose': [392, 330, 262, 196].forEach((f, i) => tone(f, 0.24, { gain: 0.08, delay: i * 0.18 })); break;
    default: break;
  }
}
