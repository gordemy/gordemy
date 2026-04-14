"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { saveNightChallengeResult } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";

interface Question {
  id: string;
  text: string;
  options: string[];
  correct_index: number;
  subject: string;
}

interface NightChallengePopupProps {
  userId: string;
  onClose: () => void;
  alreadyAttempted: boolean;
}

const NIGHT_SUBJECTS = ["math", "ukr", "history", "english"];
const MOTIVATIONAL = [
  "Хто вчиться вночі — вранці переможець ⚡",
  "Поки всі сплять, ти ростеш 🌙",
  "Ніч — час чемпіонів 🏆",
  "One question. 150 XP. Let's go 🔥",
];

export function NightChallengePopup({ userId, onClose, alreadyAttempted }: NightChallengePopupProps) {
  const [question, setQuestion]   = useState<Question | null>(null);
  const [selected, setSelected]   = useState<number | null>(null);
  const [phase, setPhase]         = useState<"loading" | "question" | "result">("loading");
  const [won, setWon]             = useState(false);
  const [timeLeft, setTimeLeft]   = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [motivation]              = useState(() => MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]);

  useEffect(() => {
    if (alreadyAttempted) { setPhase("result"); return; }
    loadQuestion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadQuestion() {
    const subject = NIGHT_SUBJECTS[Math.floor(Math.random() * NIGHT_SUBJECTS.length)];
    const { data } = await supabase
      .from("questions")
      .select("id, text, options, correct_index, subject")
      .eq("subject", subject)
      .limit(50);

    if (data && data.length > 0) {
      const q = data[Math.floor(Math.random() * data.length)];
      setQuestion(q as Question);
    }
    setPhase("question");
    setTimerActive(true);
  }

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id);
          handleAnswer(-1); // time out = wrong
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive]);

  async function handleAnswer(idx: number) {
    if (!question || selected !== null) return;
    setTimerActive(false);
    setSelected(idx);
    const correct = idx === question.correct_index;
    setWon(correct);
    await saveNightChallengeResult(userId, question.id, correct);
    setTimeout(() => setPhase("result"), 900);
  }

  const timerPct = (timeLeft / 30) * 100;
  const timerColor = timeLeft > 15 ? "from-emerald-500 to-teal-400" : timeLeft > 7 ? "from-amber-500 to-orange-400" : "from-rose-500 to-red-600";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md px-4"
      onClick={phase === "result" ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 18 }}
        className="relative w-full max-w-[380px] rounded-3xl border-2 border-indigo-500/50 bg-zinc-950 overflow-hidden shadow-2xl shadow-indigo-500/20"
        onClick={e => e.stopPropagation()}
      >
        {/* Starfield background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-0.5 h-0.5 rounded-full bg-white"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.5 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </div>

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <motion.span
              className="text-2xl"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              🌙
            </motion.span>
            <div>
              <div className="text-sm font-black text-white uppercase tracking-wide">Night Challenge</div>
              <div className="text-[10px] text-indigo-400 font-medium">{motivation}</div>
            </div>
            {!alreadyAttempted && phase === "question" && (
              <div className="ml-auto text-right">
                <div className={`text-lg font-black ${timeLeft <= 7 ? "text-rose-400" : "text-white"}`}>
                  {timeLeft}с
                </div>
                <div className="text-[9px] text-zinc-500">залишилось</div>
              </div>
            )}
          </div>

          {/* Timer bar */}
          {phase === "question" && !alreadyAttempted && (
            <div className="h-1.5 rounded-full bg-zinc-800 mb-4 overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${timerColor}`}
                animate={{ width: `${timerPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}

          {/* Question phase */}
          {phase === "loading" && (
            <div className="flex items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent"
              />
            </div>
          )}

          {phase === "question" && question && (
            <>
              <div className="mb-5 text-sm font-bold text-white leading-relaxed bg-zinc-900/80 rounded-2xl p-4 border border-zinc-800">
                {question.text}
              </div>

              <div className="space-y-2.5">
                {(question.options as string[]).map((opt, i) => {
                  const isSelected = selected === i;
                  const isCorrect  = i === question.correct_index;
                  let btnClass = "border-zinc-700/60 bg-zinc-900/60 text-zinc-200";
                  if (selected !== null) {
                    if (isCorrect) btnClass = "border-emerald-500 bg-emerald-500/20 text-emerald-300";
                    else if (isSelected) btnClass = "border-rose-500 bg-rose-500/20 text-rose-300";
                    else btnClass = "border-zinc-800 bg-zinc-900/30 text-zinc-500";
                  }

                  return (
                    <motion.button
                      key={i}
                      whileTap={selected === null ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswer(i)}
                      disabled={selected !== null}
                      className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${btnClass}`}
                    >
                      <span className="font-black mr-2 text-zinc-500">{["A", "B", "C", "D"][i]}.</span>
                      {opt}
                      {selected !== null && isCorrect && <span className="float-right">✅</span>}
                      {selected !== null && isSelected && !isCorrect && <span className="float-right">❌</span>}
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}

          {/* Result phase */}
          {phase === "result" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center"
            >
              {alreadyAttempted ? (
                <>
                  <div className="text-5xl mb-3">⏰</div>
                  <div className="text-white font-black text-lg mb-1">Вже пройдено!</div>
                  <div className="text-zinc-400 text-sm">Повернись завтра о 21:00</div>
                </>
              ) : won ? (
                <>
                  <motion.div
                    className="text-6xl mb-3"
                    animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.6, repeat: 2 }}
                  >
                    🌟
                  </motion.div>
                  <div className="text-white font-black text-xl mb-1">Правильно!</div>
                  <div className="text-emerald-400 font-black text-2xl mb-1">+150 XP</div>
                  <div className="text-zinc-400 text-sm">Нічний чемпіон!</div>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">💤</div>
                  <div className="text-white font-black text-lg mb-1">Не вийшло</div>
                  <div className="text-zinc-400 font-bold text-lg mb-1">+30 XP</div>
                  <div className="text-zinc-500 text-sm">За спробу теж дають XP. Повертайся завтра!</div>
                </>
              )}

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={onClose}
                className="mt-5 w-full py-3 rounded-2xl font-black text-white bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                Закрити
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Bottom reward hint */}
        {phase === "question" && (
          <div className="border-t border-zinc-800 px-6 py-2 flex justify-between text-[10px] text-zinc-500 font-bold">
            <span>✅ Правильно → +150 XP</span>
            <span>❌ Неправильно → +30 XP</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
