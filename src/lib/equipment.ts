/**
 * Modular equipment system — slots, rarity, combat stats, visuals for layered hero.
 * Keeps avatar.ts free of circular imports.
 */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type EquipmentSlot =
  | "torso"
  | "weapon"
  | "hands"
  | "legs"
  | "face"
  | "aura"
  | "effect";

export type EquipmentUnlock =
  | { type: "free" }
  | { type: "level"; value: number }
  | { type: "gems"; value: number }
  | { type: "achievement"; key: string }
  | { type: "streak"; value: number };

/** Per-item numeric contributions (before rarity scaling). */
export interface StatBonuses {
  hp?: number;
  defense?: number;
  damagePct?: number;
  comboSpeed?: number;
  luck?: number;
  crit?: number;
  xpMult?: number;
  gemBonus?: number;
  chestLuck?: number;
  accuracy?: number;
}

export interface EquipmentVisual {
  torsoFill: string;
  torsoStroke: string;
  torsoAccent?: string;
  legFill: string;
  armFill: string;
  /** 0–1 silhouette emphasis for “armor identity” */
  torsoBulk?: number;
  weaponLength?: number;
  weaponAngle?: number;
  faceTint?: string;
  eyeStyle?: "dot" | "focused" | "glow";
  hatOffsetY?: number;
}

export interface EquipmentPiece {
  id: string;
  slot: EquipmentSlot;
  name: string;
  emoji: string;
  rarity: Rarity;
  unlock: EquipmentUnlock;
  description?: string;
  stats: StatBonuses;
  visual: EquipmentVisual;
}

export const RARITY_MULT: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.06,
  rare: 1.14,
  epic: 1.26,
  legendary: 1.42,
};

export const RARITY_ORDER: Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
];

function scaleStats(s: StatBonuses, r: Rarity): StatBonuses {
  const m = RARITY_MULT[r];
  const out: StatBonuses = {};
  if (s.hp != null) out.hp = Math.round(s.hp * m);
  if (s.defense != null) out.defense = Math.round(s.defense * m * 10) / 10;
  if (s.damagePct != null) out.damagePct = Math.round(s.damagePct * m * 100) / 100;
  if (s.comboSpeed != null) out.comboSpeed = Math.round(s.comboSpeed * m * 100) / 100;
  if (s.luck != null) out.luck = Math.round(s.luck * m * 100) / 100;
  if (s.crit != null) out.crit = Math.round(s.crit * m * 100) / 100;
  if (s.xpMult != null) out.xpMult = Math.round((1 + (s.xpMult - 1) * m) * 100) / 100;
  if (s.gemBonus != null) out.gemBonus = Math.round((1 + (s.gemBonus - 1) * m) * 100) / 100;
  if (s.chestLuck != null) out.chestLuck = Math.round(s.chestLuck * m * 100) / 100;
  if (s.accuracy != null) out.accuracy = Math.round(s.accuracy * m * 100) / 100;
  return out;
}

// ─── Catalog ───────────────────────────────────────────────────────────────

export const TORSO: EquipmentPiece[] = [
  {
    id: "torso_apprentice",
    slot: "torso",
    name: "Халат учня",
    emoji: "🥼",
    rarity: "common",
    unlock: { type: "free" },
    description: "Базовий одяг. Трохи HP.",
    stats: { hp: 12, defense: 1 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
      torsoBulk: 0.35,
    },
  },
  {
    id: "torso_leather",
    slot: "torso",
    name: "Шкіряний жилет",
    emoji: "🧥",
    rarity: "uncommon",
    unlock: { type: "level", value: 3 },
    stats: { hp: 22, defense: 2.5 },
    visual: {
      torsoFill: "#78350f",
      torsoStroke: "#451a03",
      torsoAccent: "#b45309",
      legFill: "#422006",
      armFill: "#92400e",
      torsoBulk: 0.45,
    },
  },
  {
    id: "torso_chain",
    slot: "torso",
    name: "Кольчуга",
    emoji: "🪙",
    rarity: "rare",
    unlock: { type: "level", value: 8 },
    stats: { hp: 38, defense: 5 },
    visual: {
      torsoFill: "#64748b",
      torsoStroke: "#334155",
      torsoAccent: "#94a3b8",
      legFill: "#1e293b",
      armFill: "#475569",
      torsoBulk: 0.55,
    },
  },
  {
    id: "torso_plate",
    slot: "torso",
    name: "Лати лицаря",
    emoji: "🛡️",
    rarity: "epic",
    unlock: { type: "level", value: 14 },
    stats: { hp: 58, defense: 8 },
    visual: {
      torsoFill: "#e2e8f0",
      torsoStroke: "#475569",
      torsoAccent: "#38bdf8",
      legFill: "#1e293b",
      armFill: "#94a3b8",
      torsoBulk: 0.72,
    },
  },
  {
    id: "torso_arcane",
    slot: "torso",
    name: "Мантія архімага",
    emoji: "✨",
    rarity: "legendary",
    unlock: { type: "gems", value: 120 },
    description: "Серце образу героя — сяйво та масивний силует.",
    stats: { hp: 45, defense: 5, luck: 0.08, xpMult: 1.12 },
    visual: {
      torsoFill: "#6d28d9",
      torsoStroke: "#4c1d95",
      torsoAccent: "#f0abfc",
      legFill: "#3b0764",
      armFill: "#7c3aed",
      torsoBulk: 0.65,
    },
  },
];

export const WEAPONS: EquipmentPiece[] = [
  {
    id: "wpn_wood",
    slot: "weapon",
    name: "Дерев’яний меч",
    emoji: "🗡️",
    rarity: "common",
    unlock: { type: "free" },
    stats: { damagePct: 4 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
      weaponLength: 38,
      weaponAngle: -35,
    },
  },
  {
    id: "wpn_iron",
    slot: "weapon",
    name: "Стальний клинок",
    emoji: "⚔️",
    rarity: "uncommon",
    unlock: { type: "level", value: 4 },
    stats: { damagePct: 9 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
      weaponLength: 44,
      weaponAngle: -40,
    },
  },
  {
    id: "wpn_crystal",
    slot: "weapon",
    name: "Кришталевий посох",
    emoji: "🔮",
    rarity: "rare",
    unlock: { type: "level", value: 10 },
    stats: { damagePct: 12, xpMult: 1.06 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
      weaponLength: 48,
      weaponAngle: -15,
    },
  },
  {
    id: "wpn_void",
    slot: "weapon",
    name: "Коса безодні",
    emoji: "🌑",
    rarity: "legendary",
    unlock: { type: "achievement", key: "tasks_100" },
    stats: { damagePct: 22, crit: 0.06 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
      weaponLength: 56,
      weaponAngle: -55,
    },
  },
];

export const HANDS_EQ: EquipmentPiece[] = [
  {
    id: "hands_bare",
    slot: "hands",
    name: "Без рукавиць",
    emoji: "✋",
    rarity: "common",
    unlock: { type: "free" },
    stats: { comboSpeed: 1 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
    },
  },
  {
    id: "hands_leather",
    slot: "hands",
    name: "Шкіряні рукавиці",
    emoji: "🧤",
    rarity: "uncommon",
    unlock: { type: "free" },
    stats: { comboSpeed: 1.05, defense: 0.5 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#57534e",
    },
  },
  {
    id: "hands_swift",
    slot: "hands",
    name: "Обмотки швидкості",
    emoji: "⚡",
    rarity: "rare",
    unlock: { type: "streak", value: 5 },
    stats: { comboSpeed: 1.14 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#fbbf24",
    },
  },
  {
    id: "hands_gauntlet",
    slot: "hands",
    name: "Сталеві рукавиці",
    emoji: "🥊",
    rarity: "epic",
    unlock: { type: "gems", value: 55 },
    stats: { comboSpeed: 1.08, defense: 2, damagePct: 4 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#94a3b8",
    },
  },
];

export const LEGS_EQ: EquipmentPiece[] = [
  {
    id: "legs_cloth",
    slot: "legs",
    name: "Тканинні штани",
    emoji: "👖",
    rarity: "common",
    unlock: { type: "free" },
    stats: { defense: 0.5, comboSpeed: 1.02 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
    },
  },
  {
    id: "legs_leather",
    slot: "legs",
    name: "Шкіряні чоботи",
    emoji: "🥾",
    rarity: "uncommon",
    unlock: { type: "level", value: 2 },
    stats: { defense: 2, comboSpeed: 1.04 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#422006",
      armFill: "#4338ca",
    },
  },
  {
    id: "legs_plated",
    slot: "legs",
    name: "Латні наголінники",
    emoji: "🦿",
    rarity: "epic",
    unlock: { type: "level", value: 12 },
    stats: { defense: 5, hp: 10 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#475569",
      armFill: "#4338ca",
    },
  },
];

export const FACES: EquipmentPiece[] = [
  {
    id: "face_calm",
    slot: "face",
    name: "Спокійний погляд",
    emoji: "😌",
    rarity: "common",
    unlock: { type: "free" },
    stats: { accuracy: 0.02, xpMult: 1.02 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
      faceTint: "#fde68a",
      eyeStyle: "dot",
    },
  },
  {
    id: "face_focus",
    slot: "face",
    name: "Фокус НМТ",
    emoji: "🎯",
    rarity: "uncommon",
    unlock: { type: "level", value: 5 },
    stats: { accuracy: 0.05, xpMult: 1.04 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
      faceTint: "#fcd34d",
      eyeStyle: "focused",
    },
  },
  {
    id: "face_glow",
    slot: "face",
    name: "Очі ясності",
    emoji: "✨",
    rarity: "rare",
    unlock: { type: "level", value: 9 },
    stats: { accuracy: 0.07, xpMult: 1.07 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
      faceTint: "#fef3c7",
      eyeStyle: "glow",
    },
  },
  {
    id: "face_war",
    slot: "face",
    name: "Бойова розмальовка",
    emoji: "💢",
    rarity: "epic",
    unlock: { type: "gems", value: 40 },
    stats: { accuracy: 0.04, damagePct: 6, crit: 0.03 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
      faceTint: "#fca5a5",
      eyeStyle: "focused",
    },
  },
];

/** Aura slot — stats + reuse colors from avatar AURA ids where possible */
export const AURA_EQ: EquipmentPiece[] = [
  {
    id: "aura_none",
    slot: "aura",
    name: "Без аури",
    emoji: "⬛",
    rarity: "common",
    unlock: { type: "free" },
    stats: {},
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
    },
  },
  {
    id: "aura_blue",
    slot: "aura",
    name: "Синя аура",
    emoji: "🔵",
    rarity: "uncommon",
    unlock: { type: "level", value: 4 },
    stats: { luck: 0.04, chestLuck: 0.02, xpMult: 1.03 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
    },
  },
  {
    id: "aura_fire",
    slot: "aura",
    name: "Вогняна аура",
    emoji: "🔥",
    rarity: "rare",
    unlock: { type: "streak", value: 7 },
    stats: { luck: 0.06, comboSpeed: 1.06, chestLuck: 0.03 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
    },
  },
  {
    id: "aura_gold",
    slot: "aura",
    name: "Золота удача",
    emoji: "🌟",
    rarity: "legendary",
    unlock: { type: "level", value: 18 },
    stats: { luck: 0.14, gemBonus: 1.15, chestLuck: 0.1 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
    },
  },
];

export const EFFECTS: EquipmentPiece[] = [
  {
    id: "effect_none",
    slot: "effect",
    name: "Без ефекту",
    emoji: "➖",
    rarity: "common",
    unlock: { type: "free" },
    stats: {},
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
    },
  },
  {
    id: "effect_spark",
    slot: "effect",
    name: "Іскри",
    emoji: "✦",
    rarity: "uncommon",
    unlock: { type: "free" },
    stats: { crit: 0.02, chestLuck: 0.02 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
    },
  },
  {
    id: "effect_sigil",
    slot: "effect",
    name: "Сигіл криту",
    emoji: "〽️",
    rarity: "rare",
    unlock: { type: "level", value: 11 },
    stats: { crit: 0.06, damagePct: 3 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
    },
  },
  {
    id: "effect_prism",
    slot: "effect",
    name: "Призма фортуни",
    emoji: "🎰",
    rarity: "legendary",
    unlock: { type: "gems", value: 90 },
    stats: { crit: 0.08, luck: 0.1, chestLuck: 0.12 },
    visual: {
      torsoFill: "#4f46e5",
      torsoStroke: "#312e81",
      legFill: "#312e81",
      armFill: "#4338ca",
    },
  },
];

const ALL_PIECES: EquipmentPiece[] = [
  ...TORSO,
  ...WEAPONS,
  ...HANDS_EQ,
  ...LEGS_EQ,
  ...FACES,
  ...AURA_EQ,
  ...EFFECTS,
];

const BY_ID = new Map(ALL_PIECES.map((p) => [p.id, p]));

export function getPiece(id: string): EquipmentPiece | undefined {
  return BY_ID.get(id);
}

export const EQUIPMENT_BY_SLOT: Record<EquipmentSlot, EquipmentPiece[]> = {
  torso: TORSO,
  weapon: WEAPONS,
  hands: HANDS_EQ,
  legs: LEGS_EQ,
  face: FACES,
  aura: AURA_EQ,
  effect: EFFECTS,
};

export function starterInventoryIds(): string[] {
  return ALL_PIECES.filter((p) => p.unlock.type === "free").map((p) => p.id);
}

export interface HeroCombatStats {
  maxHp: number;
  /** 0–0.55 approx mitigation */
  defenseMitigation: number;
  damageMult: number;
  comboSpeed: number;
  luck: number;
  critChance: number;
  xpMult: number;
  gemBonus: number;
  chestLuck: number;
  accuracy: number;
  /** Legacy-style combo damage multiplier for gamification.ts */
  comboDamageMult: number;
}

export interface AvatarEquipConfig {
  torso: string;
  weapon: string;
  hands: string;
  legs: string;
  face: string;
  aura: string;
  effect: string;
}

/** Build equip slots from persisted avatar fields (after legacy migration in avatar.ts). */
export function normalizeToEquip(c: {
  torso?: string;
  weapon?: string;
  hands?: string;
  legs?: string;
  face?: string;
  aura?: string;
  effect?: string;
}): AvatarEquipConfig {
  return {
    torso: c.torso || "torso_apprentice",
    weapon: c.weapon || "wpn_wood",
    hands: c.hands || "hands_bare",
    legs: c.legs || "legs_cloth",
    face: c.face || "face_calm",
    aura: c.aura?.startsWith("aura_") ? c.aura : "aura_none",
    effect: c.effect || "effect_none",
  };
}

export function calcHeroStats(equip: AvatarEquipConfig): HeroCombatStats {
  const slots: EquipmentSlot[] = [
    "torso",
    "weapon",
    "hands",
    "legs",
    "face",
    "aura",
    "effect",
  ];
  let hp = 72;
  let defensePts = 0;
  let damagePct = 0;
  let comboSpeed = 1;
  let luck = 0.04;
  let crit = 0.04;
  let xpMult = 1;
  let gemBonus = 1;
  let chestLuck = 0.02;
  let accuracy = 0;

  for (const slot of slots) {
    const id = equip[slot];
    const piece = getPiece(id);
    if (!piece) continue;
    const st = scaleStats(piece.stats, piece.rarity);
    if (st.hp) hp += st.hp;
    if (st.defense) defensePts += st.defense;
    if (st.damagePct) damagePct += st.damagePct;
    if (st.comboSpeed) comboSpeed *= st.comboSpeed;
    if (st.luck) luck += st.luck;
    if (st.crit) crit += st.crit;
    if (st.xpMult) xpMult *= st.xpMult;
    if (st.gemBonus) gemBonus *= st.gemBonus;
    if (st.chestLuck) chestLuck += st.chestLuck;
    if (st.accuracy) accuracy += st.accuracy;
  }

  hp = Math.max(48, Math.round(hp));
  const defenseMitigation = Math.min(
    0.52,
    defensePts * 0.028 + defensePts * defensePts * 0.00015,
  );
  crit = Math.min(0.42, crit);
  luck = Math.min(0.55, luck);
  chestLuck = Math.min(0.45, chestLuck);
  accuracy = Math.min(0.22, accuracy);
  const damageMult = 1 + damagePct / 100;
  const comboDamageMult = Math.round(damageMult * comboSpeed * 100) / 100;

  return {
    maxHp: hp,
    defenseMitigation,
    damageMult,
    comboSpeed: Math.round(comboSpeed * 100) / 100,
    luck: Math.round(luck * 1000) / 1000,
    critChance: Math.round(crit * 1000) / 1000,
    xpMult: Math.round(xpMult * 100) / 100,
    gemBonus: Math.round(gemBonus * 100) / 100,
    chestLuck: Math.round(chestLuck * 1000) / 1000,
    accuracy: Math.round(accuracy * 1000) / 1000,
    comboDamageMult,
  };
}

/** Merge layered visuals — torso drives identity; other slots override where relevant. */
export function resolveHeroVisual(equip: AvatarEquipConfig): EquipmentVisual {
  const torso = getPiece(equip.torso) ?? TORSO[0];
  const weapon = getPiece(equip.weapon) ?? WEAPONS[0];
  const hands = getPiece(equip.hands) ?? HANDS_EQ[0];
  const legs = getPiece(equip.legs) ?? LEGS_EQ[0];
  const face = getPiece(equip.face) ?? FACES[0];
  const v = { ...torso.visual };
  v.legFill = legs.visual.legFill;
  v.armFill = hands.visual.armFill;
  v.weaponLength = weapon.visual.weaponLength ?? v.weaponLength ?? 40;
  v.weaponAngle = weapon.visual.weaponAngle ?? v.weaponAngle ?? -38;
  v.faceTint = face.visual.faceTint ?? v.faceTint;
  v.eyeStyle = face.visual.eyeStyle ?? v.eyeStyle ?? "dot";
  v.hatOffsetY = face.visual.hatOffsetY ?? v.hatOffsetY;
  return v;
}

export function auraColorForId(auraId: string): {
  glow: string;
  rim: string;
  particles: string;
} {
  switch (auraId) {
    case "aura_fire":
      return { glow: "#f97316", rim: "#ea580c", particles: "#fdba74" };
    case "aura_gold":
      return { glow: "#eab308", rim: "#ca8a04", particles: "#fde047" };
    case "aura_blue":
      return { glow: "#3b82f6", rim: "#2563eb", particles: "#93c5fd" };
    default:
      return { glow: "transparent", rim: "transparent", particles: "#94a3b8" };
  }
}

export function effectParticlesForId(effectId: string): boolean {
  return effectId !== "effect_none";
}

export function isEquipmentUnlocked(
  piece: EquipmentPiece,
  ctx: {
    level: number;
    gems: number;
    streak: number;
    achievements: string[];
  },
): boolean {
  const u = piece.unlock;
  if (u.type === "free") return true;
  if (u.type === "level") return ctx.level >= u.value;
  if (u.type === "gems") return ctx.gems >= u.value;
  if (u.type === "streak") return ctx.streak >= u.value;
  if (u.type === "achievement") return ctx.achievements.includes(u.key);
  return false;
}

export function canUsePiece(
  piece: EquipmentPiece,
  ctx: {
    level: number;
    gems: number;
    streak: number;
    achievements: string[];
  },
  inventory: string[],
): boolean {
  return inventory.includes(piece.id) || isEquipmentUnlocked(piece, ctx);
}

/** Simulate chest tier with luck (for UI demo). */
export function rollChestTier(luck: number, chestLuck: number): string {
  const roll = Math.random() + luck * 0.12 + chestLuck * 0.18;
  if (roll > 0.92) return "legendary";
  if (roll > 0.78) return "epic";
  if (roll > 0.55) return "rare";
  if (roll > 0.35) return "uncommon";
  return "common";
}
