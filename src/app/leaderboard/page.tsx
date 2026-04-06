"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getLeague } from "@/lib/achievements";
import Link from "next/link";

interface LeaderboardEntry {
  id: string; name: string; level: number; xp: number; streak: number;
  total_tasks_completed: number; weekly_xp: number;
}

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "weekly">("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    supabase
      .from("students")
      .select("id, name, level, xp, streak, total_tasks_completed, weekly_xp")
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

  const sorted = tab === "weekly"
    ? [...entries].sort((a, b) => (b.weekly_xp || 0) - (a.weekly_xp || 0))
    : entries;

  const myRank = sorted.findIndex(e => e.id === user?.id);

  return (
    <div className="max-w-[600px] mx-auto px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-extrabold">🏆 Рейтинг</h1>
          <Link href="/test" className="ml-auto text-xs text-gordemy-blue border border-gordemy-blue/30 px-3 py-1.5 rounded-lg hover:bg-gordemy-blue/10 transition-colors">
            🧪 Mini Test
          </Link>
        </div>
        <p className="text-gordemy-muted text-sm">
          {myRank >= 0 ? `Твоє місце: #${myRank + 1} з ${sorted.length}` : `${sorted.length} гравців`}
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="flex gap-2 mb-6">
        <button onClick={() => setTab("all")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${tab === "all" ? "border-gordemy-blue bg-gordemy-blue/20 text-gordemy-blue" : "border-gordemy-border text-gordemy-muted hover:border-gordemy-muted"}`}>
          🌍 Загальний
        </button>
        <button onClick={() => setTab("weekly")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${tab === "weekly" ? "border-gordemy-orange bg-gordemy-orange/20 text-gordemy-orange" : "border-gordemy-border text-gordemy-muted hover:border-gordemy-muted"}`}>
          🏆 Тижневий
        </button>
      </motion.div>

      {tab === "weekly" && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3 rounded-xl border border-gordemy-orange/30 bg-gordemy-orange/10 text-center">
          <p className="text-gordemy-orange text-xs font-bold">⚡ Weekly Tournament — скидається щопонеділка</p>
          <p className="text-gordemy-muted text-xs mt-0.5">Набирай якнайбільше XP за тиждень!</p>
        </motion.div>
      )}

      {/* Top 3 podium */}
      {sorted.length >= 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex items-end justify-center gap-3 mb-8">
          {[sorted[1], sorted[0], sorted[2]].map((entry, i) => {
            const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
            const heights = ["h-24", "h-32", "h-20"];
            const medals = ["🥈", "🥇", "🥉"];
            const league = getLeague(entry.xp);
            const isMe = entry.id === user?.id;
            const value = tab === "weekly" ? (entry.weekly_xp || 0) : entry.xp;
            return (
              <div key={entry.id} className="flex flex-col items-center gap-2">
                <span className="text-lg">{medals[i]}</span>
                <div className={`w-16 ${heights[i]} rounded-t-2xl flex flex-col items-center justify-end pb-3 border-t border-x ${
                  rank === 1 ? "bg-gordemy-orange/20 border-gordemy-orange/40"
                  : rank === 2 ? "bg-gordemy-muted/10 border-gordemy-muted/20"
                  : "bg-gordemy-orange/10 border-gordemy-orange/20"
                } ${isMe ? "ring-2 ring-gordemy-blue" : ""}`}>
                  <div className="text-lg">{league.icon}</div>
                  <div className="text-xs font-bold text-center px-1 leading-tight">
                    {entry.name?.split(" ")[0] || "Гравець"}
                  </div>
                  <div className="text-[10px] text-gordemy-muted">{value} XP</div>
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
          const value = tab === "weekly" ? (entry.weekly_xp || 0) : entry.xp;
          return (
            <motion.div key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.03 }}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                isMe ? "bg-gordemy-blue/10 border-gordemy-blue/40" : "bg-gordemy-card border-gordemy-border"
              }`}>
              <div className={`w-8 text-center font-extrabold text-sm ${rank <= 3 ? "text-gordemy-orange" : "text-gordemy-muted"}`}>
                {rank <= 3 ? ["🥇","🥈","🥉"][rank-1] : `#${rank}`}
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${league.bg} border`}>
                {entry.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold truncate ${isMe ? "text-gordemy-blue" : ""}`}>
                    {entry.name || "Гравець"} {isMe && "(ти)"}
                  </span>
                  <span className="text-xs">{league.icon}</span>
                  <span className={`text-xs font-semibold ${league.color}`}>{league.name}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gordemy-muted">Рів. {entry.level}</span>
                  <span className="text-xs text-gordemy-muted">🔥 {entry.streak}д</span>
                  <span className="text-xs text-gordemy-muted">✅ {entry.total_tasks_completed}</span>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-extrabold ${tab === "weekly" ? "text-gordemy-orange" : "text-gordemy-blue"}`}>{value}</div>
                <div className="text-[10px] text-gordemy-muted">{tab === "weekly" ? "тижд." : "XP"}</div>
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
