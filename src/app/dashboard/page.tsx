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
import { GlowButton } from "@/components/ui/glow-button";
import { DashboardSkeleton } from "@/components/ui/loading";
import Link from "next/link";
import { getLeague, getStudentAchievements, getAllAchievements, type Achievement } from "@/lib/achievements";

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

function getMotivationalBanner(student: Student, completedCount: number, totalTasks: number) {
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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [tasks, setTasks] = useState<TaskWithQuestion[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    async function loadData() {
      const s = await getStudent(user!.id);
      if (!s) { router.push("/onboarding"); return; }
      if (!s.onboarding_completed) { router.push("/onboarding"); return; }

      setStudent(s);
      await generateDailyTasks(user!.id, s.subjects || []);
      const [todayTasks, progress, earnedKeys, allAch] = await Promise.all([
        getTodayTasks(user!.id),
        getSubjectProgress(user!.id),
        getStudentAchievements(user!.id),
        getAllAchievements(),
      ]);
      setTasks(todayTasks);
      setSubjectProgress(progress);
      // Show last 3 earned achievements
      const earned = allAch.filter(a => earnedKeys.includes(a.key)).slice(-3).reverse();
      setRecentAchievements(earned);
      setLoading(false);
    }

    loadData();
  }, [user, authLoading, router]);

  const handleRefresh = async () => {
    if (!user || !student || refreshing) return;
    setRefreshing(true);
    await refreshDailyTasks(user.id, student.subjects || []);
    const newTasks = await getTodayTasks(user.id);
    setTasks(newTasks);
    setRefreshing(false);
  };

  if (authLoading || loading) return <DashboardSkeleton />;
  if (!student) return null;

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const todayProgress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  const league = getLeague(student.xp || 0);
  const xpForCurrentLevel = (student.level || 1 - 1) * 100;
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

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-extrabold mb-1">
          Привіт, {student.name || "учень"}! 👋
        </h1>
        <p className="text-gordemy-muted text-sm">
          {completedCount === totalTasks && totalTasks > 0
            ? "Всі завдання виконано! Відпочинь або тренуйся далі."
            : `${completedCount} з ${totalTasks} завдань виконано сьогодні`}
        </p>
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
          Дивитись рейтинг →
        </Link>
        <Link href="/achievements" className="ml-auto text-xs text-gordemy-muted hover:text-gordemy-orange transition-colors">
          🏆 Досягнення
        </Link>
      </motion.div>

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex gap-2 mb-6 flex-wrap"
        >
          {recentAchievements.map(a => (
            <Link key={a.key} href="/achievements">
              <div className="flex items-center gap-1.5 bg-gordemy-card border border-gordemy-border rounded-xl px-3 py-1.5 text-xs font-semibold hover:border-gordemy-muted/50 transition-all">
                <span>{a.icon}</span>
                <span>{a.name}</span>
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
            style={{ backgroundSize: "200% 100%", animation: "shimmer 2s infinite" }}
          />
        </div>
        <p className="text-xs text-gordemy-muted mt-1.5 text-center">
          {xpForNextLevel - (student.xp || 0)} XP до наступного рівня
        </p>
      </motion.div>

      {/* Today Progress + Refresh */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="w-5 h-5 rounded-full bg-gordemy-green/20 border border-gordemy-green/40 flex items-center justify-center text-[10px]"
              >✓</motion.div>
            ))}
            {Array.from({ length: totalTasks - completedCount }).map((_, i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-gordemy-border/30 border border-gordemy-border" />
            ))}
          </div>
        )}
      </motion.div>

      {/* Today's Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <h2 className="text-lg font-bold mb-4">
          Завдання на сьогодні
          <span className="ml-2 text-sm font-normal text-gordemy-muted">({totalTasks} задач)</span>
        </h2>

        <AnimatePresence mode="wait">
          {tasks.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gordemy-muted"
            >
              <div className="text-4xl mb-3">📚</div>
              <p>Завдання генеруються...</p>
            </motion.div>
          ) : (
            <motion.div key="tasks" className="flex flex-col gap-3">
              {tasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.04 }}
                >
                  {task.completed ? (
                    <div className="bg-gordemy-card border border-gordemy-border rounded-xl p-4 opacity-60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                            task.is_correct ? "bg-gordemy-green/20 text-gordemy-green" : "bg-red-500/20 text-red-400"
                          }`}>
                            {task.is_correct ? "✓" : "✗"}
                          </div>
                          <div>
                            <div className="text-sm font-semibold line-through">{task.title}</div>
                            <div className="text-xs text-gordemy-muted">
                              +{task.is_correct ? task.xp_reward : Math.floor(task.xp_reward / 2)} XP
                            </div>
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
                              <div className="text-sm font-semibold group-hover:text-gordemy-blue transition-colors">
                                {task.title}
                              </div>
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-lg font-bold mb-4">Прогрес по предметах</h2>
          <div className="flex flex-col gap-3">
            {subjectProgress.map((sp, i) => (
              <motion.div
                key={sp.subject}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.05 }}
                className="bg-gordemy-card border border-gordemy-border rounded-xl p-4"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">
                    {subjectNames[sp.subject] || sp.subject}
                  </span>
                  <span className={`text-sm font-bold ${
                    sp.percent >= 80 ? "text-gordemy-green"
                    : sp.percent >= 60 ? "text-gordemy-blue"
                    : sp.percent >= 40 ? "text-gordemy-orange"
                    : "text-red-400"
                  }`}>
                    {sp.percent}% ({sp.correct}/{sp.total})
                  </span>
                </div>
                <div className="h-2 bg-gordemy-bg rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      sp.percent >= 80 ? "bg-gordemy-green"
                      : sp.percent >= 60 ? "bg-gordemy-blue"
                      : sp.percent >= 40 ? "bg-gordemy-orange"
                      : "bg-red-400"
                    }`}
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

      {/* My Subjects */}
      {student.subjects && student.subjects.length > 0 && subjectProgress.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-lg font-bold mb-3">Мої предмети</h2>
          <div className="flex flex-wrap gap-2">
            {student.subjects.map((s) => (
              <span
                key={s}
                className="bg-gordemy-card border border-gordemy-border rounded-xl px-3 py-2 text-sm"
              >
                {subjectShort[s] || s}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-gordemy-card border border-gordemy-border rounded-xl p-3 text-center">
      <div className="text-lg mb-0.5">{icon}</div>
      <div className={`text-xl font-extrabold ${color}`}>{value}</div>
      <div className="text-xs text-gordemy-muted">{label}</div>
    </div>
  );
}
