// Pipejump — quatre niveaux. Chaque niveau est bâti par de petites fonctions puis rendu en 14 lignes de texte (les tests le relisent
// et vérifient qu'un joueur automatique le termine). Légende :
//   .  vide      #  sol       H  bloc dur    B  brique     ?  bloc à pièce    M  bloc à champignon    U  bloc vidé
//   l r  tuyau (moitié gauche / droite)      o  pièce       g  gloumpf (marche, s'écrase)      k  tortue (devient carapace)
//   S  départ    F  pied du drapeau
const ROWS = 14;
const GROUND = 12;                                      // première ligne de sol

function build(cols, theme, fn) {
  const g = Array.from({ length: ROWS }, () => Array(cols).fill('.'));
  const api = {
    cols,
    set: (c, r, ch) => { if (c >= 0 && c < cols && r >= 0 && r < ROWS) g[r][c] = ch; },
    row: (c, r, s) => { [...s].forEach((ch, i) => api.set(c + i, r, ch)); },
    ground: (c0, c1) => { for (let c = c0; c <= c1; c++) for (let r = GROUND; r < ROWS; r++) api.set(c, r, '#'); },
    pipe: (c, h) => { for (let r = GROUND - h; r < GROUND; r++) { api.set(c, r, 'l'); api.set(c + 1, r, 'r'); } },
    stairs: (c, n, dir = 1) => { for (let i = 0; i < n; i++) for (let k = 0; k <= i; k++) api.set(dir > 0 ? c + i : c + n - 1 - i, GROUND - 1 - k, 'H'); },
    coins: (c, r, n) => { for (let i = 0; i < n; i++) api.set(c + i, r, 'o'); },
    arc: (c, r, n) => { for (let i = 0; i < n; i++) api.set(c + i, r - (i === 0 || i === n - 1 ? 0 : 1), 'o'); },
    enemy: (c, ch, r = GROUND - 1) => api.set(c, r, ch),
    ceiling: (rows) => { for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) api.set(c, r, 'B'); },
  };
  fn(api);
  // fin de niveau : drapeau puis place pour le château
  api.set(cols - 9, GROUND - 1, 'F');
  api.set(cols - 9, GROUND, '#');
  return { rows: g.map((r) => r.join('')), theme };
}

const L1 = build(150, 'day', (a) => {
  a.ground(0, 149);
  a.set(2, 11, 'S');
  for (const c of [38, 39, 40, 83, 84, 85, 112, 113, 114]) for (let r = GROUND; r < ROWS; r++) a.set(c, r, '.');
  a.row(14, 8, '?B?B?'); a.set(16, 8, 'M');
  a.arc(22, 7, 5); a.coins(30, 10, 3);
  a.pipe(26, 2); a.pipe(46, 3); a.pipe(64, 2); a.pipe(93, 3);
  a.row(50, 8, 'B?BMB'); a.coins(51, 6, 3);
  a.arc(56, 8, 6);
  a.enemy(20, 'g'); a.enemy(32, 'g'); a.enemy(54, 'g'); a.enemy(58, 'g'); a.enemy(70, 'g'); a.enemy(75, 'k'); a.enemy(98, 'g'); a.enemy(104, 'k');
  a.row(88, 8, '?B?'); a.coins(100, 10, 4);
  a.row(118, 8, 'BBB?B'); a.coins(119, 7, 3);
  a.stairs(124, 4); a.stairs(129, 4, -1); a.coins(125, 6, 3);
  a.enemy(136, 'g');
});

const L2 = build(170, 'cave', (a) => {
  a.ceiling(3);
  a.ground(0, 169);
  a.set(2, 11, 'S');
  for (const c of [32, 33, 34, 70, 71, 72, 73, 100, 101, 102, 135, 136, 137]) for (let r = GROUND; r < ROWS; r++) a.set(c, r, '.');
  for (const c of [20, 21, 22, 56, 57, 90, 118, 119, 120]) { a.set(c, 3, 'H'); a.set(c, 4, 'H'); }
  a.row(10, 8, 'B?B'); a.set(11, 8, 'M'); a.coins(14, 10, 3);
  a.pipe(18, 2); a.pipe(40, 3); a.pipe(62, 2); a.pipe(96, 3); a.pipe(126, 2);
  a.enemy(26, 'g'); a.enemy(29, 'g'); a.enemy(46, 'k'); a.enemy(50, 'g'); a.enemy(66, 'g'); a.enemy(80, 'k'); a.enemy(84, 'g'); a.enemy(108, 'g'); a.enemy(112, 'g'); a.enemy(130, 'k');
  a.row(44, 8, 'B?B?B'); a.set(46, 8, 'M'); a.coins(45, 6, 3);
  a.arc(35, 8, 6); a.arc(74, 8, 7); a.arc(103, 8, 6);
  a.row(78, 8, '?BBB?'); a.coins(78, 6, 5);
  a.stairs(140, 3); a.stairs(144, 3, -1); a.coins(141, 7, 3);
  a.row(150, 8, 'B?B'); a.enemy(152, 'g');
});

const L3 = build(190, 'dusk', (a) => {
  a.ground(0, 189);
  a.set(2, 11, 'S');
  const pits = [[28, 31], [52, 55], [74, 77], [98, 101], [120, 123], [144, 147], [160, 162]];
  for (const [p0, p1] of pits) for (let c = p0; c <= p1; c++) for (let r = GROUND; r < ROWS; r++) a.set(c, r, '.');
  for (const [p0, p1] of pits) a.arc(p0 - 1, 8, p1 - p0 + 3);
  a.row(12, 8, '?B?B'); a.set(14, 8, 'M');
  a.pipe(18, 2); a.pipe(40, 2); a.pipe(64, 3); a.pipe(86, 2); a.pipe(110, 3); a.pipe(134, 2); a.pipe(152, 3);
  a.enemy(22, 'g'); a.enemy(34, 'k'); a.enemy(44, 'g'); a.enemy(47, 'g'); a.enemy(58, 'k'); a.enemy(68, 'g'); a.enemy(80, 'k'); a.enemy(90, 'g'); a.enemy(93, 'g');
  a.enemy(104, 'k'); a.enemy(116, 'g'); a.enemy(126, 'g'); a.enemy(129, 'k'); a.enemy(138, 'g'); a.enemy(155, 'g');
  a.row(68, 8, 'B?B'); a.row(106, 8, '?M?'); a.coins(107, 6, 3); a.row(130, 8, 'B?BB');
  a.stairs(168, 5); a.stairs(174, 5, -1); a.coins(169, 5, 4);
});

const L4 = build(220, 'snow', (a) => {
  a.ground(0, 219);
  a.set(2, 11, 'S');
  const pits = [[26, 28], [48, 51], [70, 72], [92, 95], [118, 120], [146, 149], [172, 175]];
  for (const [p0, p1] of pits) for (let c = p0; c <= p1; c++) for (let r = GROUND; r < ROWS; r++) a.set(c, r, '.');
  for (const [p0, p1] of pits) a.arc(p0 - 1, 8, p1 - p0 + 3);
  a.row(10, 8, '?B?'); a.set(11, 8, 'M');
  a.pipe(16, 2); a.pipe(36, 3); a.pipe(58, 2); a.pipe(60, 3); a.pipe(80, 3); a.pipe(104, 2); a.pipe(106, 3); a.pipe(128, 3); a.pipe(158, 2);
  a.enemy(20, 'g'); a.enemy(23, 'g'); a.enemy(31, 'k'); a.enemy(40, 'g'); a.enemy(44, 'g'); a.enemy(54, 'k'); a.enemy(65, 'g'); a.enemy(75, 'g'); a.enemy(78, 'g');
  a.enemy(85, 'k'); a.enemy(98, 'g'); a.enemy(101, 'g'); a.enemy(111, 'k'); a.enemy(114, 'g'); a.enemy(123, 'g'); a.enemy(133, 'k'); a.enemy(137, 'g'); a.enemy(140, 'g');
  a.enemy(152, 'g'); a.enemy(164, 'k'); a.enemy(168, 'g'); a.enemy(182, 'g'); a.enemy(186, 'k');
  a.row(42, 8, 'B?B?B'); a.row(86, 8, '?B?M?'); a.row(130, 8, 'B?B'); a.row(162, 8, '?B?'); a.coins(163, 6, 3);
  a.stairs(190, 4); a.stairs(195, 4, -1); a.stairs(200, 2); a.coins(191, 6, 3);
});

export const LEVELS = [
  { id: 1, name: { fr: 'Prairie', en: 'Meadow' }, hint: { fr: 'Écrasez les gloumpfs en sautant dessus, frappez les blocs par en dessous.', en: 'Jump on the grumps to squash them, hit blocks from below.' }, ...L1 },
  { id: 2, name: { fr: 'Cavernes', en: 'Caves' }, hint: { fr: 'Plafond bas et trous : gardez l\'élan.', en: 'Low ceiling and pits: keep your momentum.' }, ...L2 },
  { id: 3, name: { fr: 'Crépuscule', en: 'Dusk' }, hint: { fr: 'Les trous s\'enchaînent : courez avec B pour sauter plus loin.', en: 'Pits keep coming: run with B to jump further.' }, ...L3 },
  { id: 4, name: { fr: 'Neiges', en: 'Snowfield' }, hint: { fr: 'Le plus long : champignons, tortues et carapaces à lancer.', en: 'The longest: mushrooms, turtles and shells to kick.' }, ...L4 },
];
