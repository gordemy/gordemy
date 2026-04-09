"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getStudentAchievements } from "@/lib/achievements";
import {
  CHARACTERS, HATS, ACCESSORIES, FRAMES,
  DEFAULT_AVATAR, isUnlocked, unlockLabel,
  RARITY_COLORS, RARITY_GLOW, RARITY_LABEL_COLOR, AURA_STYLES, FRAME_STYLES,
  normalizeAvatarFull,
  type AvatarConfig, type AvatarItem,
} from "@/lib/avatar";
import ModularHero from "@/components/ModularHero";
import { normalizeToEquip, EQUIPMENT_BY_SLOT, type EquipmentPiece } from "@/lib/equipment";

// ─── Avatar Preview ───────────────────────────────────────────────────────────

function mapEquipItem(p: EquipmentPiece): AvatarItem {
  return {
    id: p.id,
    emoji: p.emoji,
    name: p.name,
    unlock: p.unlock as AvatarItem["unlock"],
    rarity: p.rarity,
    description: p.description,
  };
}

function AvatarPreview({
  config, name, level, title, animated = false
}: {
  config: AvatarConfig; name: string; level: number; title: string; animated?: boolean
}) {
  const full = normalizeAvatarFull(config);
  const equip = normalizeToEquip(full);
  const hat = HATS.find(h => h.id === config.hat);
  const acc = ACCESSORIES.find(a => a.id === config.accessory);
  const auraStyle = AURA_STYLES[config.aura] || AURA_STYLES.none || "";
  const frameStyle = FRAME_STYLES[config.frame] || FRAME_STYLES.none;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Frame + Aura + Modular hero */}
      <motion.div
        className={`relative flex h-44 w-44 items-center justify-center rounded-3xl border-4 ${frameStyle} ${auraStyle} overflow-hidden`}
        animate={animated ? { scale: [1, 1.02, 1] } : {}}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      >
        {config.aura !== "none" && config.aura !== "aura_none" && (
          <div className={`absolute inset-0 opacity-40 ${auraStyle} blur-xl`} />
        )}

        <motion.div
          className="relative z-10 flex flex-col items-center justify-center"
          animate={animated ? { y: [0, -3, 0] } : {}}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        >
          <ModularHero
            equip={equip}
            hatEmoji={hat && hat.id !== "none" ? hat.emoji : undefined}
            height={168}
            className="scale-95"
          />
        </motion.div>

        {acc && acc.emoji && acc.id !== "none" && (
          <div className="absolute bottom-1 right-1 z-20 text-xl opacity-90">
            {acc.emoji}
          </div>
        )}

        <div className="absolute top-1 right-1 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-gordemy-blue/30 bg-gordemy-bg/80 text-xs font-black text-gordemy-blue">
          {level}
        </div>
      </motion.div>

      {/* Name + title */}
      <div className="text-center">
        <div className="font-black text-white text-lg leading-tight">{name}</div>
        <div className="text-gordemy-muted text-sm">{title}</div>
      </div>
    </div>
  );
}

// ─── Item Grid ─────────────────────────────────────────────────────────────────

function ItemGrid({
  items, selected, onSelect, ctx
}: {
  items: AvatarItem[];
  selected: string;
  onSelect: (id: string) => void;
  ctx: { level: number; gems: number; streak: number; earnedAchievements: string[] };
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(item => {
        const unlocked = isUnlocked(item, ctx);
        const isSelected = selected === item.id;

        return (
          <motion.button
            key={item.id}
            onClick={() => unlocked && onSelect(item.id)}
            whileHover={unlocked ? { scale: 1.08 } : {}}
            whileTap={unlocked ? { scale: 0.95 } : {}}
            className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
              isSelected
                ? `${RARITY_COLORS[item.rarity]} bg-gordemy-card/80 ${RARITY_GLOW[item.rarity]}`
                : unlocked
                ? "border-gordemy-border bg-gordemy-card hover:border-gordemy-muted/40"
                : "border-gordemy-border/30 bg-gordemy-bg/30 opacity-50 cursor-not-allowed"
            }`}
          >
            {/* Rarity dot */}
            <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
              item.rarity === "legendary" ? "bg-gordemy-orange" :
              item.rarity === "epic" ? "bg-gordemy-purple" :
              item.rarity === "rare" ? "bg-gordemy-blue" :
              item.rarity === "uncommon" ? "bg-emerald-500" : "bg-gordemy-border"
            }`} />

            {/* Emoji */}
            <div className={`text-2xl ${!unlocked ? "grayscale" : ""}`}>
              {item.emoji || "·"}
            </div>

            {/* Name */}
            <div className={`text-[10px] text-center leading-tight font-semibold ${
              isSelected ? RARITY_LABEL_COLOR[item.rarity] : "text-gordemy-muted"
            }`}>
              {item.name.length > 8 ? item.name.slice(0, 7) + "…" : item.name}
            </div>

            {/* Lock icon */}
            {!unlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-gordemy-bg/60 rounded-xl">
                <div className="text-center">
                  <div className="text-sm">🔒</div>
                  <div className="text-[9px] text-gordemy-muted leading-tight px-0.5">
                    {unlockLabel(item.unlock)}
                  </div>
                </div>
              </div>
            )}

            {/* Selected checkmark */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-gordemy-green rounded-full flex items-center justify-center text-xs font-black text-white"
              >
                ✓
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "character" | "hat" | "accessory" | "aura" | "frame";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "character", label: "Герой",       emoji: "🧑" },
  { id: "hat",       label: "Шапка",       emoji: "🎓" },
  { id: "accessory", label: "Аксесуар",    emoji: "⚔️" },
  { id: "aura",      label: "Аура",        emoji: "✨" },
  { id: "frame",     label: "Рамка",       emoji: "🖼️" },
];

export default function AvatarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("character");
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [savedConfig, setSavedConfig] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [studentCtx, setStudentCtx] = useState({ level: 1, gems: 0, streak: 0, earnedAchievements: [] as string[] });
  const [studentName, setStudentName] = useState("Гравець");
  const [studentTitle, setStudentTitle] = useState("🌱 Новачок");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tooltip, setTooltip] = useState<AvatarItem | null>(null);

  const hasChanges = JSON.stringify(config) !== JSON.stringify(savedConfig);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function init() {
    const { data: stu } = await supabase
      .from("students")
      .select("name, level, gems, streak, avatar_data")
      .eq("id", user!.id)
      .single();

    const achievements = await getStudentAchievements(user!.id);

    if (stu) {
      setStudentName(stu.name || "Гравець");
      setStudentCtx({ level: stu.level || 1, gems: stu.gems || 0, streak: stu.streak || 0, earnedAchievements: achievements });

      // Title
      const level = stu.level || 1;
      let title = "🌱 Новачок";
      if (level >= 20) title = "🔱 Легенда НМТ";
      else if (level >= 15) title = "💎 Майстер";
      else if (level >= 10) title = "🏆 Чемпіон";
      else if (level >= 7)  title = "⭐ Досвідчений";
      else if (level >= 5)  title = "🎓 Учень";
      else if ((stu.streak || 0) >= 10) title = "🔥 Залізна воля";
      setStudentTitle(title);

      if (stu.avatar_data) {
        const av = typeof stu.avatar_data === "string" ? JSON.parse(stu.avatar_data) : stu.avatar_data;
        const merged = normalizeAvatarFull({ ...DEFAULT_AVATAR, ...av });
        setConfig(merged);
        setSavedConfig(merged);
      }
    }
    setLoading(false);
  }

  async function saveAvatar() {
    setSaving(true);
    await supabase
      .from("students")
      .update({ avatar_data: normalizeAvatarFull(config) })
      .eq("id", user!.id);
    setSavedConfig({ ...config });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateConfig(key: keyof AvatarConfig, value: string) {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  const currentItems: AvatarItem[] =
    tab === "character" ? CHARACTERS :
    tab === "hat" ? HATS :
    tab === "accessory" ? ACCESSORIES :
    tab === "aura" ? EQUIPMENT_BY_SLOT.aura.map(mapEquipItem) :
    FRAMES;

  const currentValue: string =
    tab === "character" ? config.character :
    tab === "hat" ? config.hat :
    tab === "accessory" ? config.accessory :
    tab === "aura" ? config.aura : config.frame;

  const unlockedCount = currentItems.filter(i => isUnlocked(i, studentCtx)).length;

  if (authLoading || loading) {
    return (
      <div className="max-w-[600px] mx-auto px-6 py-12 text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="text-5xl inline-block mb-4">⚙️</motion.div>
        <p className="text-gordemy-muted">Завантаження твого героя...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto px-6 py-8 pb-32">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">🎨 Мій Герой</h1>
          <p className="text-gordemy-muted text-sm mt-1">Налаштуй свого персонажа</p>
        </div>
        <div className="text-right">
          <div className="text-gordemy-orange font-black text-lg">{studentCtx.gems} 💎</div>
          <div className="text-gordemy-muted text-xs">Рівень {studentCtx.level}</div>
        </div>
      </motion.div>

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center mb-8"
      >
        <AvatarPreview
          config={config}
          name={studentName}
          level={studentCtx.level}
          title={studentTitle}
          animated
        />

        {/* Streak + level badges */}
        <div className="flex gap-3 mt-4">
          <div className="flex items-center gap-1.5 bg-gordemy-card border border-gordemy-border rounded-full px-3 py-1">
            <span className="text-sm">🔥</span>
            <span className="text-gordemy-orange font-bold text-sm">{studentCtx.streak} днів</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gordemy-card border border-gordemy-border rounded-full px-3 py-1">
            <span className="text-sm">⭐</span>
            <span className="text-gordemy-blue font-bold text-sm">Рівень {studentCtx.level}</span>
          </div>
        </div>
      </motion.div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
              tab === t.id
                ? "border-gordemy-blue/60 bg-gordemy-blue/20 text-gordemy-blue"
                : "border-gordemy-border text-gordemy-muted hover:text-white hover:border-gordemy-muted/40"
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Unlocked count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-gordemy-muted text-xs">
          Відкрито: <span className="text-white font-bold">{unlockedCount}</span>/{currentItems.length}
        </span>
        <div className="flex gap-1">
          {(["common","uncommon","rare","epic","legendary"] as const).map(r => (
            <span key={r} className={`text-xs font-bold ${RARITY_LABEL_COLOR[r]}`}>
              {r === "common" ? "⚪" : r === "uncommon" ? "🟢" : r === "rare" ? "🔵" : r === "epic" ? "🟣" : "🟠"}
            </span>
          ))}
        </div>
      </div>

      {/* Item grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18 }}
        >
          <ItemGrid
            items={currentItems}
            selected={currentValue}
            onSelect={id => updateConfig(
              tab === "character" ? "character" :
              tab === "hat" ? "hat" :
              tab === "accessory" ? "accessory" :
              tab === "aura" ? "aura" : "frame",
              id
            )}
            ctx={studentCtx}
          />
        </motion.div>
      </AnimatePresence>

      {/* Tooltip for selected item */}
      {(() => {
        const selected = currentItems.find(i => i.id === currentValue);
        if (!selected || !selected.description) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-gordemy-card border border-gordemy-border rounded-xl p-3 text-center"
          >
            <div className={`text-sm font-bold ${RARITY_LABEL_COLOR[selected.rarity]}`}>{selected.name}</div>
            <div className="text-gordemy-muted text-xs mt-0.5">{selected.description}</div>
          </motion.div>
        );
      })()}

      {/* Unlock progress hint */}
      {studentCtx.level < 20 && (
        <div className="mt-4 bg-gordemy-bg/60 border border-gordemy-border/60 rounded-xl p-4">
          <div className="text-gordemy-muted text-xs font-semibold mb-2">🔓 Наступне розблокування</div>
          {(() => {
            const next = currentItems
              .filter(i => {
                const u = i.unlock;
                if (u.type === "level") return u.value > studentCtx.level;
                if (u.type === "streak") return u.value > studentCtx.streak;
                return false;
              })
              .sort((a, b) => {
                const av = a.unlock.type === "level" ? (a.unlock as any).value : (a.unlock as any).value + 100;
                const bv = b.unlock.type === "level" ? (b.unlock as any).value : (b.unlock as any).value + 100;
                return av - bv;
              })[0];
            if (!next) return <div className="text-gordemy-muted text-xs">Все відкрито! 🎉</div>;
            return (
              <div className="flex items-center gap-3">
                <div className="text-2xl">{next.emoji || "?"}</div>
                <div>
                  <div className="text-white font-semibold text-sm">{next.name}</div>
                  <div className={`text-xs ${RARITY_LABEL_COLOR[next.rarity]}`}>{unlockLabel(next.unlock)}</div>
                </div>
                {next.unlock.type === "level" && (
                  <div className="ml-auto">
                    <div className="text-xs text-gordemy-muted">До розблок.</div>
                    <div className="text-gordemy-blue font-bold text-sm">{(next.unlock as any).value - studentCtx.level} рів.</div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Save button — sticky */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-0 right-0 flex justify-center px-6 z-50"
          >
            <button
              onClick={saveAvatar}
              disabled={saving}
              className="w-full max-w-[400px] py-4 rounded-2xl font-black text-lg bg-gradient-to-r from-gordemy-blue to-gordemy-purple text-white shadow-2xl hover:opacity-90 disabled:opacity-60 transition-all"
            >
              {saving ? "Зберігаємо..." : saved ? "✓ Збережено!" : "💾 Зберегти героя"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Already saved state */}
      {!hasChanges && (
        <div className="mt-6 text-center text-gordemy-muted text-sm">
          ✅ Всі зміни збережені
        </div>
      )}
    </div>
  );
}
