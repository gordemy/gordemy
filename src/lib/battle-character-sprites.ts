/**
 * Sprite frame URLs for BattleCharacter (inline SVG data URIs — no Rive, no external assets).
 */
function svgFrame(inner: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 80">${inner}</svg>`,
  )}`;
}

const body = (opts: {
  armL: string;
  armR: string;
  lean?: number;
  eyed?: boolean;
  sparkle?: boolean;
}) => {
  const lean = opts.lean ?? 0;
  const g = `<g transform="translate(28,40) rotate(${lean}) translate(-28,-40)">
  <ellipse cx="28" cy="68" rx="14" ry="5" fill="#0f172a" opacity="0.45"/>
  <rect x="18" y="38" width="20" height="26" rx="5" fill="#6366f1"/>
  <rect x="16" y="22" width="24" height="20" rx="8" fill="#fecdd3"/>
  ${opts.eyed ? `<path d="M20 28 L24 32 M32 28 L36 32" stroke="#1e1b4b" stroke-width="2" stroke-linecap="round"/>` : `<circle cx="22" cy="30" r="2.5" fill="#1e1b4b"/><circle cx="34" cy="30" r="2.5" fill="#1e1b4b"/>`}
  ${opts.armL}
  ${opts.armR}
  <rect x="20" y="62" width="7" height="14" rx="3" fill="#312e81"/>
  <rect x="29" y="62" width="7" height="14" rx="3" fill="#312e81"/>
</g>`;
  const spark = opts.sparkle
    ? `<g fill="#fbbf24" opacity="0.95">
  <polygon points="8,12 10,18 16,20 10,22 8,28 6,22 0,20 6,18"/>
  <polygon points="48,8 49,12 53,13 49,14 48,18 47,14 43,13 47,12"/>
  <polygon points="44,52 46,56 50,57 46,58 44,62 42,58 38,57 42,56"/>
</g>`
    : "";
  return svgFrame(spark + g);
};

const sword = (x: number, y: number, rot: number) =>
  `<g transform="translate(${x},${y}) rotate(${rot})">
  <rect x="-2" y="-24" width="4" height="28" rx="1" fill="#e2e8f0"/>
  <polygon points="0,-28 -5,-20 5,-20" fill="#94a3b8"/>
</g>`;

/** Loop */
export const SPRITE_IDLE = [
  body({
    armL: `<path d="M14 40 L6 46" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 40 L48 48" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(48, 48, 35),
  }),
  body({
    armL: `<path d="M14 41 L5 47" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 41 L49 49" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(49, 49, 38),
  }),
  body({
    armL: `<path d="M14 40 L6 46" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 40 L48 48" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(48, 48, 35),
  }),
  body({
    armL: `<path d="M14 39 L7 45" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 39 L47 47" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(47, 47, 32),
  }),
];

/** One-shot slash */
export const SPRITE_ATTACK = [
  body({
    armL: `<path d="M14 42 L8 50" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 38 L52 34" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(52, 34, -20),
  }),
  body({
    armL: `<path d="M14 42 L8 50" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 36 L54 30" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(54, 30, -50),
  }),
  body({
    armL: `<path d="M14 42 L8 50" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 40 L58 42" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(58, 42, -95),
  }),
  body({
    armL: `<path d="M14 42 L8 50" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 40 L50 46" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(50, 46, 25),
  }),
];

/** Impact */
export const SPRITE_HIT = [
  body({
    armL: `<path d="M12 44 L4 48" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M40 44 L46 52" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(46, 52, 55),
    lean: -12,
    eyed: true,
  }),
  body({
    armL: `<path d="M10 45 L2 50" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M38 45 L44 54" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(44, 54, 60),
    lean: -18,
    eyed: true,
  }),
  body({
    armL: `<path d="M14 43 L6 49" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 43 L48 51" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(48, 51, 48),
    lean: -8,
    eyed: true,
  }),
  body({
    armL: `<path d="M14 42 L6 46" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 42 L48 48" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(48, 48, 38),
    lean: -4,
  }),
];

/** Victory */
export const SPRITE_WIN = [
  body({
    armL: `<path d="M14 36 L8 20" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 36 L48 18" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(48, 22, -70),
    lean: -4,
    sparkle: true,
  }),
  body({
    armL: `<path d="M14 34 L6 16" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 34 L50 14" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(50, 18, -75),
    lean: 0,
    sparkle: true,
  }),
  body({
    armL: `<path d="M14 35 L7 17" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 35 L49 15" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(49, 19, -72),
    lean: 3,
    sparkle: true,
  }),
  body({
    armL: `<path d="M14 36 L8 20" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>`,
    armR: `<path d="M42 36 L48 18" stroke="#312e81" stroke-width="5" stroke-linecap="round"/>` + sword(48, 22, -70),
    lean: -2,
    sparkle: true,
  }),
];

export type BattleAnim = "idle" | "attack" | "hit" | "win";

export const SPRITE_SET: Record<BattleAnim, string[]> = {
  idle: SPRITE_IDLE,
  attack: SPRITE_ATTACK,
  hit: SPRITE_HIT,
  win: SPRITE_WIN,
};
