"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { getStudent } from "@/lib/student";
import Link from "next/link";

// ─── NMT Score milestones ──────────────────────────────────────────────────

interface Milestone {
  score: number;
  label: string;
  emoji: string;
  reward: string;
  color: string;
  description: string;
}

const MILESTONES: Milestone[] = [
  { score: 100, label: "Старт",        emoji: "🌱", reward: "100 XP",  color: "text-zinc-400",   description: "Перший крок до НМТ" },
  { score: 115, label: "Новачок",      emoji: "📚", reward: "150 XP",  color: "text-blue-400",   description: "Базові знання є" },
  { score: 125, label: "Учень",        emoji: "✏️", reward: "💎×10",   color: "text-cyan-400",   description: "Вище середнього" },
  { score: 140, label: "Студент",      emoji: "🎓", reward: "200 XP",  color: "text-teal-400",   description: "Хороший рівень" },
  { score: 150, label: "Претендент",   emoji: "⚡", reward: "💎×25",   color: "text-green-400",  description: "Університет відкритий" },
  { score: 160, label: "Майстер",      emoji: "🔥", reward: "300 XP",  color: "text-amber-400",  description: "Топ-50% в Україні" },
  { score: 170, label: "Чемпіон",      emoji: "🏆", reward: "💎×50",   color: "text-orange-400", description: "Топ-25%" },
  { score: 180, label: "Еліта",        emoji: "💎", reward: "500 XP",  color: "text-purple-400", description: "Топ-10%" },
  { score: 190, label: "Легенда",      emoji: "⭐", reward: "💎×100",  color: "text-pink-400",   description: "Топ-5%" },
  { score: 200, label: "НМТ Чемпіон",  emoji: "👑", reward: "🎫 Легендарний ранг", color: "text-yellow-300", description: "Максимальний бал!" },
];

// Convert XP to estimated NMT score (simple formula)
function xpToNMTScore(xp: number, tasks: number): number {
  // Each 10 correct answers ≈ 1 point towards NMT (rough estimation)
  const base = 100;
  const fromXP = Math.min(85, Math.floor(xp / 50));
  const fromTasks = Math.min(15, Math.floor(tasks / 20));
  return Math.min(200, base + fromXP + fromTasks);
}

export default function NMTRoadPage() {
  const { user } = useAuth();
  const [nmtScore, setNmtScore] = useState(100);
  const [level, setLevel]       = useState(1);
  const [xp, setXp]             = useState(0);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    getStudent(user.id).then(st => {
      if (st) {
        const s = st as any;
        const estimated = xpToNMTScore(s.xp || 0, s.total_tasks_completed || 0);
        setNmtScore(estimated);
        setLevel(s.level || 1);
        setXp(s.xp || 0);
      }
      setLoading(false);
    });
  }, [user]);

  const currentMilestoneIdx = MILESTONES.findIndex(m => nmtScore < m.score);
  const effectiveIdx = currentMilestoneIdx === -1 ? MILESTONES.length - 1 : Math.max(0, currentMilestoneIdx - 1);
  const nextMilestone = MILESTONES[effectiveIdx + 1] || MILESTONES[MILESTONES.length - 1];
  const prevScore = MILESTONES[effectiveIdx]?.score ?? 100;
  const progressToNext = nextMilestone
    ? ((nmtScore - prevScore) / (nextMilestone.score - prevScore)) * 100
    : 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black pb-24">
      <div className="max-w-[480px] mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-zinc-500 hover:text-white transition-colors">←</Link>
          <div>
            <h1 className="text-lg font-black text-white">🛤️ Шлях до 200 НМТ</h1>
            <p className="text-xs text-zinc-500">Твій прогрес до максимального балу</p>
          </div>
        </div>

        {/* Current score card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-indigo-500/40 bg-indigo-950/30 p-5 mb-6 text-center"
        >
          <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
            Твій прогнозований бал НМТ
          </div>
          <motion.div
            className="text-6xl font-black text-white mb-1"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            {nmtScore}
          </motion.div>
          <div className={`text-sm font-black ${MILESTONES[effectiveIdx].color}`}>
            {MILESTONES[effectiveIdx].emoji} {MILESTONES[effectiveIdx].label}
          </div>
          <div className="text-xs text-zinc-500 mt-1">{MILESTONES[effectiveIdx].description}</div>

          {/* Progress to next */}
          {nextMilestone && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5">
                <span>До "{nextMilestone.label}"</span>
                <span>{nextMilestone.score - nmtScore} балів</span>
              </div>
              <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(4, progressToNext)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Milestones road */}
        <div className="relative">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">📍 Milestone Map</h2>

          {/* Vertical line */}
          <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-zinc-800" />

          <div className="space-y-3">
            {MILESTONES.map((m, i) => {
              const reached = nmtScore >= m.score;
              const isCurrent = i === effectiveIdx;

              return (
                <motion.div
                  key={m.score}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative flex items-start gap-4 pl-14 cursor-pointer`}
                  onClick={() => setSelectedMilestone(selectedMilestone?.score === m.score ? null : m)}
                >
                  {/* Node */}
                  <div className={`absolute left-3.5 -translate-x-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${
                    reached
                      ? "border-indigo-500 bg-indigo-500"
                      : isCurrent
                      ? "border-indigo-500 bg-zinc-900 animate-pulse"
                      : "border-zinc-700 bg-zinc-900"
                  }`}>
                    {reached && <div className="w-2 h-2 rounded-full bg-white" />}
                    {isCurrent && !reached && <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />}
                  </div>

                  {/* Card */}
                  <div className={`flex-1 rounded-2xl border p-3 transition-all ${
                    isCurrent
                      ? "border-indigo-500/60 bg-indigo-950/30"
                      : reached
                      ? "border-zinc-700/40 bg-zinc-900/30"
                      : "border-zinc-800/40 bg-zinc-950/30 opacity-50"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{m.emoji}</span>
                        <div>
                          <div className={`text-xs font-black ${reached || isCurrent ? m.color : "text-zinc-600"}`}>
                            {m.score} балів — {m.label}
                          </div>
                          <div className="text-[10px] text-zinc-500">{m.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-yellow-400">{m.reward}</div>
                        {reached && <div className="text-[9px] text-zinc-500">✅ Отримано</div>}
                      </div>
                    </div>

                    {/* Expanded description */}
                    <AnimatePresence>
                      {selectedMilestone?.score === m.score && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 pt-2 border-t border-zinc-800 text-xs text-zinc-400">
                            {reached
                              ? `🎉 Вітаємо! Ти досяг ${m.score} балів. Нагорода: ${m.reward}`
                              : `Потрібно ще ${m.score - nmtScore} балів. Продовжуй вирішувати задачі!`
                            }
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 space-y-3">
          <div className="text-xs text-center text-zinc-600 mb-2">
            Грай більше → бал зростає автоматично
          </div>
          <Link href="/boss">
            <motion.div
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-center"
            >
              ⚔️ Битись з Босом (+XP)
            </motion.div>
          </Link>
          <Link href="/weakspot">
            <motion.div
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-2xl border border-zinc-700 text-zinc-300 font-bold text-center text-sm"
            >
              🎯 Тренувати слабкі місця
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
}
