"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import {
  getStudent, getTodayTasks, generateDailyTasks, refreshDailyTasks,
  getSubjectProgress,
  type Student, type Task, type Question, type SubjectProgress,
} from "@/lib/student";
import { DashboardSkeleton } from "@/components/ui/loading";
import Link from "next/link";
import { getLeague, getStudentAchievements, getAllAchievements, type Achievement } from "@/lib/achievements";
import {
  getYesterdayGhost, getTodayGhostProgress, getTodayBoss, getMyBossAttempt,
  checkWeeklyReset, useStreakShield,
  type GhostSnapshot, type BossFight, type BossAttempt,
} from "@/lib/gamification";
import { supabase } from "@/lib/supabase";

type TaskWithQuestion = Task & { question: Question | null };

const subjectNames: Record<string, string> = {
  ukr: "🇺🇦 Українська", math: "📐 Математика", hist: "📜 Історія",
  eng: "🌍 Англійська", bio: "🧬 Біологія", phys: "⚡ Фізика",
  chem: "🧪 Хімія", geo: "🗺️ Географія",
};

const subjectShort: Record<string, string> = {
  ukr: "🇺🇦 Укр", math: "📐 Мат", hist: "📜 Іст",
  eng: "🌍 Англ", bio: "🧬 Біо", phys: "⚡ Фіз",
  chem: "🧪 Хім", geo: "🗺️ Гео",
};

const difficultyColors: Record<string, string> = {
  easy: "text-gordemy-green bg-gordemy-green/10 border-gordemy-green/20",
  medium: "text-gordemy-blue bg-gordemy-blue/10 border-gordemy-blue/20",
  hard: "text-gordemy-orange bg-gordemy-orange/10 border-gordemy-orange/20",
};

function getMotivationalBanner(student: Student & { streak_shields?: number }, completedCount: number, totalTasks: number) {
  const hour = new Date().getHours();
  const streak = student.streak || 0;
  const level = student.level || 1;

  if (completedCount === totalTasks && totalTasks > 0) {
    return { emoji: "🏆", text: "Всі завдання виконано! Ти — чемпіон сьогодні!", color: "from-gordemy-green/20 to-gordemy-green/5 border-gordemy-green/30" };
  }
  if (streak >= 7) {
    return { emoji: "🔥", text: `${streak} днів поспіль! Ти невпинний. Не зупиняйся!`, color: "from-gordemy-orange/20 to-gordemy-orange/5 border-gordemy-orange/30" };
  }
  if (streak >= 3) {
    return { emoji: "⚡", text: `${streak}-денний стрік! Так тримати — ти в потоці!`, color: "from-gordemy-purple/20 to-gordemy-purple/5 border-gordemy-purple/30" };
  }
  if (level >= 5) {
    return { emoji: "⭐", text: `Рівень ${level}! Ти вже досвідчений гравець Gordemy.`, color: "from-gordemy-orange/20 to-gordemy-orange/5 border-gordemy-orange/30" };
  }
  if (hour < 12) {
    return { emoji: "🌅", text: "Ранок — кращий час для навчання. Вперед до НМТ!", color: "from-gordemy-blue/20 to-gordemy-blue/5 border-gordemy-blue/30" };
  }
  if (hour >= 21) {
    return { emoji: "🌙", text: "Вечірнє завдання — це +1 до твого майбутнього балу.", color: "from-gordemy-purple/20 to-gordemy-purple/5 border-gordemy-purple/30" };
  }
  return { emoji: "🎯", text: `Привіт, ${student.name}! ${totalTasks - completedCount} завдань чекають. Поїхали!`, color: "from-gordemy-blue/20 to-gordemy-blue/5 border-gordemy-blue/30" };
}

// ─── Ghost Race Widget ──────────────────────────────────────────────────────

function GhostRaceWidget({ ghost, today, completedToday }: {
  ghost: GhostSnapshot | null;
  today: GhostSnapshot | null;
  completedToday: number;
}) {
  if (!ghost) {
    return (
      <div className="border border-dashed border-gordemy-border rounded-xl p-4 text-center">
        <div className="text-2xl mb-1">👻</div>
        <p className="text-gordemy-muted text-xs">Ghost Race активується завтра<br />після першого дня навчання</p>
      </div>
    );
  }

  const todayXP = today?.xp_earned || 0;
  const ghostXP = ghost.xp_earned || 0;
  const todayTasks = today?.tasks_completed || completedToday;
  const ghostTasks = ghost.tasks_completed || 0;
  const winning = todayXP >= ghostXP;
  const diff = Math.abs(todayXP - ghostXP);

  return (
    <div className={`border rounded-xl p-4 ${winning ? "border-gordemy-green/30 bg-gordemy-green/5" : "border-gordemy-orange/30 bg-gordemy-orange/5"}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">👻</span>
        <span className="text-sm font-bold text-white">Ghost Race</span>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${winning ? "bg-gordemy-green/20 text-gordemy-green" : "bg-gordemy-orange/20 text-gordemy-orange"}`}>
          {winning ? "✅ Ти попереду!" : "⚡ Жени!"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <div className="text-xs text-gordemy-muted mb-1">Ти сьогодні</div>
          <div className="text-gordemy-blue font-black text-xl">{todayXP} XP</div>
          <div className="text-gordemy-muted text-xs">{todayTasks} задач</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gordemy-muted mb-1">Ти вчора 👻</div>
          <div className="text-gordemy-muted font-black text-xl">{ghostXP} XP</div>
          <div className="text-gordemy-muted text-xs">{ghostTasks} задач</div>
        </div>
      </div>

      {diff > 0 && (
        <div className="mt-2 text-center text-xs text-gordemy-muted">
          {winning ? `Ти попереду на ${diff} XP 🎉` : `Відставання ${diff} XP — наздожени призрака!`}
        </div>
      )}

      {/* Progress bar comparison */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-12 text-gordemy-blue text-right">Ти</span>
          <div className="flex-1 bg-gordemy-border rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gordemy-blue rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${ghostXP > 0 ? Math.min(100, (todayXP / Math.max(todayXP, ghostXP)) * 100) : 50}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-12 text-gordemy-muted text-right">👻</span>
          <div className="flex-1 bg-gordemy-border rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gordemy-muted/50 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${ghostXP > 0 ? Math.min(100, (ghostXP / Math.max(todayXP, ghostXP)) * 100) : 50}%` }}
              transition={{ duration: 0.8, delay: 0.1 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Boss Card Widget ────────────────────────────────────────────────────────

function BossCard({ boss, attempt }: { boss: BossFight | null; attempt: BossAttempt | null }) {
  if (!boss) return null;

  return (
    <Link href="/boss">
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="relative overflow-hidden border border-gordemy-orange/40 rounded-xl bg-gradient-to-r from-red-900/20 to-gordemy-orange/10 p-4 cursor-pointer group"
      >
        {/* Animated glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-gordemy-orange/0 via-gordemy-orange/5 to-gordemy-orange/0 animate-pulse pointer-events-none" />

        <div className="flex items-center gap-3">
          <motion.span
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-3xl"
          >
            {boss.boss_emoji}
          </motion.span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gordemy-orange uppercase tracking-wide">⚔️ Boss Fight Day</span>
              {attempt ? (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${attempt.won ? "bg-gordemy-green/20 text-gordemy-green" : "bg-red-500/20 text-red-400"}`}>
                  {attempt.won ? "✅ Переміг" : "❌ Програв"}
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gordemy-orange/20 text-gordemy-orange font-bold animate-pulse">
                  🔴 LIVE
                </span>
              )}
            </div>
            <p className="text-white font-bold text-sm">{boss.boss_name}</p>
            <p className="text-gordemy-muted text-xs">+{boss.xp_reward} XP за перемогу • 💎 10 гемів</p>
          </div>
          <span className="text-gordemy-orange font-bold text-lg group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Streak Shield Widget ────────────────────────────────────────────────────

function StreakShieldWidget({ shields, streak, onUse }: {
  shields: number;
  streak: number;
  onUse: () => void;
}) {
  if (shields <= 0) return null;

  return (
    <div className="border border-gordemy-purple/30 rounded-xl bg-gordemy-purple/5 p-3 flex items-center gap-3">
      <span className="text-2xl">🛡️</span>
      <div className="flex-1">
        <div className="text-sm font-bold text-white">Streak Shield ×{shields}</div>
        <div className="text-xs text-gordemy-muted">Захищає стрік якщо пропустиш день</div>
      </div>
      {streak > 0 && (
        <button
          onClick={onUse}
          className="text-xs px-3 py-1.5 rounded-lg bg-gordemy-purple/20 border border-gordemy-purple/30 text-gordemy-purple hover:bg-gordemy-purple/30 transition-colors font-bold"
        >
          Використати
        </button>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskWithQuestion[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);

  // Gamification state
  const [ghost, setGhost] = useState<GhostSnapshot | null>(null);
  const [todayGhost, setTodayGhost] = useState<GhostSnapshot | null>(null);
  const [boss, setBoss] = useState<BossFight | null>(null);
  const [bossAttempt, setBossAttempt] = useState<BossAttempt | null>(null);
  const [shieldUsed, setShieldUsed] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    loadData();
  }, [user, authLoading, router]);

  async function loadData() {
    const s = await getStudent(user!.id);
    if (!s) { router.push("/onboarding"); return; }
    if (!s.onboarding_completed) { router.push("/onboarding"); return; }

    // Load extra fields (gems, shields)
    const { data: extraData } = await supabase
      .from("students")
      .select("streak_shields, gems, weekly_xp")
      .eq("id", user!.id)
      .single();

    setStudent({ ...s, ...(extraData || {}) });

    // Weekly reset check
    await checkWeeklyReset(user!.id);

    await generateDailyTasks(user!.id, s.subjects || []);

    const [todayTasks, progress, earnedKeys, allAch, ghostY, ghostT, bossData] = await Promise.all([
      getTodayTasks(user!.id),
      getSubjectProgress(user!.id),
      getStudentAchievements(user!.id),
      getAllAchievements(),
      getYesterdayGhost(user!.id),
      getTodayGhostProgress(user!.id),
      getTodayBoss(),
    ]);

    setTasks(todayTasks);
    setSubjectProgress(progress);
    setGhost(ghostY);
    setTodayGhost(ghostT);
    setBoss(bossData);

    if (bossData) {
      const attempt = await getMyBossAttempt(user!.id, bossData.id);
      setBossAttempt(attempt);
    }

    const earned = allAch.filter(a => earnedKeys.includes(a.key)).slice(-3).reverse();
    setRecentAchievements(earned);
    setLoading(false);
  }

  const handleRefresh = async () => {
    if (!user || !student || refreshing) return;
    setRefreshing(true);
    await refreshDailyTasks(user.id, student.subjects || []);
    const newTasks = await getTodayTasks(user.id);
    setTasks(newTasks);
    setRefreshing(false);
  };

  const handleUseShield = async () => {
    if (!user || shieldUsed) return;
    const ok = await useStreakShield(user.id);
    if (ok) {
      setStudent((prev: any) => ({ ...prev, streak_shields: (prev.streak_shields || 1) - 1 }));
      setShieldUsed(true);
    }
  };

  if (authLoading || loading) return <DashboardSkeleton />;
  if (!student) return null;

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const todayProgress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  const league = getLeague(student.xp || 0);
  const xpForNextLevel = (student.level || 1) * 100;
  const xpProgress = Math.min(100, Math.round(((student.xp || 0) % 100)));
  const banner = getMotivationalBanner(student, completedCount, totalTasks);

  return (
    <div className="max-w-[640px] mx-auto px-6 py-8">

      {/* Motivational Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r ${banner.color} border rounded-2xl px-5 py-4 mb-6 flex items-center gap-3`}
      >
        <span className="text-2xl">{banner.emoji}</span>
        <p className="text-sm font-semibold leading-snug">{banner.text}</p>
      </motion.div>

      {/* Greeting + Gems */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold mb-1">
            Привіт, {student.name || "учень"}! 👋
          </h1>
          <p className="text-gordemy-muted text-sm">
            {completedCount === totalTasks && totalTasks > 0
              ? "Всі завдання виконано! Відпочинь або тренуйся далі."
              : `${completedCount} з ${totalTasks} завдань виконано сьогодні`}
          </p>
        </div>
        {(student.gems || 0) > 0 && (
          <div className="flex items-center gap-1.5 bg-gordemy-card border border-gordemy-border rounded-xl px-3 py-2">
            <span className="text-lg">💎</span>
            <span className="text-white font-bold">{student.gems}</span>
          </div>
        )}
      </motion.div>

      {/* League Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${league.bg}`}>
          <span className="text-xl">{league.icon}</span>
          <span className={league.color}>{league.name}</span>
        </div>
        <Link href="/leaderboard" className="text-xs text-gordemy-muted hover:text-gordemy-blue transition-colors">
          Рейтинг →
        </Link>
        <Link href="/achievements" className="ml-auto text-xs text-gordemy-muted hover:text-gordemy-orange transition-colors">
          🏆 Досягнення
        </Link>
      </motion.div>

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="flex gap-2 mb-6 flex-wrap">
          {recentAchievements.map(a => (
            <Link key={a.key} href="/achievements">
              <div className="flex items-center gap-1.5 bg-gordemy-card border border-gordemy-border rounded-xl px-3 py-1.5 text-xs font-semibold hover:border-gordemy-muted/50 transition-all">
                <span>{a.icon}</span><span>{a.name}</span>
              </div>
            </Link>
          ))}
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-3 mb-6"
      >
        <StatCard label="Рівень" value={student.level || 1} icon="⭐" color="text-gordemy-orange" />
        <StatCard label="XP" value={student.xp || 0} icon="💎" color="text-gordemy-blue" />
        <StatCard label="Стрік" value={`${student.streak || 0}д`} icon="🔥" color="text-gordemy-orange" />
        <StatCard label="Задачі" value={student.total_tasks_completed || 0} icon="✅" color="text-gordemy-green" />
      </motion.div>

      {/* XP Level Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-gordemy-card border border-gordemy-border rounded-2xl p-4 mb-6"
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-gordemy-muted">Рівень {student.level || 1}</span>
          <span className="text-xs text-gordemy-muted">{student.xp || 0} / {xpForNextLevel} XP</span>
          <span className="text-xs font-semibold text-gordemy-muted">Рівень {(student.level || 1) + 1}</span>
        </div>
        <div className="h-3 bg-gordemy-bg rounded-full overflow-hidden relative">
          <motion.div
            className="h-full bg-gradient-to-r from-gordemy-blue via-gordemy-purple to-gordemy-blue rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        </div>
        <p className="text-xs text-gordemy-muted mt-1.5 text-center">
          {xpForNextLevel - (student.xp || 0)} XP до наступного рівня
        </p>
      </motion.div>

      {/* ── BOSS FIGHT CARD ─────────────────────────────── */}
      {boss && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mb-4">
          <BossCard boss={boss} attempt={bossAttempt} />
        </motion.div>
      )}

      {/* ── GHOST RACE ──────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-4">
        <GhostRaceWidget ghost={ghost} today={todayGhost} completedToday={completedCount} />
      </motion.div>

      {/* ── STREAK SHIELD ───────────────────────────────── */}
      {(student.streak_shields || 0) > 0 && !shieldUsed && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="mb-4">
          <StreakShieldWidget
            shields={student.streak_shields || 0}
            streak={student.streak || 0}
            onUse={handleUseShield}
          />
        </motion.div>
      )}

      {/* Game Mode Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-6">
        <Link href="/game">
          <div className="relative overflow-hidden bg-gradient-to-r from-gordemy-blue/20 via-gordemy-purple/20 to-gordemy-blue/20 border border-gordemy-blue/30 rounded-2xl p-5 hover:border-gordemy-blue/60 transition-all group cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-4xl">⚔️</span>
                <div>
                  <p className="text-sm font-extrabold text-white">Game Mode</p>
                  <p className="text-xs text-gordemy-muted mt-0.5">Бийся проти НМТ-бота та заробляй XP</p>
                </div>
              </div>
              <span className="text-gordemy-blue font-bold text-lg group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Today Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="bg-gordemy-card border border-gordemy-border rounded-2xl p-5 mb-6"
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold">Прогрес сьогодні</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gordemy-muted">{completedCount}/{totalTasks}</span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                refreshing
                  ? "text-gordemy-muted border-gordemy-border cursor-not-allowed"
                  : "text-gordemy-blue border-gordemy-blue/30 hover:bg-gordemy-blue/10 cursor-pointer"
              }`}
            >
              <span className={refreshing ? "animate-spin" : ""}>🔄</span>
              {refreshing ? "Оновлення..." : "Нові завдання"}
            </button>
          </div>
        </div>
        <div className="h-2.5 bg-gordemy-bg rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-gordemy-blue to-gordemy-purple rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${todayProgress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ boxShadow: "0 0 10px rgba(59,130,246,0.5)" }}
          />
        </div>
        {completedCount > 0 && (
          <div className="flex gap-1 mt-3 flex-wrap">
            {Array.from({ length: completedCount }).map((_, i) => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}
                className="w-5 h-5 rounded-full bg-gordemy-green/20 border border-gordemy-green/40 flex items-center justify-center text-[10px]">✓</motion.div>
            ))}
            {Array.from({ length: totalTasks - completedCount }).map((_, i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-gordemy-border/30 border border-gordemy-border" />
            ))}
          </div>
        )}
      </motion.div>

      {/* Today's Tasks */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
        <h2 className="text-lg font-bold mb-4">
          Завдання на сьогодні
          <span className="ml-2 text-sm font-normal text-gordemy-muted">({totalTasks} задач)</span>
        </h2>

        <AnimatePresence mode="wait">
          {tasks.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-gordemy-muted">
              <div className="text-4xl mb-3">📚</div>
              <p>Завдання генеруються...</p>
            </motion.div>
          ) : (
            <motion.div key="tasks" className="flex flex-col gap-3">
              {tasks.map((task, i) => (
                <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.04 }}>
                  {task.completed ? (
                    <div className="bg-gordemy-card border border-gordemy-border rounded-xl p-4 opacity-60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${task.is_correct ? "bg-gordemy-green/20 text-gordemy-green" : "bg-red-500/20 text-red-400"}`}>
                            {task.is_correct ? "✓" : "✗"}
                          </div>
                          <div>
                            <div className="text-sm font-semibold line-through">{task.title}</div>
                            <div className="text-xs text-gordemy-muted">+{task.is_correct ? task.xp_reward : Math.floor(task.xp_reward / 2)} XP</div>
                          </div>
                        </div>
                        <span className={`text-xs font-bold ${task.is_correct ? "text-gordemy-green" : "text-red-400"}`}>
                          {task.is_correct ? "Вірно" : "Хибно"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <Link href={`/learn?task=${task.id}`}>
                      <div className="bg-gordemy-card border border-gordemy-border rounded-xl p-4 hover:border-gordemy-blue/40 transition-all cursor-pointer group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gordemy-blue/15 text-gordemy-blue flex items-center justify-center text-sm font-bold">
                              {subjectShort[task.subject]?.split(" ")[0] || "📝"}
                            </div>
                            <div>
                              <div className="text-sm font-semibold group-hover:text-gordemy-blue transition-colors">{task.title}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs px-2 py-0.5 rounded-md border ${difficultyColors[task.difficulty]}`}>
                                  {task.difficulty === "easy" ? "Легко" : task.difficulty === "medium" ? "Середнє" : "Складно"}
                                </span>
                                <span className="text-xs text-gordemy-muted">+{task.xp_reward} XP</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-gordemy-muted group-hover:text-gordemy-blue transition-colors">→</span>
                        </div>
                      </div>
                    </Link>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Subject Progress */}
      {subjectProgress.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-8">
          <h2 className="text-lg font-bold mb-4">Прогрес по предметах</h2>
          <div className="flex flex-col gap-3">
            {subjectProgress.map((sp, i) => (
              <motion.div key={sp.subject} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.05 }}
                className="bg-gordemy-card border border-gordemy-border rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">{subjectNames[sp.subject] || sp.subject}</span>
                  <span className={`text-sm font-bold ${sp.percent >= 80 ? "text-gordemy-green" : sp.percent >= 60 ? "text-gordemy-blue" : sp.percent >= 40 ? "text-gordemy-orange" : "text-red-400"}`}>
                    {sp.percent}% ({sp.correct}/{sp.total})
                  </span>
                </div>
                <div className="h-2 bg-gordemy-bg rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${sp.percent >= 80 ? "bg-gordemy-green" : sp.percent >= 60 ? "bg-gordemy-blue" : sp.percent >= 40 ? "bg-gordemy-orange" : "bg-red-400"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${sp.percent}%` }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.6 + i * 0.05 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="bg-gordemy-card border border-gordemy-border rounded-xl p-3 text-center">
      <div className="text-lg mb-0.5">{icon}</div>
      <div className={`text-xl font-extrabold ${color}`}>{value}</div>
      <div className="text-xs text-gordemy-muted">{label}</div>
    </div>
  );
}
