"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { getAllAchievements, getStudentAchievements, RARITY_COLORS, RARITY_BG, RARITY_LABELS, type Achievement } from "@/lib/achievements";

export default function AchievementsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [all, setAll] = useState<Achievement[]>([]);
  const [earned, setEarned] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "earned" | "locked">("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    async function load() {
      const [allAch, earnedKeys] = await Promise.all([
        getAllAchievements(),
        getStudentAchievements(user!.id),
      ]);
      setAll(allAch);
      setEarned(earnedKeys);
      setLoading(false);
    }
    load();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="max-w-[640px] mx-auto px-6 py-8">
        <div className="bg-gordemy-card rounded-xl animate-pulse h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-gordemy-card rounded-2xl animate-pulse h-32" />
          ))}
        </div>
      </div>
    );
  }

  const earnedCount = all.filter(a => earned.includes(a.key)).length;
  const filtered = all.filter(a => {
    if (filter === "earned") return earned.includes(a.key);
    if (filter === "locked") return !earned.includes(a.key);
    return true;
  });

  return (
    <div className="max-w-[640px] mx-auto px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-extrabold mb-1">🏆 Досягнення</h1>
        <p className="text-gordemy-muted text-sm">
          Зібрано {earnedCount} з {all.length} досягнень
        </p>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gordemy-card border border-gordemy-border rounded-2xl p-4 mb-6"
      >
        <div className="flex justify-between text-xs text-gordemy-muted mb-2">
          <span>Прогрес колекції</span>
          <span>{Math.round((earnedCount / all.length) * 100)}%</span>
        </div>
        <div className="h-3 bg-gordemy-bg rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-gordemy-orange to-gordemy-purple rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(earnedCount / all.length) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          {(["common","rare","epic","legendary"] as const).map(r => {
            const total = all.filter(a => a.rarity === r).length;
            const got = all.filter(a => a.rarity === r && earned.includes(a.key)).length;
            return (
              <div key={r} className="flex items-center gap-1">
                <span className={RARITY_COLORS[r].split(" ")[1]}>{RARITY_LABELS[r]}</span>
                <span className="text-gordemy-muted">{got}/{total}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(["all","earned","locked"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
              filter === f
                ? "bg-gordemy-blue text-white"
                : "bg-gordemy-card border border-gordemy-border text-gordemy-muted hover:border-gordemy-muted/50"
            }`}
          >
            {f === "all" ? "Всі" : f === "earned" ? `Здобуті (${earnedCount})` : "Заблоковані"}
          </button>
        ))}
      </div>

      {/* Achievements grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map((ach, i) => {
          const isEarned = earned.includes(ach.key);
          const isSecret = ach.secret && !isEarned;
          return (
            <motion.div
              key={ach.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className={`relative rounded-2xl border p-4 text-center transition-all ${
                isEarned
                  ? `${RARITY_BG[ach.rarity]} ${RARITY_COLORS[ach.rarity].split(" ")[0]}`
                  : "bg-gordemy-card border-gordemy-border opacity-50"
              }`}
            >
              {/* Rarity glow for earned */}
              {isEarned && ach.rarity === "legendary" && (
                <div className="absolute inset-0 rounded-2xl bg-gordemy-orange/5 animate-pulse pointer-events-none" />
              )}

              <div className={`text-3xl mb-2 ${!isEarned ? "grayscale" : ""}`}>
                {isSecret ? "🔒" : ach.icon}
              </div>
              <div className={`text-xs font-bold mb-1 ${isEarned ? "" : "text-gordemy-muted"}`}>
                {isSecret ? "Секретне" : ach.name}
              </div>
              <div className="text-[10px] text-gordemy-muted leading-snug">
                {isSecret ? "Виконай щось особливе" : ach.description}
              </div>
              {isEarned && (
                <div className={`mt-2 text-[10px] font-semibold ${RARITY_COLORS[ach.rarity].split(" ")[1]}`}>
                  +{ach.xp_reward} XP • {RARITY_LABELS[ach.rarity]}
                </div>
              )}
              {isEarned && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gordemy-green flex items-center justify-center text-[8px] text-white font-bold">
                  ✓
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
