"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getStudentAchievements } from "@/lib/achievements";
import ModularHero from "@/components/ModularHero";
import {
  DEFAULT_AVATAR,
  normalizeAvatarFull,
  calcHeroCombat,
  RARITY_LABEL_COLOR,
  type AvatarConfig,
} from "@/lib/avatar";
import {
  EQUIPMENT_BY_SLOT,
  getPiece,
  normalizeToEquip,
  starterInventoryIds,
  isEquipmentUnlocked,
  canUsePiece,
  rollChestTier,
  RARITY_ORDER,
  type EquipmentPiece,
  type EquipmentSlot,
} from "@/lib/equipment";
import type { Rarity } from "@/lib/equipment";

const SLOTS: { id: EquipmentSlot; label: string; emoji: string }[] = [
  { id: "torso", label: "Торс", emoji: "🛡️" },
  { id: "weapon", label: "Зброя", emoji: "⚔️" },
  { id: "hands", label: "Руки", emoji: "🧤" },
  { id: "legs", label: "Ноги", emoji: "🦿" },
  { id: "face", label: "Обличчя", emoji: "😎" },
  { id: "aura", label: "Аура", emoji: "✨" },
  { id: "effect", label: "Ефект", emoji: "〽️" },
];

function slotKey(slot: EquipmentSlot): keyof AvatarConfig {
  return slot;
}

const RARITY_UI: Record<Rarity, string> = {
  common: "⚪",
  uncommon: "🟢",
  rare: "🔵",
  epic: "🟣",
  legendary: "🟠",
};

export default function BattleEquipmentDemo() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<EquipmentSlot>("torso");
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [inventory, setInventory] = useState<string[]>(starterInventoryIds());
  const [equipVersion, setEquipVersion] = useState(0);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready">(
    "loading",
  );
  const [saveMsg, setSaveMsg] = useState("");
  const [enemyHp, setEnemyHp] = useState(200);
  const [playerHp, setPlayerHp] = useState(100);
  const [combo, setCombo] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [chestLog, setChestLog] = useState<string[]>([]);

  const normalized = useMemo(() => normalizeAvatarFull(config), [config]);
  const equip = useMemo(() => normalizeToEquip(normalized), [normalized]);
  const stats = useMemo(() => calcHeroCombat(normalized), [normalized]);

  useEffect(() => {
    setPlayerHp(stats.maxHp);
  }, [stats.maxHp]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadState("ready");
      setInventory(starterInventoryIds());
      setConfig(normalizeAvatarFull(DEFAULT_AVATAR));
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("students")
        .select("avatar_data, equipment_inventory, level, gems, streak")
        .eq("id", user.id)
        .single();
      const raw =
        data?.avatar_data && typeof data.avatar_data === "object"
          ? (data.avatar_data as Partial<AvatarConfig>)
          : {};
      let inv: string[] = Array.isArray(data?.equipment_inventory)
        ? (data!.equipment_inventory as string[])
        : Array.isArray(raw.equipment_inventory)
          ? raw.equipment_inventory!
          : [];
      if (inv.length === 0) inv = starterInventoryIds();
      setInventory(inv);
      setConfig(normalizeAvatarFull({ ...DEFAULT_AVATAR, ...raw }));
      const achievements = await getStudentAchievements(user.id);
      setCtx({
        level: Math.max(1, data?.level ?? 1),
        gems: data?.gems ?? 0,
        streak: data?.streak ?? 0,
        achievements,
      });
      setLoadState("ready");
    })();
  }, [user, authLoading]);

  const [ctx, setCtx] = useState({
    level: 12,
    gems: 80,
    streak: 7,
    achievements: [] as string[],
  });

  const tryEquip = useCallback((piece: EquipmentPiece) => {
    if (!canUsePiece(piece, ctx, inventory)) return;
    setConfig(
      (prev) =>
        ({ ...prev, [slotKey(piece.slot)]: piece.id } as AvatarConfig),
    );
    setInventory((prev) =>
      isEquipmentUnlocked(piece, ctx) && !prev.includes(piece.id)
        ? [...prev, piece.id]
        : prev,
    );
    setEquipVersion((v) => v + 1);
  }, [ctx, inventory]);

  async function saveProgress() {
    if (!user) {
      setSaveMsg("Увійди в акаунт, щоб зберегти в хмару.");
      setTimeout(() => setSaveMsg(""), 3500);
      return;
    }
    const inv =
      config.equipment_inventory && config.equipment_inventory.length > 0
        ? config.equipment_inventory
        : inventory;
    const payload = { ...normalizeAvatarFull(config), equipment_inventory: inv };
    const { error } = await supabase
      .from("students")
      .update({
        avatar_data: payload,
        equipment_inventory: inv,
      })
      .eq("id", user.id);
    setSaveMsg(error ? "Помилка збереження" : "Збережено в Supabase ✓");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  function attack() {
    const crit = Math.random() < stats.critChance;
    const mult = crit ? 1.75 : 1;
    const base = 18 * stats.damageMult * (1 + combo * 0.06) * mult;
    const acc = 1 + stats.accuracy;
    const dmg = Math.max(
      4,
      Math.round(base * (0.92 + Math.random() * 0.16 * acc)),
    );
    setEnemyHp((h) => {
      const nh = Math.max(0, h - dmg);
      if (nh <= 0) {
        setLog((l) => [
          "🏆 Перемога! Скинь манекен кнопкою нижче.",
          ...l.slice(0, 5),
        ]);
      }
      return nh;
    });
    setCombo((c) => c + 1);
    setLog((l) => [
      `${crit ? "💥 CRIT! " : "⚔️ "}-${dmg} HP ворогу`,
      ...l.slice(0, 5),
    ]);
  }

  function enemyStrike() {
    const raw = 16 + Math.random() * 10;
    const mit = stats.defenseMitigation;
    const taken = Math.max(1, Math.round(raw * (1 - mit)));
    setPlayerHp((h) => Math.max(0, h - taken));
    setCombo(0);
    setLog((l) => [`💀 Ворог влучив: -${taken} (захист ${Math.round(mit * 100)}%)`, ...l.slice(0, 5)]);
  }

  function rollChest() {
    const tier = rollChestTier(stats.luck, stats.chestLuck);
    const bonus = Math.round(stats.gemBonus * (tier === "legendary" ? 25 : tier === "epic" ? 15 : 8));
    setChestLog((c) => [`🎁 ${tier.toUpperCase()} · +${bonus} 💎 (симуляція)`, ...c.slice(0, 4)]);
  }

  const items = EQUIPMENT_BY_SLOT[tab];
  const selectedId = normalized[slotKey(tab)] as string;

  if (loadState === "loading" && user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Завантаження спорядження…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100">
      <div className="mx-auto max-w-lg px-4 py-6 pb-28">
        <h1 className="text-center text-2xl font-black tracking-tight text-white">
          Модульний герой
        </h1>
        <p className="mt-1 text-center text-xs text-zinc-500">
          Торс = HP і броня · Зброя = урон · Аура = удача · Ефект = крит
        </p>

        <div className="relative mt-6 flex flex-col items-center rounded-3xl border border-zinc-800 bg-zinc-950/90 py-6 shadow-[inset_0_0_80px_rgba(0,0,0,0.45)]">
          <ModularHero
            equip={equip}
            equipVersion={equipVersion}
            height={220}
            className="drop-shadow-2xl"
          />
          <motion.div
            key={equip.torso}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-center text-[11px] text-zinc-500"
          >
            {getPiece(equip.torso)?.name} ·{" "}
            <span
              className={
                RARITY_LABEL_COLOR[getPiece(equip.torso)?.rarity || "common"]
              }
            >
              {getPiece(equip.torso)?.rarity}
            </span>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
          {[
            ["HP", stats.maxHp],
            ["Захист", `${Math.round(stats.defenseMitigation * 100)}%`],
            ["Урон ×", stats.damageMult.toFixed(2)],
            ["Комбо швидк.", stats.comboSpeed.toFixed(2)],
            ["Удача", stats.luck.toFixed(2)],
            ["Крит", `${Math.round(stats.critChance * 100)}%`],
            ["Точність", `${Math.round(stats.accuracy * 100)}%`],
            ["Сундуки+", `${Math.round(stats.chestLuck * 100)}%`],
          ].map(([k, v]) => (
            <div
              key={k as string}
              className="flex justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2"
            >
              <span className="text-zinc-500">{k}</span>
              <span className="font-mono font-bold text-emerald-300">{v}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
          {SLOTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setTab(s.id)}
              className={`flex shrink-0 items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                tab === s.id
                  ? "border-indigo-500/60 bg-indigo-500/20 text-indigo-200"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
              }`}
            >
              <span>{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((piece) => {
            const on = canUsePiece(piece, ctx, inventory);
            const sel = selectedId === piece.id;
            return (
              <motion.button
                key={piece.id}
                type="button"
                disabled={!on}
                whileTap={on ? { scale: 0.96 } : {}}
                onClick={() => tryEquip(piece)}
                className={`relative flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all ${
                  sel
                    ? "border-indigo-400/70 bg-indigo-500/15 shadow-lg shadow-indigo-500/10"
                    : on
                      ? "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500"
                      : "cursor-not-allowed border-zinc-800/50 opacity-40"
                }`}
              >
                <span className="absolute right-1 top-1 text-[10px]">
                  {RARITY_UI[piece.rarity]}
                </span>
                <span className="text-2xl">{piece.emoji}</span>
                <span className="line-clamp-2 text-[9px] font-semibold leading-tight text-zinc-300">
                  {piece.name}
                </span>
                {!on && (
                  <span className="text-[8px] text-rose-400">🔒</span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Training */}
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="mb-2 text-xs font-black uppercase tracking-wider text-zinc-500">
            Тренування
          </div>
          <div className="mb-3 flex justify-between gap-2 text-xs">
            <div>
              Ти:{" "}
              <span className="font-mono text-sky-300">
                {playerHp}/{stats.maxHp}
              </span>
            </div>
            <div>
              Манекен:{" "}
              <span className="font-mono text-rose-300">{enemyHp}/200</span>
            </div>
            <div>Комбо ×{combo}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={attack}
              disabled={enemyHp <= 0}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-xs font-black text-white disabled:opacity-40"
            >
              Атака (твій урон)
            </button>
            <button
              type="button"
              onClick={enemyStrike}
              className="rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-xs font-black text-rose-200"
            >
              Удар ворога
            </button>
            <button
              type="button"
              onClick={() => {
                setEnemyHp(200);
                setPlayerHp(stats.maxHp);
                setCombo(0);
                setLog([]);
              }}
              className="rounded-xl border border-zinc-700 px-4 py-3 text-xs text-zinc-400"
            >
              Скинути
            </button>
          </div>
          <div className="mt-2 space-y-0.5">
            {log.map((line, i) => (
              <p key={`${i}-${line.slice(0, 12)}`} className="text-[11px] text-zinc-400">
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* Luck demo */}
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="mb-2 text-xs font-black text-zinc-500">
            Удача → сундуки (симуляція)
          </div>
          <button
            type="button"
            onClick={rollChest}
            className="w-full rounded-xl bg-gradient-to-r from-amber-700 to-yellow-600 py-3 text-xs font-black text-white"
          >
            Симулювати дроп сундука
          </button>
          {chestLog.map((c, i) => (
            <p key={i} className="mt-1 text-[11px] text-amber-200/90">
              {c}
            </p>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={saveProgress}
            className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-4 text-sm font-black text-white"
          >
            Зберегти в Supabase
          </button>
          {saveMsg && (
            <p className="text-center text-xs text-zinc-400">{saveMsg}</p>
          )}
          {!user && (
            <p className="text-center text-[11px] text-zinc-600">
              Без входу працює локально; збереження вимагає логін.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-zinc-600">
          Рідкість:{" "}
          {RARITY_ORDER.map((r) => (
            <span key={r} className={`mx-0.5 ${RARITY_LABEL_COLOR[r]}`}>
              {r}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
