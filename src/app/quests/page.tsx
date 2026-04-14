"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import {
  getDailyQuests, getWeeklyQuests,
  claimDailyQuest, claimWeeklyQuest,
  type DailyQuest, type WeeklyQuest,
} from "@/lib/gamification";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "daily" | "weekly";

interface ClaimResult {
  xp: number;
  gems: number;
  questLabel: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ProgressBar({ current, target, color }: { current: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="h-2 rounded-full bg-black/40 overflow-hidden mt-2">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

function QuestCard({
  quest,
  onClaim,
  claiming,
}: {
  quest: DailyQuest | WeeklyQuest;
  onClaim: (id: string, xp: number, gems: number) => void;
  claiming: string | null;
}) {
  const pct = Math.min(100, Math.round((quest.current / quest.target) * 100));
  const canClaim = quest.current >= quest.target && !quest.completed;
  const isClaiming = claiming === quest.id;

  const barColor = quest.completed
    ? "bg-zinc-600"
    : pct >= 100
    ? "bg-gradient-to-r from-gordemy-green to-emerald-400"
    : pct >= 50
    ? "bg-gradient-to-r from-gordemy-blue to-cyan-400"
    : "bg-gradient-to-r from-gordemy-purple to-violet-400";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 transition-all ${
        quest.completed
          ? "border-zinc-700/40 bg-zinc-900/30 opacity-60"
          : canClaim
          ? "border-gordemy-green/50 bg-gordemy-green/5 shadow-lg shadow-gordemy-green/10"
          : "border-gordemy-border bg-gordemy-card"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Emoji */}
        <div className="text-3xl mt-0.5">{quest.emoji}</div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`font-bold text-sm ${quest.completed ? "text-zinc-500 line-through" : "text-white"}`}>
              {quest.label}
            </span>
            {quest.completed && (
              <span className="text-gordemy-green text-lg">✅</span>
            )}
          </div>
          <p className="text-xs text-gordemy-muted mt-0.5">{quest.description}</p>

          {/* Progress */}
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gordemy-muted">
                {quest.current} / {quest.target}
              </span>
              <span className={`font-bold ${pct >= 100 ? "text-gordemy-green" : "text-gordemy-muted"}`}>
                {pct}%
              </span>
            </div>
            <ProgressBar current={quest.current} target={quest.target} color={barColor} />
          </div>

          {/* Rewards */}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs font-bold text-gordemy-blue">+{quest.xpReward} XP</span>
            <span className="text-xs font-bold text-gordemy-purple">💎 +{quest.gemReward}</span>
          </div>
        </div>
      </div>

      {/* Claim button */}
      <AnimatePresence>
        {canClaim && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileTap={{ scale: 0.96 }}
            disabled={isClaiming}
            onClick={() => onClaim(quest.id, quest.xpReward, quest.gemReward)}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-gordemy-green to-emerald-500 py-2.5 text-sm font-black text-white shadow-lg shadow-gordemy-green/30 disabled:opacity-60"
          >
            {isClaiming ? "Отримую..." : "🎁 Отримати нагороду"}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Claim Toast ──────────────────────────────────────────────────────────────

function ClaimToast({ result, onDone }: { result: ClaimResult; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.9 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-gordemy-green/50 bg-gordemy-green/10 backdrop-blur-md px-6 py-4 text-center shadow-2xl shadow-gordemy-green/20"
    >
      <div className="text-2xl mb-1">🎉</div>
      <div className="text-sm font-black text-white">{result.questLabel}</div>
      <div className="flex gap-4 justify-center mt-2">
        <span className="text-gordemy-blue font-bold text-sm">+{result.xp} XP</span>
        <span className="text-gordemy-purple font-bold text-sm">💎 +{result.gems}</span>
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function QuestsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("daily");
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([]);
  const [weeklyQuests, setWeeklyQuests] = useState<WeeklyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    loadQuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const loadQuests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [daily, weekly] = await Promise.all([
      getDailyQuests(user.id),
      getWeeklyQuests(user.id),
    ]);
    setDailyQuests(daily);
    setWeeklyQuests(weekly);
    setLoading(false);
  }, [user]);

  const handleClaim = useCallback(async (questId: string, xp: number, gems: number) => {
    if (!user || claiming) return;
    setClaiming(questId);

    const allQuests = [...dailyQuests, ...weeklyQuests];
    const quest = allQuests.find(q => q.id === questId);

    try {
      if (tab === "daily") {
        await claimDailyQuest(user.id, questId, xp, gems);
      } else {
        await claimWeeklyQuest(user.id, questId, xp, gems);
      }
      setClaimResult({ xp, gems, questLabel: quest?.label || "Квест виконано!" });
      await loadQuests();
    } finally {
      setClaiming(null);
    }
  }, [user, claiming, tab, dailyQuests, weeklyQuests, loadQuests]);

  // ── Stats ──
  const dailyDone = dailyQuests.filter(q => q.completed).length;
  const weeklyDone = weeklyQuests.filter(q => q.completed).length;
  const dailyCanClaim = dailyQuests.filter(q => q.current >= q.target && !q.completed).length;
  const weeklyCanClaim = weeklyQuests.filter(q => q.current >= q.target && !q.completed).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gordemy-bg flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-4xl"
        >
          ⚡
        </motion.div>
      </div>
    );
  }

  const currentQuests = tab === "daily" ? dailyQuests : weeklyQuests;
  const canClaimCount = tab === "daily" ? dailyCanClaim : weeklyCanClaim;

  return (
    <div className="min-h-screen bg-gordemy-bg px-4 py-6 pb-32">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-gordemy-muted hover:text-white transition-colors">
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">Квести</h1>
            <p className="text-xs text-gordemy-muted">Виконуй — отримуй нагороди</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.div
            whileTap={{ scale: 0.97 }}
            onClick={() => setTab("daily")}
            className={`rounded-2xl border p-4 cursor-pointer transition-all ${
              tab === "daily"
                ? "border-gordemy-blue/50 bg-gordemy-blue/10"
                : "border-gordemy-border bg-gordemy-card"
            }`}
          >
            <div className="text-2xl mb-1">📅</div>
            <div className="font-black text-white text-sm">Щоденні</div>
            <div className="text-xs text-gordemy-muted mt-0.5">
              {dailyDone}/{dailyQuests.length} виконано
            </div>
            {dailyCanClaim > 0 && (
              <div className="mt-2 text-[10px] font-black text-gordemy-green bg-gordemy-green/10 rounded-full px-2 py-0.5 inline-block">
                🎁 {dailyCanClaim} нагорода
              </div>
            )}
          </motion.div>

          <motion.div
            whileTap={{ scale: 0.97 }}
            onClick={() => setTab("weekly")}
            className={`rounded-2xl border p-4 cursor-pointer transition-all ${
              tab === "weekly"
                ? "border-gordemy-orange/50 bg-gordemy-orange/10"
                : "border-gordemy-border bg-gordemy-card"
            }`}
          >
            <div className="text-2xl mb-1">🗓️</div>
            <div className="font-black text-white text-sm">Тижневі</div>
            <div className="text-xs text-gordemy-muted mt-0.5">
              {weeklyDone}/{weeklyQuests.length} виконано
            </div>
            {weeklyCanClaim > 0 && (
              <div className="mt-2 text-[10px] font-black text-gordemy-orange bg-gordemy-orange/10 rounded-full px-2 py-0.5 inline-block">
                🎁 {weeklyCanClaim} нагорода
              </div>
            )}
          </motion.div>
        </div>

        {/* Tab indicator */}
        <div className="flex gap-2 mb-4">
          {(["daily", "weekly"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t
                  ? t === "daily"
                    ? "bg-gordemy-blue/20 border border-gordemy-blue/40 text-gordemy-blue"
                    : "bg-gordemy-orange/20 border border-gordemy-orange/40 text-gordemy-orange"
                  : "border border-gordemy-border text-gordemy-muted hover:text-white"
              }`}
            >
              {t === "daily" ? "📅 Щоденні" : "🗓️ Тижневі"}
            </button>
          ))}
        </div>

        {/* Hint */}
        {canClaimCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-gordemy-green/30 bg-gordemy-green/5 px-4 py-3 text-sm text-gordemy-green font-semibold text-center"
          >
            🎁 У тебе {canClaimCount} нагород{canClaimCount === 1 ? "а" : "и"} чекає!
          </motion.div>
        )}

        {/* Quest list */}
        <div className="space-y-3">
          {currentQuests.map((quest, i) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <QuestCard
                quest={quest}
                onClaim={handleClaim}
                claiming={claiming}
              />
            </motion.div>
          ))}
        </div>

        {/* Empty state */}
        {currentQuests.length === 0 && (
          <div className="text-center py-16 text-gordemy-muted">
            <div className="text-4xl mb-3">🔮</div>
            <div className="font-bold">Завантаження квестів...</div>
          </div>
        )}

        {/* All done state */}
        {currentQuests.length > 0 && currentQuests.every(q => q.completed) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 rounded-2xl border border-gordemy-green/40 bg-gordemy-green/5 p-6 text-center"
          >
            <div className="text-4xl mb-3">🏆</div>
            <div className="font-black text-white text-lg">Всі квести виконано!</div>
            <div className="text-sm text-gordemy-muted mt-1">
              {tab === "daily"
                ? "Повертайся завтра за новими квестами"
                : "Нові тижневі квести у понеділок"}
            </div>
          </motion.div>
        )}

        {/* XP/Gems info */}
        <div className="mt-8 rounded-2xl border border-gordemy-border bg-gordemy-card p-4">
          <h3 className="text-sm font-bold text-white mb-3">💡 Як заробити нагороди</h3>
          <div className="space-y-2 text-xs text-gordemy-muted">
            <div className="flex items-center gap-2">
              <span>⚔️</span>
              <span>Бийся з Босами на сторінці <Link href="/boss" className="text-gordemy-blue hover:underline">Денний Бос</Link></span>
            </div>
            <div className="flex items-center gap-2">
              <span>📚</span>
              <span>Виконуй завдання в <Link href="/learn" className="text-gordemy-blue hover:underline">Навчанні</Link></span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔥</span>
              <span>Заходь щодня — стрік росте</span>
            </div>
          </div>
        </div>
      </div>

      {/* Claim toast */}
      <AnimatePresence>
        {claimResult && (
          <ClaimToast
            result={claimResult}
            onDone={() => setClaimResult(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
