"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { getStudent, getTodayTasks, generateDailyTasks, type Student, type Task, type Question } from "@/lib/student";
import { GlowButton } from "@/components/ui/glow-button";
import { DashboardSkeleton } from "@/components/ui/loading";
import Link from "next/link";

type TaskWithQuestion = Task & { question: Question | null };

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [tasks, setTasks] = useState<TaskWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    async function loadData() {
      const s = await getStudent(user!.id);
      if (!s) {
        router.push("/onboarding");
        return;
      }
      if (!s.onboarding_completed) {
        router.push("/onboarding");
        return;
      }

      setStudent(s);

      // Generate daily tasks if needed
      await generateDailyTasks(user!.id, s.subjects || []);
      const todayTasks = await getTodayTasks(user!.id);
      setTasks(todayTasks);
      setLoading(false);
    }

    loadData();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }

  if (!student) return null;

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const todayProgress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  const xpToNextLevel = ((student.level || 1) * 100) - (student.xp || 0);

  const subjectNames: Record<string, string> = {
    ukr: "🇺🇦 Укр", math: "📐 Мат", hist: "📜 Іст",
    eng: "🌍 Англ", bio: "🧬 Біо", phys: "⚡ Фіз",
    chem: "🧪 Хім", geo: "🗺️ Гео",
  };

  const difficultyColors: Record<string, string> = {
    easy: "text-gordemy-green bg-gordemy-green/10 border-gordemy-green/20",
    medium: "text-gordemy-blue bg-gordemy-blue/10 border-gordemy-blue/20",
    hard: "text-gordemy-orange bg-gordemy-orange/10 border-gordemy-orange/20",
  };

  return (
    <div className="max-w-[640px] mx-auto px-6 py-8">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-extrabold mb-1">
          Привіт, {student.name || "учень"}! 👋
        </h1>
        <p className="text-gordemy-muted text-sm">
          {completedCount === totalTasks && totalTasks > 0
            ? "Всі завдання на сьогодні виконано! Відпочинь або тренуйся далі."
            : `У тебе ${totalTasks - completedCount} завдань на сьогодні. Вперед!`}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-3 mb-8"
      >
        <StatCard label="Рівень" value={student.level || 1} icon="⭐" color="text-gordemy-orange" />
        <StatCard label="XP" value={student.xp || 0} icon="💎" color="text-gordemy-blue" />
        <StatCard label="Стрік" value={`${student.streak || 0}д`} icon="🔥" color="text-gordemy-orange" />
        <StatCard label="Задачі" value={student.total_tasks_completed || 0} icon="✅" color="text-gordemy-green" />
      </motion.div>

      {/* Today Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gordemy-card border border-gordemy-border rounded-2xl p-5 mb-6"
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold">Прогрес сьогодні</span>
          <span className="text-sm text-gordemy-muted">{completedCount}/{totalTasks}</span>
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
        {xpToNextLevel > 0 && (
          <p className="text-xs text-gordemy-muted mt-2">
            {xpToNextLevel} XP до рівня {(student.level || 1) + 1}
          </p>
        )}
      </motion.div>

      {/* Today's Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-bold mb-4">Завдання на сьогодні</h2>

        {tasks.length === 0 ? (
          <div className="text-center py-12 text-gordemy-muted">
            <div className="text-4xl mb-3">📚</div>
            <p>Завдання генеруються...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              >
                {task.completed ? (
                  <div className="bg-gordemy-card border border-gordemy-border rounded-xl p-4 opacity-60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                          task.is_correct
                            ? "bg-gordemy-green/20 text-gordemy-green"
                            : "bg-red-500/20 text-red-400"
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
                    </div>
                  </div>
                ) : (
                  <Link href={`/learn?task=${task.id}`}>
                    <div className="bg-gordemy-card border border-gordemy-border rounded-xl p-4 hover:border-gordemy-blue/40 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gordemy-blue/15 text-gordemy-blue flex items-center justify-center text-sm font-bold">
                            {subjectNames[task.subject]?.split(" ")[0] || "📝"}
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
          </div>
        )}
      </motion.div>

      {/* Subjects */}
      {student.subjects && student.subjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <h2 className="text-lg font-bold mb-3">Мої предмети</h2>
          <div className="flex flex-wrap gap-2">
            {student.subjects.map((s) => (
              <span
                key={s}
                className="bg-gordemy-card border border-gordemy-border rounded-xl px-3 py-2 text-sm"
              >
                {subjectNames[s] || s}
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