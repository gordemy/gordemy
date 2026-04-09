"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getStudent, saveQuestionHistory } from "@/lib/student";
import { getXPMultiplier, getSpeedBonus } from "@/lib/gamification";
import { ChestPopup, rollChest, type ChestTier } from "@/components/chest-popup";
import Link from "next/link";

// ─── Constants ───────────────────────────────────────────────────────────────

const SUBJECT_NAMES: Record<string, string> = {
  ukr: "🇺🇦 Українська", math: "📐 Математика", hist: "📜 Історія",
  eng: "🌍 Англійська", bio: "🧬 Біологія", phys: "⚡ Фізика", chem: "🧪 Хімія",
};

const TIME_PER_QUESTION = 30;
const QUESTIONS_COUNT = 5;

interface Question {
  id: string; subject: string; topic: string; difficulty: string;
  question_text: string; options: string[]; correct_answer: number;
  explanation: string | null;
}

type Phase = "select" | "quiz" | "result";

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TestPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("select");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chosenSubject, setChosenSubject] = useState<string>("");
  const [chosenDiff, setChosenDiff] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<{ correct: boolean; speedBonus: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [totalXP, setTotalXP] = useState(0);
  const [loading, setLoading] = useState(false);
  const [chest, setChest] = useState<ChestTier | null>(null);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    getStudent(user.id).then(s => {
      if (s) setSubjects(s.subjects?.length ? s.subjects : ["ukr", "math", "hist"]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const startQuiz = async () => {
    setLoading(true);
    let query = supabase.from("questions").select("*").limit(50);
    if (chosenSubject) query = query.eq("subject", chosenSubject);
    else query = query.in("subject", subjects);
    if (chosenDiff !== "mixed") query = query.eq("difficulty", chosenDiff);

    const { data } = await query;
    const shuffled = (data || []).sort(() => Math.random() - 0.5).slice(0, QUESTIONS_COUNT) as Question[];
    setQuestions(shuffled);
    setCurrentQ(0);
    setAnswers([]);
    setTotalXP(0);
    setPhase("quiz");
    setLoading(false);
    startQuestion();
  };

  const startQuestion = () => {
    setSelected(null);
    setSubmitted(false);
    setTimeLeft(TIME_PER_QUESTION);
    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (phase === "quiz" && questions.length > 0) startQuestion();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, phase, questions.length]);

  const handleAutoSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const q = questions[currentQ];
    if (!q) return;
    const secondsTaken = TIME_PER_QUESTION;
    processAnswer(-1, q, secondsTaken);
  };

  const handleSelect = (idx: number) => {
    if (submitted || selected !== null) return;
    setSelected(idx);
    if (timerRef.current) clearInterval(timerRef.current);
    const secondsTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const q = questions[currentQ];
    processAnswer(idx, q, secondsTaken);
  };

  const processAnswer = (idx: number, q: Question, secondsTaken: number) => {
    setSubmitted(true);
    const correct = idx === q.correct_answer;
    const xpMult = getXPMultiplier();
    const speedBonus = correct ? getSpeedBonus(secondsTaken) : { bonusXP: 0 };
    const baseXP = q.difficulty === "hard" ? 30 : q.difficulty === "medium" ? 20 : 10;
    const earned = correct ? Math.round(baseXP * xpMult.multiplier) + speedBonus.bonusXP : 0;
    if (user) {
      void saveQuestionHistory({
        userId: user.id,
        questionId: q.id,
        wasCorrect: correct,
        mode: "test",
        answerTimeSec: Math.max(1, secondsTaken),
      });
    }
    setTotalXP(p => p + earned);
    setAnswers(p => [...p, { correct, speedBonus: speedBonus.bonusXP }]);
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      // Save XP to DB
      if (user && totalXP > 0) {
        supabase.from("students").select("xp, level").eq("id", user.id).single().then(({ data: s }) => {
          if (s) {
            const newXp = (s.xp || 0) + totalXP;
            supabase.from("students").update({ xp: newXp, level: Math.floor(newXp / 100) + 1 }).eq("id", user.id);
          }
        });
      }
      // Roll for chest
      const newAnswers = [...answers, { correct: false, speedBonus: 0 }]; // last answer already appended
      const correctCount = answers.filter(a => a.correct).length;
      const chestTier = rollChest(correctCount, QUESTIONS_COUNT);
      if (chestTier) setChest(chestTier);
      setPhase("result");
    } else {
      setCurrentQ(p => p + 1);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[540px] mx-auto px-4 py-8">

      {/* SELECT */}
      {phase === "select" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard" className="text-gordemy-muted hover:text-white text-sm">← Назад</Link>
            <span className="text-gordemy-muted">•</span>
            <span className="text-gordemy-blue font-bold text-sm">🧪 Mini Test</span>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-white mb-1">Mini Test Mode</h1>
            <p className="text-gordemy-muted text-sm">5 питань, {TIME_PER_QUESTION}с на кожне. Швидкість = більше XP.</p>
          </div>

          {/* Subject */}
          <div>
            <div className="text-sm font-bold text-white mb-3">Обери предмет</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setChosenSubject("")}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${!chosenSubject ? "border-gordemy-blue bg-gordemy-blue/20 text-gordemy-blue" : "border-gordemy-border text-gordemy-muted hover:border-gordemy-muted"}`}
              >
                🎲 Випадковий
              </button>
              {subjects.map(s => (
                <button key={s}
                  onClick={() => setChosenSubject(s)}
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${chosenSubject === s ? "border-gordemy-blue bg-gordemy-blue/20 text-gordemy-blue" : "border-gordemy-border text-gordemy-muted hover:border-gordemy-muted"}`}
                >
                  {SUBJECT_NAMES[s] || s}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <div className="text-sm font-bold text-white mb-3">Складність</div>
            <div className="grid grid-cols-4 gap-2">
              {(["mixed", "easy", "medium", "hard"] as const).map(d => (
                <button key={d}
                  onClick={() => setChosenDiff(d)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${chosenDiff === d
                    ? d === "hard" ? "border-gordemy-orange bg-gordemy-orange/20 text-gordemy-orange"
                      : d === "medium" ? "border-gordemy-blue bg-gordemy-blue/20 text-gordemy-blue"
                      : d === "easy" ? "border-gordemy-green bg-gordemy-green/20 text-gordemy-green"
                      : "border-gordemy-purple bg-gordemy-purple/20 text-gordemy-purple"
                    : "border-gordemy-border text-gordemy-muted hover:border-gordemy-muted"}`}
                >
                  {d === "mixed" ? "🎲 Міх" : d === "easy" ? "😊 Легко" : d === "medium" ? "🧠 Серед" : "💀 Важко"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startQuiz}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-gordemy-blue to-gordemy-purple text-white font-black text-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? "Завантаження..." : "🚀 Почати тест!"}
          </button>

          {/* XP Multiplier notice */}
          {getXPMultiplier().active && (
            <div className="text-center text-gordemy-orange text-sm animate-pulse">
              {getXPMultiplier().emoji} {getXPMultiplier().label} активний! Зараз XP x{getXPMultiplier().multiplier}
            </div>
          )}
        </motion.div>
      )}

      {/* QUIZ */}
      {phase === "quiz" && questions.length > 0 && (
        <div className="space-y-5">
          {/* Progress */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gordemy-muted">Питання {currentQ + 1}/{QUESTIONS_COUNT}</span>
            <span className="text-gordemy-blue font-bold">+{totalXP} XP</span>
          </div>

          {/* Timer */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gordemy-muted">Час</span>
              <span className={`font-black ${timeLeft > 15 ? "text-gordemy-green" : timeLeft > 7 ? "text-gordemy-orange" : "text-red-400"}`}>{timeLeft}с</span>
            </div>
            <div className="h-2 bg-gordemy-border rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${timeLeft > 15 ? "bg-gordemy-green" : timeLeft > 7 ? "bg-gordemy-orange" : "bg-red-400"}`}
                animate={{ width: `${(timeLeft / TIME_PER_QUESTION) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="text-xs text-gordemy-muted mb-2 uppercase tracking-wide">
                {SUBJECT_NAMES[questions[currentQ].subject] || questions[currentQ].subject} • {questions[currentQ].topic}
              </div>
              <p className="text-white font-semibold text-base leading-relaxed mb-5">
                {questions[currentQ].question_text}
              </p>

              <div className="grid grid-cols-1 gap-2">
                {questions[currentQ].options.map((opt, idx) => {
                  const isCorrect = idx === questions[currentQ].correct_answer;
                  const isSelected = selected === idx;
                  let style = "border-gordemy-border hover:border-gordemy-blue/50 bg-gordemy-dark";
                  if (submitted) {
                    if (isCorrect) style = "border-gordemy-green/60 bg-gordemy-green/15 text-gordemy-green";
                    else if (isSelected) style = "border-red-500/60 bg-red-900/20 text-red-400";
                  } else if (isSelected) {
                    style = "border-gordemy-blue bg-gordemy-blue/15";
                  }
                  return (
                    <button key={idx} onClick={() => handleSelect(idx)} disabled={submitted}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${style}`}>
                      <span className="text-gordemy-muted mr-2">{["А", "Б", "В", "Г"][idx]}.</span>{opt}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
                  {questions[currentQ].explanation && (
                    <div className="p-3 rounded-lg bg-gordemy-blue/10 border border-gordemy-blue/20 text-gordemy-blue text-xs">
                      💡 {questions[currentQ].explanation}
                    </div>
                  )}
                  <button onClick={nextQuestion}
                    className="w-full py-3 rounded-xl bg-gordemy-blue/20 border border-gordemy-blue/30 text-gordemy-blue font-bold hover:bg-gordemy-blue/30 transition-colors">
                    {currentQ + 1 >= QUESTIONS_COUNT ? "Результати →" : "Далі →"}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Chest popup */}
      <AnimatePresence>
        {chest && phase === "result" && user && (
          <ChestPopup tier={chest} userId={user.id} onClose={() => setChest(null)} />
        )}
      </AnimatePresence>

      {/* RESULT */}
      {phase === "result" && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
          <div>
            <div className="text-6xl mb-3">
              {answers.filter(a => a.correct).length >= 4 ? "🏆" : answers.filter(a => a.correct).length >= 3 ? "⭐" : "💪"}
            </div>
            <h2 className="text-3xl font-black text-white mb-1">Тест завершено!</h2>
            <p className="text-gordemy-muted">
              {answers.filter(a => a.correct).length} з {QUESTIONS_COUNT} правильно
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4">
              <div className="text-gordemy-green font-black text-2xl">{answers.filter(a => a.correct).length}</div>
              <div className="text-gordemy-muted text-xs">Правильно</div>
            </div>
            <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4">
              <div className="text-gordemy-blue font-black text-2xl">+{totalXP}</div>
              <div className="text-gordemy-muted text-xs">XP зароблено</div>
            </div>
            <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4">
              <div className="text-gordemy-orange font-black text-2xl">{answers.reduce((acc, a) => acc + a.speedBonus, 0)}</div>
              <div className="text-gordemy-muted text-xs">Speed бонус</div>
            </div>
          </div>

          {/* Answer breakdown */}
          <div className="flex gap-2 justify-center">
            {answers.map((a, i) => (
              <div key={i} className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm ${a.correct ? "border-gordemy-green/40 bg-gordemy-green/20 text-gordemy-green" : "border-red-500/40 bg-red-900/20 text-red-400"}`}>
                {a.correct ? "✓" : "✗"}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setPhase("select"); setAnswers([]); setTotalXP(0); }}
              className="flex-1 py-3 rounded-xl border border-gordemy-border text-gordemy-muted hover:text-white transition-colors">
              🔄 Ще раз
            </button>
            <Link href="/dashboard" className="flex-1 py-3 rounded-xl bg-gordemy-blue/20 border border-gordemy-blue/30 text-gordemy-blue font-bold text-center hover:bg-gordemy-blue/30 transition-colors">
              🏠 Дашборд
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
