"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { getStudent } from "@/lib/student";
import Link from "next/link";

// ─── Season config ─────────────────────────────────────────────────────────

const SEASON_NAME = "Сезон 1: Зоря Знань";
const SEASON_END  = new Date("2026-05-01");

// 10 tiers, free + premium track
interface Tier {
  tier: number;
  xpRequired: number;
  free: { emoji: string; label: string; value: string };
  premium: { emoji: string; label: string; value: string };
}

const TIERS: Tier[] = [
  { tier: 1,  xpRequired: 0,    free: { emoji:"✨", label:"50 XP",         value:"xp_50"    }, premium: { emoji:"💎", label:"5 Гемів",     value:"gems_5"    } },
  { tier: 2,  xpRequired: 200,  free: { emoji:"📦", label:"Бронз. сундук", value:"chest_bronze" }, premium: { emoji:"🎁", label:"Срібн. сундук", value:"chest_silver" } },
  { tier: 3,  xpRequired: 500,  free: { emoji:"✨", label:"100 XP",        value:"xp_100"   }, premium: { emoji:"💎", label:"15 Гемів",    value:"gems_15"   } },
  { tier: 4,  xpRequired: 900,  free: { emoji:"🛡️", label:"Streak Shield", value:"shield"   }, premium: { emoji:"🏆", label:"Золотий сундук", value:"chest_gold" } },
  { tier: 5,  xpRequired: 1400, free: { emoji:"✨", label:"150 XP",        value:"xp_150"   }, premium: { emoji:"💎", label:"30 Гемів",    value:"gems_30"   } },
  { tier: 6,  xpRequired: 2000, free: { emoji:"📦", label:"Срібн. сундук", value:"chest_silver" }, premium: { emoji:"🎨", label:"Ексклюз. аватар", value:"avatar_s1" } },
  { tier: 7,  xpRequired: 2700, free: { emoji:"✨", label:"200 XP",        value:"xp_200"   }, premium: { emoji:"💎", label:"50 Гемів",    value:"gems_50"   } },
  { tier: 8,  xpRequired: 3500, free: { emoji:"🛡️", label:"2× Shield",    value:"shield_2" }, premium: { emoji:"💠", label:"Legendary сундук", value:"chest_leg" } },
  { tier: 9,  xpRequired: 4500, free: { emoji:"✨", label:"300 XP",        value:"xp_300"   }, premium: { emoji:"💎", label:"100 Гемів",   value:"gems_100"  } },
  { tier: 10, xpRequired: 6000, free: { emoji:"👑", label:"Титул: Сезон 1", value:"title_s1" }, premium: { emoji:"🌟", label:"Легендарний титул", value:"title_legendary" } },
];

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}

export default function BattlePassPage() {
  const { user } = useAuth();
  const [xp, setXp]           = useState(0);
  const [premium, setPremium] = useState(false); // in MVP always false (free)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getStudent(user.id).then(st => {
      if (st) setXp((st as any).xp || 0);
      setLoading(false);
    });
  }, [user]);

  const currentTierIdx = [...TIERS].reverse().findIndex(t => xp >= t.xpRequired);
  const currentTier    = currentTierIdx === -1 ? 0 : TIERS.length - 1 - currentTierIdx;
  const nextTier       = TIERS[currentTier + 1];
  const progressToNext = nextTier
    ? ((xp - TIERS[currentTier].xpRequired) / (nextTier.xpRequired - TIERS[currentTier].xpRequired)) * 100
    : 100;
  const daysLeft = daysUntil(SEASON_END);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black pb-24">
      <div className="max-w-[480px] mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link href="/dashboard" className="text-zinc-500 hover:text-white transition-colors">←</Link>
          <h1 className="text-lg font-black text-white">🎫 Battle Pass</h1>
        </div>

        {/* Season banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl border border-yellow-500/40 bg-gradient-to-br from-yellow-950/40 to-orange-950/30 p-5 mb-5 overflow-hidden"
        >
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/70 mb-1">Поточний сезон</div>
              <div className="text-base font-black text-white">{SEASON_NAME}</div>
              <div className="text-xs text-zinc-400 mt-0.5">Закінчується через {daysLeft} днів</div>
            </div>
            <div className="text-4xl">🌟</div>
          </div>

          {/* XP progress */}
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5">
              <span>Tier {currentTier + 1} / {TIERS.length}</span>
              <span>{xp} / {nextTier?.xpRequired ?? "MAX"} XP</span>
            </div>
            <div className="h-2.5 rounded-full bg-zinc-900 border border-zinc-700 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, progressToNext)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>

        {/* Premium upsell (if free) */}
        {!premium && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-purple-500/40 bg-purple-950/20 p-4 mb-5 flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-black text-purple-300">⭐ Преміум Battle Pass</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Подвійні нагороди + ексклюзиви</div>
            </div>
            <button className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs">
              Незабаром
            </button>
          </motion.div>
        )}

        {/* Tiers list */}
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Нагороди сезону</h2>
        <div className="space-y-2">
          {TIERS.map((t, i) => {
            const unlocked = xp >= t.xpRequired;
            const isCurrent = i === currentTier;

            return (
              <motion.div
                key={t.tier}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl border p-3 flex items-center gap-3 transition-all ${
                  isCurrent
                    ? "border-yellow-500/60 bg-yellow-950/20"
                    : unlocked
                    ? "border-zinc-700/40 bg-zinc-900/30"
                    : "border-zinc-800/30 bg-zinc-950/20 opacity-50"
                }`}
              >
                {/* Tier number */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${
                  unlocked ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-500"
                }`}>
                  {t.tier}
                </div>

                {/* Free reward */}
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xl">{t.free.emoji}</span>
                  <div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase">Безплатно</div>
                    <div className={`text-xs font-bold ${unlocked ? "text-white" : "text-zinc-600"}`}>{t.free.label}</div>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-zinc-800" />

                {/* Premium reward */}
                <div className="flex-1 flex items-center gap-2">
                  <span className={`text-xl ${!premium ? "grayscale opacity-40" : ""}`}>{t.premium.emoji}</span>
                  <div>
                    <div className="text-[10px] text-purple-500 font-bold uppercase">Преміум</div>
                    <div className={`text-xs font-bold ${premium && unlocked ? "text-purple-300" : "text-zinc-600"}`}>
                      {t.premium.label}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex-shrink-0">
                  {unlocked ? (
                    <span className="text-sm">✅</span>
                  ) : isCurrent ? (
                    <span className="text-xs font-black text-yellow-400">NOW</span>
                  ) : (
                    <span className="text-[10px] text-zinc-600">{t.xpRequired} XP</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-6 space-y-3">
          <Link href="/boss">
            <motion.div whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black text-center"
            >
              ⚔️ Заробити XP (Boss Fight)
            </motion.div>
          </Link>
          <Link href="/duel">
            <motion.div whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-2xl border border-zinc-700 text-zinc-300 font-bold text-center text-sm"
            >
              🥊 Дуель (+XP за перемогу)
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
}
