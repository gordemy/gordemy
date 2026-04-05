"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/student";
import { getLeague } from "@/lib/achievements";

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    getLeaderboard().then(data => {
      setEntries(data);
      setLoading(false);
    });
  }, [user, authLoading, router]);

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

  const myRank = entries.findIndex(e => e.id === user?.id);

  return (
    <div className="max-w-[600px] mx-auto px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-extrabold mb-1">🏆 Рейтинг</h1>
        <p className="text-gordemy-muted text-sm">
          {myRank >= 0 ? `Твоє місце: #${myRank + 1} з ${entries.length}` : `${entries.length} гравців`}
        </p>
      </motion.div>

      {/* Top 3 podium */}
      {entries.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-end justify-center gap-3 mb-8"
        >
          {[entries[1], entries[0], entries[2]].map((entry, i) => {
            const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
            const heights = ["h-24", "h-32", "h-20"];
            const medals = ["🥈", "🥇", "🥉"];
            const league = getLeague(entry.xp);
            const isMe = entry.id === user?.id;
            return (
              <div key={entry.id} className="flex flex-col items-center gap-2">
                <span className="text-lg">{medals[i]}</span>
                <div className={`w-16 ${heights[i]} rounded-t-2xl flex flex-col items-center justify-end pb-3 border-t border-x ${
                  rank === 1
                    ? "bg-gordemy-orange/20 border-gordemy-orange/40"
                    : rank === 2
                    ? "bg-gordemy-muted/10 border-gordemy-muted/20"
                    : "bg-gordemy-orange/10 border-gordemy-orange/20"
                } ${isMe ? "ring-2 ring-gordemy-blue" : ""}`}>
                  <div className="text-lg">{league.icon}</div>
                  <div className="text-xs font-bold text-center px-1 leading-tight">
                    {entry.name?.split(" ")[0] || "Гравець"}
                  </div>
                  <div className="text-[10px] text-gordemy-muted">{entry.xp} XP</div>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Full list */}
      <div className="flex flex-col gap-2">
        {entries.map((entry, i) => {
          const league = getLeague(entry.xp);
          const isMe = entry.id === user?.id;
          const rank = i + 1;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.03 }}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                isMe
                  ? "bg-gordemy-blue/10 border-gordemy-blue/40"
                  : "bg-gordemy-card border-gordemy-border"
              }`}
            >
              {/* Rank */}
              <div className={`w-8 text-center font-extrabold text-sm ${
                rank === 1 ? "text-gordemy-orange" :
                rank === 2 ? "text-gordemy-muted" :
                rank === 3 ? "text-gordemy-orange/70" :
                "text-gordemy-muted"
              }`}>
                {rank <= 3 ? ["🥇","🥈","🥉"][rank-1] : `#${rank}`}
              </div>

              {/* Avatar */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${league.bg} border`}>
                {entry.name?.[0]?.toUpperCase() || "?"}
              </div>

              {/* Info */}
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

              {/* XP */}
              <div className="text-right">
                <div className="text-sm font-extrabold text-gordemy-blue">{entry.xp}</div>
                <div className="text-[10px] text-gordemy-muted">XP</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {entries.length === 0 && (
        <div className="text-center py-16 text-gordemy-muted">
          <div className="text-5xl mb-3">🏆</div>
          <p>Поки що нікого. Будь першим!</p>
        </div>
      )}
    </div>
  );
}
