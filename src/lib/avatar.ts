// ─────────────────────────────────────────────────────────────────────────────
// Gordemy Avatar System
// ─────────────────────────────────────────────────────────────────────────────

export type UnlockCondition =
  | { type: "free" }
  | { type: "level"; value: number }
  | { type: "gems"; value: number }
  | { type: "achievement"; key: string }
  | { type: "streak"; value: number };

export interface AvatarItem {
  id: string;
  emoji: string;
  name: string;
  unlock: UnlockCondition;
  rarity: "common" | "rare" | "epic" | "legendary";
  description?: string;
}

// ─── Characters (base) ────────────────────────────────────────────────────────

export const CHARACTERS: AvatarItem[] = [
  { id: "student",  emoji: "🧑‍🎓", name: "Студент",       unlock: { type: "free" },            rarity: "common",    description: "Класичний учень-відмінник" },
  { id: "wizard",   emoji: "🧙",   name: "Маг Знань",    unlock: { type: "level", value: 5 },  rarity: "rare",      description: "Опанував магію формул" },
  { id: "ninja",    emoji: "🥷",   name: "Ніндзя",       unlock: { type: "level", value: 8 },  rarity: "rare",      description: "Непомітний, але смертельний" },
  { id: "hero",     emoji: "🦸",   name: "Супергерой",   unlock: { type: "level", value: 12 }, rarity: "epic",      description: "Рятує від поганих оцінок" },
  { id: "knight",   emoji: "🧝",   name: "Ельф",         unlock: { type: "level", value: 10 }, rarity: "epic",      description: "Мудрий і точний" },
  { id: "robot",    emoji: "🤖",   name: "Кіборг",       unlock: { type: "gems", value: 50 },  rarity: "epic",      description: "Процесує знання x100" },
  { id: "alien",    emoji: "👾",   name: "Прибулець",    unlock: { type: "gems", value: 80 },  rarity: "legendary", description: "Знання з іншого виміру" },
  { id: "dragon",   emoji: "🐲",   name: "Дракон",       unlock: { type: "level", value: 20 }, rarity: "legendary", description: "Легенда НМТ" },
];

// ─── Hats / Headwear ─────────────────────────────────────────────────────────

export const HATS: AvatarItem[] = [
  { id: "none",       emoji: "",   name: "Без шапки",     unlock: { type: "free" },              rarity: "common"  },
  { id: "cap",        emoji: "🎓", name: "Академічна",    unlock: { type: "free" },              rarity: "common",  description: "Класика відмінника" },
  { id: "crown",      emoji: "👑", name: "Корона",        unlock: { type: "level", value: 15 }, rarity: "legendary", description: "Для справжнього монарха" },
  { id: "wizard_hat", emoji: "🎩", name: "Циліндр",       unlock: { type: "level", value: 7 },  rarity: "rare" },
  { id: "helmet",     emoji: "⛑️", name: "Шолом",         unlock: { type: "gems", value: 30 },  rarity: "rare" },
  { id: "halo",       emoji: "😇", name: "Німб",          unlock: { type: "streak", value: 14 },rarity: "epic",    description: "За 14 днів серії" },
  { id: "fire_head",  emoji: "🔥", name: "Вогняний",      unlock: { type: "streak", value: 7 }, rarity: "rare",    description: "За тиждень серії" },
  { id: "star_head",  emoji: "⭐", name: "Зірка",         unlock: { type: "achievement", key: "tasks_100" }, rarity: "epic" },
];

// ─── Accessories / Items ──────────────────────────────────────────────────────

export const ACCESSORIES: AvatarItem[] = [
  { id: "none",       emoji: "",   name: "Без аксесуара",  unlock: { type: "free" },             rarity: "common" },
  { id: "sword",      emoji: "⚔️", name: "Меч знань",      unlock: { type: "level", value: 6 }, rarity: "rare" },
  { id: "shield",     emoji: "🛡️", name: "Щит",            unlock: { type: "level", value: 4 }, rarity: "common" },
  { id: "wand",       emoji: "🪄", name: "Чарівна паличка",unlock: { type: "level", value: 8 }, rarity: "rare" },
  { id: "book",       emoji: "📚", name: "Книга знань",    unlock: { type: "free" },             rarity: "common" },
  { id: "lightning",  emoji: "⚡", name: "Блискавка",      unlock: { type: "gems", value: 40 }, rarity: "epic",   description: "Для блискавичних відповідей" },
  { id: "gem",        emoji: "💎", name: "Сапфір",         unlock: { type: "gems", value: 60 }, rarity: "epic" },
  { id: "trophy",     emoji: "🏆", name: "Трофей",         unlock: { type: "achievement", key: "tasks_500" }, rarity: "legendary" },
];

// ─── Auras (background effect) ────────────────────────────────────────────────

export const AURAS: AvatarItem[] = [
  { id: "none",    emoji: "⬛", name: "Стандартна",    unlock: { type: "free" },              rarity: "common",  description: "Чистий фон" },
  { id: "blue",    emoji: "🔵", name: "Синя аура",     unlock: { type: "level", value: 5 },  rarity: "rare",    description: "Аура інтелекту" },
  { id: "fire",    emoji: "🔴", name: "Вогняна аура",  unlock: { type: "streak", value: 7 }, rarity: "epic",    description: "Розпалена серія" },
  { id: "purple",  emoji: "🟣", name: "Фіолетова",     unlock: { type: "level", value: 10 }, rarity: "epic" },
  { id: "gold",    emoji: "🟡", name: "Золота аура",   unlock: { type: "level", value: 20 }, rarity: "legendary", description: "Легенда НМТ" },
  { id: "rainbow", emoji: "🌈", name: "Веселкова",     unlock: { type: "gems", value: 100 }, rarity: "legendary", description: "Рідкісна і неповторна" },
  { id: "storm",   emoji: "⚡", name: "Гроза",         unlock: { type: "gems", value: 70 },  rarity: "epic" },
  { id: "ice",     emoji: "❄️", name: "Крижана",       unlock: { type: "achievement", key: "streak_30" }, rarity: "legendary", description: "За 30 днів серії" },
];

// ─── Frames (profile border) ──────────────────────────────────────────────────

export const FRAMES: AvatarItem[] = [
  { id: "none",     name: "Без рамки",       emoji: "⬜", unlock: { type: "free" },              rarity: "common"    },
  { id: "silver",   name: "Срібна",          emoji: "🔲", unlock: { type: "level", value: 3 },  rarity: "common"    },
  { id: "gold",     name: "Золота",          emoji: "🟨", unlock: { type: "level", value: 10 }, rarity: "rare"      },
  { id: "dragon",   name: "Дракон",          emoji: "🐉", unlock: { type: "level", value: 18 }, rarity: "legendary" },
  { id: "fire",     name: "Вогонь",          emoji: "🔥", unlock: { type: "streak", value: 14 },rarity: "epic"      },
  { id: "champion", name: "Чемпіон",         emoji: "🏆", unlock: { type: "achievement", key: "tasks_100" }, rarity: "epic" },
];

// ─── Avatar state ─────────────────────────────────────────────────────────────

export interface AvatarConfig {
  character: string;
  hat: string;
  accessory: string;
  aura: string;
  frame: string;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  character: "student",
  hat: "cap",
  accessory: "book",
  aura: "none",
  frame: "none",
};

// ─── Unlock checker ───────────────────────────────────────────────────────────

export function isUnlocked(
  item: AvatarItem,
  ctx: { level: number; gems: number; streak: number; earnedAchievements: string[] }
): boolean {
  const u = item.unlock;
  switch (u.type) {
    case "free":        return true;
    case "level":       return ctx.level >= u.value;
    case "gems":        return ctx.gems >= u.value;
    case "streak":      return ctx.streak >= u.value;
    case "achievement": return ctx.earnedAchievements.includes(u.key);
  }
}

export function unlockLabel(unlock: UnlockCondition): string {
  switch (unlock.type) {
    case "free":        return "Відкрито";
    case "level":       return `Рівень ${unlock.value}`;
    case "gems":        return `${unlock.value} 💎`;
    case "streak":      return `🔥 ${unlock.value} днів серії`;
    case "achievement": return `🎖️ Досягнення`;
  }
}

export const RARITY_COLORS: Record<string, string> = {
  common:    "border-gordemy-border/60",
  rare:      "border-gordemy-blue/50",
  epic:      "border-gordemy-purple/60",
  legendary: "border-gordemy-orange/70",
};

export const RARITY_GLOW: Record<string, string> = {
  common:    "",
  rare:      "shadow-gordemy-blue/30 shadow-md",
  epic:      "shadow-gordemy-purple/40 shadow-lg",
  legendary: "shadow-gordemy-orange/50 shadow-xl",
};

export const RARITY_LABEL_COLOR: Record<string, string> = {
  common:    "text-gordemy-muted",
  rare:      "text-gordemy-blue",
  epic:      "text-gordemy-purple",
  legendary: "text-gordemy-orange",
};

// Aura background gradients for preview
export const AURA_STYLES: Record<string, string> = {
  none:    "bg-gordemy-card",
  blue:    "bg-gradient-to-br from-gordemy-blue/30 to-gordemy-card",
  fire:    "bg-gradient-to-br from-red-600/30 to-gordemy-orange/20",
  purple:  "bg-gradient-to-br from-gordemy-purple/30 to-gordemy-card",
  gold:    "bg-gradient-to-br from-gordemy-orange/40 to-yellow-600/20",
  rainbow: "bg-gradient-to-br from-pink-500/30 via-gordemy-blue/20 to-gordemy-green/30",
  storm:   "bg-gradient-to-br from-yellow-400/30 to-gordemy-blue/20",
  ice:     "bg-gradient-to-br from-cyan-400/30 to-gordemy-blue/10",
};

export const FRAME_STYLES: Record<string, string> = {
  none:     "border-gordemy-border",
  silver:   "border-gordemy-muted/60",
  gold:     "border-gordemy-orange/70",
  dragon:   "border-gordemy-green/60",
  fire:     "border-red-500/70",
  champion: "border-gordemy-orange/80",
};
