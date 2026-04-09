"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { completeTask, type Task, type Question } from "@/lib/student";
import { GlowButton } from "@/components/ui/glow-button";
import { AchievementPopup } from "@/components/achievement-popup";
import type { Achievement } from "@/lib/achievements";
import { getXPMultiplier, getSpeedBonus } from "@/lib/gamification";

type TaskWithQuestion = Task & { question: Question | null };

async function getNextIncompleteTaskId(userId: string): Promise<string | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("tasks")
    .select("id")
    .eq("student_id", userId)
    .eq("date", today)
    .eq("completed", false)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

function LearnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("task");
  const { user, loading: authLoading } = useAuth();

  const [task, setTask] = useState<TaskWithQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    earnedXp: number;
    newStreak: number;
    levelUp: boolean;
    speedBonus: { bonusXP: number; label: string; emoji: string };
    multiplierActive: boolean;
    multiplierLabel: string;
  } | null>(null);
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  const [currentPopup, setCurrentPopup] = useState<Achievement | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(false);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    const userId = user.id;

    async function loadTask() {
      // Reset UI state for each new task route
      setLoading(true);
      setTask(null);
      setSelectedAnswer(null);
      setSubmitted(false);
      setResult(null);
      setPendingAchievements([]);
      setCurrentPopup(null);
      setTimerActive(false);
      if (timerRef.current) clearInterval(timerRef.current);

      const currentTaskId = taskId || await getNextIncompleteTaskId(userId);
      if (!currentTaskId) { router.push("/dashboard"); return; }

      const { data } = await supabase
        .from("tasks")
        .select("*, question:questions(*)")
        .eq("id", currentTaskId)
        .single();

      if (!data) { router.push("/dashboard"); return; }
      if (data.completed) {
        const nextTaskId = await getNextIncompleteTaskId(userId);
        if (nextTaskId) router.replace(`/learn?task=${nextTaskId}`);
        else router.push("/dashboard");
        return;
      }
      setTask(data as any);
      setLoading(false);
      // Start timer
      startTimeRef.current = Date.now();
      setTimerActive(true);
      setSecondsLeft(30);
    }

    loadTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, taskId, router]);

  // Countdown timer
  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive]);

  const handleSubmit = async () => {
    if (selectedAnswer === null || !task || !task.question || !user) return;
    setSubmitted(true);
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const secondsTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const isCorrect = selectedAnswer === task.question.correct_answer;
    const xpMultiplier = getXPMultiplier();
    const speedBonus = getSpeedBonus(secondsTaken);

    // Calculate total XP: base * multiplier + speed bonus
    const baseXP = task.xp_reward;
    const multipliedXP = Math.round(baseXP * xpMultiplier.multiplier);
    const totalXP = multipliedXP + (isCorrect ? speedBonus.bonusXP : 0);

    const { newXp, newStreak, levelUp, newAchievements } = await completeTask(
      user.id, task.id, selectedAnswer, isCorrect, totalXP, secondsTaken
    );

    setResult({
      isCorrect,
      earnedXp: newXp,
      newStreak,
      levelUp,
      speedBonus: isCorrect ? speedBonus : { bonusXP: 0, label: "", emoji: "" },
      multiplierActive: xpMultiplier.active,
      multiplierLabel: xpMultiplier.label,
    });

    if (newAchievements.length > 0) {
      setPendingAchievements(newAchievements.slice(1));
      setCurrentPopup(newAchievements[0]);
    }
  };

  const handlePopupClose = () => {
    if (pendingAchievements.length > 0) {
      setCurrentPopup(pendingAchievements[0]);
      setPendingAchievements(prev => prev.slice(1));
    } else {
      setCurrentPopup(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-70px)]">
        <div className="text-gordemy-muted animate-pulse text-lg">Завантаження...</div>
      </div>
    );
  }

  if (!task || !task.question) return null;
  const question = task.question;
  const xpMult = getXPMultiplier();

  const difficultyColors: Record<string, string> = {
    easy: "text-gordemy-green", medium: "text-gordemy-blue", hard: "text-gordemy-orange",
  };
  const difficultyLabels: Record<string, string> = {
    easy: "Легко", medium: "Середнє", hard: "Складно",
  };

  const timerColor = secondsLeft > 15 ? "text-gordemy-green" : secondsLeft > 7 ? "text-gordemy-orange" : "text-red-400";
  const timerPercent = (secondsLeft / 30) * 100;

  return (
    <div className="max-w-[520px] mx-auto px-6 py-8">
      <AchievementPopup achievement={currentPopup} onClose={handlePopupClose} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push("/dashboard")} className="text-sm text-gordemy-muted hover:text-white transition-colors">
          ← До дашборду
        </button>
        <div className="flex items-center gap-3">
          {xpMult.active && !submitted && (
            <span className="text-xs font-bold text-gordemy-orange animate-pulse">
              {xpMult.emoji} x{xpMult.multiplier}
            </span>
          )}
          <span className={`text-xs font-semibold ${difficultyColors[task.difficulty]}`}>
            {difficultyLabels[task.difficulty]}
          </span>
          <span className="text-xs text-gordemy-muted bg-gordemy-card px-2.5 py-1 rounded-lg border border-gordemy-border">
            +{task.xp_reward} XP
          </span>
        </div>
      </div>

      {/* Timer Bar */}
      {!submitted && (
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gordemy-muted">Час на відповідь</span>
            <span className={`text-sm font-black ${timerColor}`}>{secondsLeft}с</span>
          </div>
          <div className="h-2 bg-gordemy-border rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors ${
                secondsLeft > 15 ? "bg-gordemy-green" : secondsLeft > 7 ? "bg-gordemy-orange" : "bg-red-400"
              }`}
              animate={{ width: `${timerPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {secondsLeft <= 8 && (
            <div className="text-xs text-gordemy-orange mt-1 text-center animate-pulse">
              ⚡ Відповідай зараз — отримаєш бонус XP!
            </div>
          )}
        </div>
      )}

      {/* Topic */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="text-sm text-gordemy-blue font-semibold mb-2">
        {task.title}
      </motion.div>

      {/* Question */}
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="text-xl font-bold leading-relaxed mb-8">
        {question.question_text}
      </motion.h2>

      {/* Options */}
      <div className="flex flex-col gap-3 mb-8">
        {(question.options as string[]).map((option, i) => {
          let borderClass = "border-gordemy-border hover:border-gordemy-blue/40";
          let bgClass = "bg-gordemy-card";
          let textClass = "";

          if (submitted && result) {
            if (i === question.correct_answer) {
              borderClass = "border-gordemy-green"; bgClass = "bg-gordemy-green/10"; textClass = "text-gordemy-green";
            } else if (i === selectedAnswer && !result.isCorrect) {
              borderClass = "border-red-500"; bgClass = "bg-red-500/10"; textClass = "text-red-400";
            } else {
              borderClass = "border-gordemy-border opacity-50";
            }
          } else if (selectedAnswer === i) {
            borderClass = "border-gordemy-blue"; bgClass = "bg-gordemy-blue/10";
          }

          return (
            <motion.button key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              onClick={() => !submitted && setSelectedAnswer(i)}
              disabled={submitted}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${borderClass} ${bgClass} ${textClass} ${!submitted ? "cursor-pointer" : "cursor-default"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  submitted && i === question.correct_answer ? "border-gordemy-green bg-gordemy-green text-white"
                  : submitted && i === selectedAnswer && !result?.isCorrect ? "border-red-500 bg-red-500 text-white"
                  : selectedAnswer === i ? "border-gordemy-blue bg-gordemy-blue text-white"
                  : "border-gordemy-border"
                }`}>
                  {submitted && i === question.correct_answer ? "✓"
                    : submitted && i === selectedAnswer && !result?.isCorrect ? "✗"
                    : String.fromCharCode(65 + i)}
                </div>
                <span className="text-sm font-medium">{option}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Submit / Result */}
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div key="submit">
            <GlowButton onClick={handleSubmit} disabled={selectedAnswer === null} fullWidth className="!py-4">
              Перевірити
            </GlowButton>
          </motion.div>
        ) : result ? (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Result banner */}
            <div className={`rounded-2xl p-5 border ${result.isCorrect ? "bg-gordemy-green/10 border-gordemy-green/30" : "bg-red-500/10 border-red-500/30"}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{result.isCorrect ? "🎉" : "💪"}</span>
                <span className={`text-lg font-bold ${result.isCorrect ? "text-gordemy-green" : "text-red-400"}`}>
                  {result.isCorrect ? "Правильно!" : "Неправильно"}
                </span>
              </div>

              {/* XP breakdown */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-gordemy-blue font-bold">+{result.earnedXp} XP</span>
                  {result.newStreak > 1 && (
                    <span className="text-gordemy-orange font-semibold text-sm">🔥 {result.newStreak}д стрік</span>
                  )}
                  {result.levelUp && <span className="text-gordemy-purple font-semibold text-sm">⭐ Новий рівень!</span>}
                </div>
                {result.multiplierActive && (
                  <div className="text-xs text-gordemy-orange">✨ {result.multiplierLabel} активний!</div>
                )}
                {result.speedBonus.bonusXP > 0 && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1.5 text-xs font-bold text-gordemy-orange"
                  >
                    {result.speedBonus.emoji} {result.speedBonus.label} +{result.speedBonus.bonusXP} XP
                  </motion.div>
                )}
              </div>
            </div>

            {/* Explanation */}
            {question.explanation && (
              <div className="bg-gordemy-card border border-gordemy-border rounded-xl p-4">
                <div className="text-xs font-semibold text-gordemy-muted mb-1.5">Пояснення</div>
                <p className="text-sm leading-relaxed">{question.explanation}</p>
              </div>
            )}

            <GlowButton
              onClick={async () => {
                if (!user) return;
                const nextTaskId = await getNextIncompleteTaskId(user.id);
                if (nextTaskId) router.replace(`/learn?task=${nextTaskId}`);
                else router.push("/dashboard");
              }}
              color="green"
              fullWidth
              className="!py-4"
            >
              Продовжити →
            </GlowButton>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-70px)]"><div className="text-gordemy-muted animate-pulse text-lg">Завантаження...</div></div>}>
      <LearnContent />
    </Suspense>
  );
}
