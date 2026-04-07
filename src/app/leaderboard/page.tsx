"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getLeague } from "@/lib/achievements";
import Link from "next/link";

interface LeaderboardEntry {
  id: string; name: string; level: number; xp: number; streak: number;
  total_tasks_completed: number; weekly_xp: number; gems: number;
}

// Days until next Monday reset
function getDaysUntilReset(): number {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon
  return day === 0 ? 1 : 8 - day;
}

function getTimeUntilReset(): string {
  const now = new Date();
  const nextMonday = new Date(now);
  const daysUntil = getDaysUntilReset();
  nextMonday.setDate(now.getDate() + daysUntil);
  nextMonday.setHours(0, 0, 0, 0);
  const diff = nextMonday.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}д ${hours % 24}г`;
  return `${hours}г ${mins}хв`;
}

const WEEKLY_PRIZES: Record<number, { label: string; icon: string; gems: number }> = {
  1: { label: "Чемпіон тижня", icon: "👑", gems: 200 },
  2: { label: "Срібний боєць", icon: "🥈", gems: 120 },
  3: { label: "Бронзовий герой", icon: "🥉", gems: 80 },
  4: { label: "Топ-10", icon: "⭐", gems: 30 },
  5: { label: "Топ-10", icon: "⭐", gems: 30 },
  6: { label: "Топ-10", icon: "⭐", gems: 30 },
  7: { label: "Топ-10", icon: "⭐", gems: 30 },
  8: { label: "Топ-10", icon: "⭐", gems: 30 },
  9: { label: "Топ-10", icon: "⭐", gems: 30 },
  10: { label: "Топ-10", icon: "⭐", gems: 30 },
};

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"weekly" | "all" | "streak">("weekly");
  const [showPrizes, setShowPrizes] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    supabase
      .from("students")
      .select("id, name, level, xp, streak, total_tasks_completed, weekly_xp, gems")
      .order("xp", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setEntries((data || []) as LeaderboardEntry[]);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="max-w-[600px] mx-auto px-6 py-8">
        <div className="bg-gordemy-card rounded-xl animate-pulse h-8 w-48 mb-6" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-gordemy-card rounded-xl animate-pulse h-16 mb-3" />
        ))}
      </div>
    );
  }

  const sorted =
    tab === "weekly" ? [...entries].sort((a, b) => (b.weekly_xp || 0) - (a.weekly_xp || 0))
    : tab === "streak" ? [...entries].sort((a, b) => (b.streak || 0) - (a.streak || 0))
    : entries;

  const myRank = sorted.findIndex(e => e.id === user?.id);
  const myEntry = sorted[myRank];
  const myPrize = myRank >= 0 && myRank < 10 ? WEEKLY_PRIZES[myRank + 1] : null;
  const timeLeft = getTimeUntilReset();

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div className="max-w-[600px] mx-auto px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-extrabold flex items-center gap-2">🏆 Рейтинг</h1>
          <button
            onClick={() => setShowPrizes(prev => !prev)}
            className="text-xs border border-gordemy-orange/40 text-gordemy-orange px-3 py-1.5 rounded-lg hover:bg-gordemy-orange/10 transition-all"
          >
            🎁 Призи
          </button>
        </div>
        <p className="text-gordemy-muted text-sm">
          {myRank >= 0 ? `Твоє місце: #${myRank + 1} з ${sorted.length}` : `${sorted.length} гравців`}
        </p>
      </motion.div>

      {/* Prizes panel */}
      <AnimatePresence>
        {showPrizes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className="bg-gordemy-card border border-gordemy-orange/30 rounded-2xl p-5">
              <h3 className="font-black text-white mb-3">🎁 Призи Weekly Tournament</h3>
              <div className="space-y-2">
                {[1,2,3].map(rank => {
                  const p = WEEKLY_PRIZES[rank];
                  return (
                    <div key={rank} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{p.icon}</span>
                        <span className="text-white text-sm font-semibold">#{rank} {p.label}</span>
                      </div>
                      <span className="text-gordemy-orange font-bold">+{p.gems} 💎</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-1 border-t border-gordemy-border">
                  <span className="text-gordemy-muted text-sm">⭐ Топ 4–10</span>
                  <span className="text-gordemy-orange font-bold">+30 💎</span>
                </div>
              </div>
              <div className="mt-3 text-center text-xs text-gordemy-muted">
                ⏳ Скидання через: <span className="text-gordemy-orange font-bold">{timeLeft}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My position (if in top 10) */}
      {myRank >= 0 && myRank < 10 && myPrize && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-5 bg-gordemy-blue/10 border border-gordemy-blue/30 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gordemy-blue font-black text-sm">🎉 Ти #{myRank + 1} — в топ 10!</div>
              <div className="text-gordemy-muted text-xs mt-0.5">Якщо залишишся до кінця тижня — отримаєш {myPrize.gems} 💎</div>
            </div>
            <div className="text-3xl">{myPrize.icon}</div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="flex gap-2 mb-6">
        {[
          { id: "weekly", label: "🏆 Тижневий", active: "border-gordemy-orange bg-gordemy-orange/20 text-gordemy-orange" },
          { id: "all", label: "🌍 Загальний", active: "border-gordemy-blue bg-gordemy-blue/20 text-gordemy-blue" },
          { id: "streak", label: "🔥 Серії", active: "border-gordemy-green bg-gordemy-green/20 text-gordemy-green" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${tab === t.id ? t.active : "border-gordemy-border text-gordemy-muted hover:border-gordemy-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </motion.div>

      {tab === "weekly" && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3 rounded-xl border border-gordemy-orange/30 bg-gordemy-orange/10 text-center">
          <p className="text-gordemy-orange text-xs font-bold">⚡ Weekly Tournament — скидається через {timeLeft}</p>
          <p className="text-gordemy-muted text-xs mt-0.5">Набирай якнайбільше XP за тиждень — виграй 💎 Геми!</p>
        </motion.div>
      )}

      {/* Top 3 podium */}
      {top3.length >= 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex items-end justify-center gap-3 mb-8">
          {[top3[1], top3[0], top3[2]].map((entry, i) => {
            const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
            const heights = ["h-24", "h-32", "h-20"];
            const medals = ["🥈", "🥇", "🥉"];
            const prize = WEEKLY_PRIZES[rank];
            const league = getLeague(entry.xp);
            const isMe = entry.id === user?.id;
            const value = tab === "weekly" ? (entry.weekly_xp || 0) : tab === "streak" ? entry.streak : entry.xp;
            return (
              <div key={entry.id} className="flex flex-col items-center gap-1.5">
                <span className="text-lg">{medals[i]}</span>
                {tab === "weekly" && <span className="text-xs text-gordemy-orange font-bold">+{prize.gems}💎</span>}
                <div className={`w-18 px-3 ${heights[i]} rounded-t-2xl flex flex-col items-center justify-end pb-3 border-t border-x ${
                  rank === 1 ? "bg-gordemy-orange/20 border-gordemy-orange/40"
                  : rank === 2 ? "bg-gordemy-muted/10 border-gordemy-muted/20"
                  : "bg-gordemy-orange/10 border-gordemy-orange/20"
                } ${isMe ? "ring-2 ring-gordemy-blue" : ""}`}>
                  <div className="text-lg">{league.icon}</div>
                  <div className="text-xs font-bold text-center px-1 leading-tight">{entry.name?.split(" ")[0] || "?"}</div>
                  <div className="text-[10px] text-gordemy-muted font-semibold">{value} {tab === "streak" ? "🔥" : "XP"}</div>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Full list */}
      <div className="flex flex-col gap-2">
        {sorted.map((entry, i) => {
          const league = getLeague(entry.xp);
          const isMe = entry.id === user?.id;
          const rank = i + 1;
          const prize = WEEKLY_PRIZES[rank];
          const value = tab === "weekly" ? (entry.weekly_xp || 0) : tab === "streak" ? entry.streak : entry.xp;
          const valueLabel = tab === "streak" ? "серія" : "XP";
          const valueColor = tab === "weekly" ? "text-gordemy-orange" : tab === "streak" ? "text-gordemy-green" : "text-gordemy-blue";

          return (
            <motion.div key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.025 }}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                isMe
                  ? "bg-gordemy-blue/10 border-gordemy-blue/40"
                  : rank <= 3 ? "bg-gordemy-card border-gordemy-orange/20"
                  : "bg-gordemy-card border-gordemy-border"
              }`}
            >
              <div className={`w-8 text-center font-extrabold text-sm ${rank <= 3 ? "text-gordemy-orange" : "text-gordemy-muted"}`}>
                {rank <= 3 ? ["🥇","🥈","🥉"][rank-1] : `#${rank}`}
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${league.bg} border`}>
                {entry.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-sm font-bold truncate ${isMe ? "text-gordemy-blue" : "text-white"}`}>
                    {entry.name || "Гравець"} {isMe && <span className="text-xs">(ти)</span>}
                  </span>
                  <span className="text-xs">{league.icon}</span>
                </div>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <span className="text-xs text-gordemy-muted">Рів. {entry.level}</span>
                  <span className="text-xs text-gordemy-muted">🔥 {entry.streak}д</span>
                  {tab === "weekly" && prize && (
                    <span className="text-xs text-gordemy-orange">{prize.icon} +{prize.gems}💎</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-extrabold ${valueColor}`}>{value}</div>
                <div className="text-[10px] text-gordemy-muted">{valueLabel}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16 text-gordemy-muted">
          <div className="text-5xl mb-3">🏆</div>
          <p>Поки що нікого. Будь першим!</p>
        </div>
      )}
    </div>
  );
}
