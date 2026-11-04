// Pipejump — textes FR / EN.
export const DICT = {
  fr: {
    title: 'Pipejump',
    tagline: 'Un jeu de plateforme : courez, sautez sur les ennemis, frappez les blocs et rejoignez le drapeau.',
    play: 'Jouer',
    levels: 'Niveaux',
    continue: 'Continuer',
    howTo: 'Comment jouer',
    help1: 'Courez vers la droite jusqu\'au drapeau. Sautez SUR les gloumpfs et les tortues pour les écraser : les toucher de côté fait mal. Une carapace immobile se lance en la touchant ; lancée, elle renverse tout sur son passage… y compris vous.',
    help2: 'Frappez les blocs par en dessous : « ? » donne une pièce ou un champignon qui vous fait grandir (grand, vous cassez les briques et un coup ne vous tue pas). Les trous et le temps qui s\'écoule sont mortels. Maintenez le saut pour sauter haut, relâchez pour sauter court.',
    help3: 'Clavier : flèches ou Q/D pour bouger, Haut ou Espace pour sauter, Maj ou X pour courir (et sauter plus loin), P pause, R recommencer, Échap quitter. Sur téléphone : ◀ ▶ à gauche, B (courir) et A (sauter) à droite.',
    allGames: 'Tous les jeux',
    github: 'GitHub',
    soundOn: 'Son : oui',
    soundOff: 'Son : non',
    langToggle: 'English',
    back: 'Retour',
    ok: 'OK',
    level: 'Niveau {n}',
    locked: 'Verrouillé',
    best: 'Meilleur : {n}',
    score: 'Score',
    lives: 'Vies',
    coins: 'Pièces',
    time: 'Temps',
    briefing: 'Atteignez le drapeau avant la fin du temps.',
    start: 'C\'est parti',
    pause: 'Pause',
    resume: 'Reprendre',
    paused: 'Pause',
    restart: 'Recommencer',
    menu: 'Menu',
    left: 'Gauche',
    right: 'Droite',
    jump: 'Sauter',
    run: 'Courir',
    won: 'Niveau terminé !',
    lost: 'Plus de vies…',
    wonDetail: 'Score : {score}. Pièces : {coins}.',
    newBest: 'Nouveau record !',
    lostDetail: 'Score : {score}.',
    next: 'Niveau suivant',
    retry: 'Réessayer',
    finished: 'Tous les niveaux sont terminés, bravo !',
    hurry: 'Dépêchez-vous !',
    offline: 'Hors ligne : le jeu fonctionne sans internet une fois chargé.',
  },
  en: {
    title: 'Pipejump',
    tagline: 'A platformer: run, stomp on enemies, bump blocks and reach the flag.',
    play: 'Play',
    levels: 'Levels',
    continue: 'Continue',
    howTo: 'How to play',
    help1: 'Run right to the flag. Jump ON grumps and turtles to squash them: touching them from the side hurts. An idle shell is kicked by touching it; once moving it knocks over everything in its way… including you.',
    help2: 'Bump blocks from below: "?" gives a coin or a mushroom that makes you grow (when big you break bricks and one hit does not kill you). Pits and the running clock are deadly. Hold jump to jump high, release to jump short.',
    help3: 'Keyboard: arrows or A/D to move, Up or Space to jump, Shift or X to run (and jump further), P pause, R restart, Esc leave. On a phone: ◀ ▶ on the left, B (run) and A (jump) on the right.',
    allGames: 'All games',
    github: 'GitHub',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    langToggle: 'Français',
    back: 'Back',
    ok: 'OK',
    level: 'Level {n}',
    locked: 'Locked',
    best: 'Best: {n}',
    score: 'Score',
    lives: 'Lives',
    coins: 'Coins',
    time: 'Time',
    briefing: 'Reach the flag before time runs out.',
    start: 'Let\'s go',
    pause: 'Pause',
    resume: 'Resume',
    paused: 'Paused',
    restart: 'Restart',
    menu: 'Menu',
    left: 'Left',
    right: 'Right',
    jump: 'Jump',
    run: 'Run',
    won: 'Level cleared!',
    lost: 'Out of lives…',
    wonDetail: 'Score: {score}. Coins: {coins}.',
    newBest: 'New best!',
    lostDetail: 'Score: {score}.',
    next: 'Next level',
    retry: 'Try again',
    finished: 'Every level is cleared, well done!',
    hurry: 'Hurry up!',
    offline: 'Offline: the game works without internet once loaded.',
  },
};

export const LANGS = Object.keys(DICT);
let lang = 'fr';

export function detectLang() {
  try {
    const saved = localStorage.getItem('pipejump.lang');
    if (saved && DICT[saved]) return saved;
  } catch { /* stockage indisponible */ }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'fr';
  return nav.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export function setLang(l) {
  if (!DICT[l]) return;
  lang = l;
  try { localStorage.setItem('pipejump.lang', l); } catch { /* ignoré */ }
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

export const getLang = () => lang;

export function t(key, vars = {}) {
  const s = DICT[lang]?.[key] ?? DICT.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

/** Texte d'un champ { fr, en } d'un niveau. */
export const pick = (obj) => obj?.[lang] ?? obj?.en ?? '';

export function apply(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  document.title = t('title');
}
