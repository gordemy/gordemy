"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getStudent } from "@/lib/student";
import { getXPMultiplier, getSpeedBonus } from "@/lib/gamification";
import { ChestPopup, rollChest, type ChestTier } from "@/components/chest-popup";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string; subject: string; topic: string; difficulty: string;
  question_text: string; options: string[]; correct_answer: number;
  explanation: string | null;
}

interface Card {
  id: string;
  emoji: string;
  name: string;
  difficulty: "easy" | "medium" | "hard";
  xpBase: number;
  color: string;
  border: string;
  glow: string;
  description: string;
  flipped: boolean;
}

// ─── Card Deck ─────────────────────────────────────────────────────────────────

const CARD_TEMPLATES = [
  { emoji: "🧩", name: "Загадка",     difficulty: "easy"   as const, xpBase: 15,  color: "from-gordemy-green/30 to-gordemy-green/10",   border: "border-gordemy-green/40",   glow: "shadow-gordemy-green/20",   description: "Просте питання — легкий старт!" },
  { emoji: "⚡", name: "Виклик",     difficulty: "medium" as const, xpBase: 25,  color: "from-gordemy-blue/30 to-gordemy-blue/10",    border: "border-gordemy-blue/40",    glow: "shadow-gordemy-blue/20",    description: "Середня складність — більше XP!" },
  { emoji: "💀", name: "Ризик",      difficulty: "hard"   as const, xpBase: 50,  color: "from-gordemy-orange/30 to-gordemy-orange/10", border: "border-gordemy-orange/40",  glow: "shadow-gordemy-orange/20",  description: "Складне — але x3 XP!" },
  { emoji: "🎲", name: "Рулетка",   difficulty: "easy"   as const, xpBase: 20,  color: "from-gordemy-purple/30 to-gordemy-purple/10", border: "border-gordemy-purple/40",  glow: "shadow-gordemy-purple/20",  description: "Сюрприз! Не знаєш що прилетить" },
  { emoji: "🔮", name: "Містика",   difficulty: "medium" as const, xpBase: 35,  color: "from-purple-700/30 to-purple-900/10",         border: "border-purple-500/40",      glow: "shadow-purple-500/20",      description: "+Speed бонус якщо відповіси швидко!" },
  { emoji: "🌟", name: "Зірка",     difficulty: "hard"   as const, xpBase: 60,  color: "from-yellow-500/30 to-yellow-700/10",         border: "border-yellow-500/40",      glow: "shadow-yellow-500/20",      description: "Найважче питання — x4 XP!" },
];

type Phase = "deal" | "question" | "result";

const SUBJECT_NAMES: Record<string, string> = {
  ukr: "🇺🇦 Українська", math: "📐 Математика", hist: "📜 Історія",
  eng: "🌍 Англійська", bio: "🧬 Біологія", phys: "⚡ Фізика", chem: "🧪 Хімія",
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CardBattlePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("deal");
  const [cards, setCards] = useState<Card[]>([]);
  const [chosenCard, setChosenCard] = useState<Card | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25);
  const [totalXP, setTotalXP] = useState(0);
  const [round, setRound] = useState(0);
  const [roundResults, setRoundResults] = useState<{ correct: boolean; xp: number; cardName: string }[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [chest, setChest] = useState<ChestTier | null>(null);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_ROUNDS = 5;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    getStudent(user.id).then(s => {
      setStudentSubjects(s?.subjects?.length ? s.subjects : ["ukr", "math", "hist"]);
      setLoading(false);
      dealCards();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  function dealCards() {
    const shuffled = [...CARD_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 3);
    setCards(shuffled.map((t, i) => ({ ...t, id: String(i), flipped: false })));
    setPhase("deal");
  }

  async function chooseCard(card: Card) {
    setChosenCard(card);
    setLoading(true);

    const subjects = studentSubjects.length ? studentSubjects : ["ukr", "math", "hist"];
    let query = supabase.from("questions").select("*").in("subject", subjects).limit(30);
    if (card.difficulty !== "easy" || card.emoji !== "🎲") {
      query = query.eq("difficulty", card.difficulty);
    }
    const { data } = await query;
    if (!data || data.length === 0) { setLoading(false); return; }
    const q = (data as Question[])[Math.floor(Math.random() * data.length)];
    setQuestion(q);
    setSelected(null);
    setSubmitted(false);
    setTimeLeft(25);
    setLoading(false);
    setPhase("question");

    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) {
          clearInterval(timerRef.current!);
          processAnswer(-1, q, 25);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  }

  function processAnswer(idx: number, q: Question, secs: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(idx);
    setSubmitted(true);
    const correct = idx === q.correct_answer;
    const xpMult = getXPMultiplier();
    const speed = correct ? getSpeedBonus(secs) : { bonusXP: 0 };
    const base = chosenCard ? chosenCard.xpBase : 20;
    const earned = correct ? Math.round(base * xpMult.multiplier) + speed.bonusXP : 0;
    setTotalXP(p => p + earned);
    setRoundResults(p => [...p, { correct, xp: earned, cardName: chosenCard?.name || "" }]);
  }

  function handleAnswer(idx: number) {
    if (submitted || !question) return;
    const secs = Math.round((Date.now() - startTimeRef.current) / 1000);
    processAnswer(idx, question, secs);
  }

  async function nextRound() {
    const nextRoundNum = round + 1;
    if (nextRoundNum >= MAX_ROUNDS) {
      // Save XP
      if (user && totalXP > 0) {
        const { data: s } = await supabase.from("students").select("xp, level").eq("id", user.id).single();
        if (s) {
          const newXp = (s.xp || 0) + totalXP;
          await supabase.from("students").update({ xp: newXp, level: Math.floor(newXp / 100) + 1 }).eq("id", user.id);
        }
      }
      // Roll for chest
      const correct = roundResults.filter(r => r.correct).length + (roundResults.length > 0 ? 0 : 0);
      const chestTier = rollChest(roundResults.filter(r => r.correct).length, MAX_ROUNDS);
      if (chestTier) setChest(chestTier);
      setPhase("result");
    } else {
      setRound(nextRoundNum);
      dealCards();
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  if (loading && phase === "deal") return (
    <div className="min-h-screen bg-gordemy-dark flex items-center justify-center">
      <div className="text-4xl animate-bounce">🃏</div>
    </div>
  );

  return (
    <div className="max-w-[560px] mx-auto px-4 py-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-gordemy-muted hover:text-white text-sm">← Назад</Link>
        <span className="text-gordemy-muted">•</span>
        <span className="text-gordemy-purple font-bold text-sm">🃏 Card Battle</span>
        <span className="ml-auto text-gordemy-blue font-black">+{totalXP} XP</span>
        <span className="text-gordemy-muted text-sm">Раунд {round + 1}/{MAX_ROUNDS}</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-6 justify-center">
        {Array.from({ length: MAX_ROUNDS }).map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full border transition-all ${
            i < roundResults.length
              ? roundResults[i].correct ? "bg-gordemy-green border-gordemy-green" : "bg-red-500 border-red-500"
              : i === round && phase !== "result" ? "bg-gordemy-blue border-gordemy-blue animate-pulse"
              : "bg-gordemy-border border-gordemy-border"
          }`} />
        ))}
      </div>

      {/* ── CARD DEAL ──────────────────────────────────── */}
      {phase === "deal" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-extrabold text-center text-white mb-2">Обери картку</h2>
          <p className="text-gordemy-muted text-sm text-center mb-8">Складніша картка = більше XP. Ризикуй!</p>

          <div className="grid grid-cols-3 gap-4">
            {cards.map((card, i) => (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, y: 30, rotateY: 180 }}
                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ delay: i * 0.15, type: "spring" }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => chooseCard(card)}
                className={`relative rounded-2xl border-2 bg-gradient-to-b ${card.color} ${card.border} p-5 flex flex-col items-center gap-3 shadow-lg ${card.glow} cursor-pointer group`}
              >
                {/* Card back pattern */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden opacity-10">
                  <div className="w-full h-full" style={{ backgroundImage: "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)", backgroundSize: "10px 10px" }} />
                </div>

                <motion.span
                  className="text-4xl"
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                >
                  {card.emoji}
                </motion.span>
                <div className="text-white font-black text-sm">{card.name}</div>
                <div className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  card.difficulty === "easy" ? "bg-gordemy-green/20 text-gordemy-green"
                  : card.difficulty === "medium" ? "bg-gordemy-blue/20 text-gordemy-blue"
                  : "bg-gordemy-orange/20 text-gordemy-orange"
                }`}>
                  {card.difficulty === "easy" ? "Легко" : card.difficulty === "medium" ? "Середнє" : "Складно"}
                </div>
                <div className="text-gordemy-blue font-black">+{card.xpBase} XP</div>
                <div className="text-gordemy-muted text-[10px] text-center leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
                  {card.description}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── QUESTION ───────────────────────────────────── */}
      {phase === "question" && question && (
        <AnimatePresence mode="wait">
          <motion.div key="question" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            {/* Chosen card badge */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-fit bg-gradient-to-r ${chosenCard?.color} ${chosenCard?.border}`}>
              <span>{chosenCard?.emoji}</span>
              <span className="text-white font-bold text-sm">{chosenCard?.name}</span>
              <span className="text-gordemy-blue font-black text-sm">+{chosenCard?.xpBase} XP</span>
            </div>

            {/* Timer */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gordemy-muted">{SUBJECT_NAMES[question.subject] || question.subject} • {question.topic}</span>
                <span className={`font-black ${timeLeft > 15 ? "text-gordemy-green" : timeLeft > 7 ? "text-gordemy-orange" : "text-red-400"}`}>{timeLeft}с</span>
              </div>
              <div className="h-2 bg-gordemy-border rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${timeLeft > 15 ? "bg-gordemy-green" : timeLeft > 7 ? "bg-gordemy-orange" : "bg-red-400"}`}
                  animate={{ width: `${(timeLeft / 25) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Question text */}
            <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-5">
              <p className="text-white font-semibold leading-relaxed">{question.question_text}</p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-2">
              {question.options.map((opt, idx) => {
                const isCorrect = idx === question.correct_answer;
                const isSelected = selected === idx;
                let style = "border-gordemy-border hover:border-gordemy-blue/50 bg-gordemy-dark";
                if (submitted) {
                  if (isCorrect) style = "border-gordemy-green/60 bg-gordemy-green/15 text-gordemy-green";
                  else if (isSelected) style = "border-red-500/60 bg-red-900/20 text-red-400";
                }
                return (
                  <button key={idx} onClick={() => handleAnswer(idx)} disabled={submitted}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${style}`}>
                    <span className="text-gordemy-muted mr-2">{["А", "Б", "В", "Г"][idx]}.</span>{opt}
                  </button>
                );
              })}
            </div>

            {/* Result row */}
            {submitted && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className={`rounded-xl p-4 border flex items-center gap-3 ${
                  roundResults.at(-1)?.correct ? "border-gordemy-green/30 bg-gordemy-green/10" : "border-red-500/30 bg-red-900/10"
                }`}>
                  <span className="text-2xl">{roundResults.at(-1)?.correct ? "✅" : "❌"}</span>
                  <div>
                    <div className="text-white font-bold">{roundResults.at(-1)?.correct ? "Правильно!" : "Помилка"}</div>
                    <div className="text-gordemy-blue font-bold">+{roundResults.at(-1)?.xp} XP</div>
                  </div>
                </div>
                {question.explanation && (
                  <div className="p-3 rounded-lg bg-gordemy-blue/10 border border-gordemy-blue/20 text-gordemy-blue text-xs">
                    💡 {question.explanation}
                  </div>
                )}
                <button onClick={nextRound}
                  className="w-full py-3 rounded-xl bg-gordemy-blue/20 border border-gordemy-blue/30 text-gordemy-blue font-bold hover:bg-gordemy-blue/30 transition-colors">
                  {round + 1 >= MAX_ROUNDS ? "Результати 🏆" : "Наступна картка →"}
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Chest popup */}
      <AnimatePresence>
        {chest && phase === "result" && user && (
          <ChestPopup tier={chest} userId={user.id} onClose={() => setChest(null)} />
        )}
      </AnimatePresence>

      {/* ── RESULT ─────────────────────────────────────── */}
      {phase === "result" && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
          <div className="text-6xl">{roundResults.filter(r => r.correct).length >= 4 ? "🏆" : roundResults.filter(r => r.correct).length >= 3 ? "⭐" : "💪"}</div>
          <div>
            <h2 className="text-3xl font-black text-white mb-1">Card Battle завершено!</h2>
            <p className="text-gordemy-muted">{roundResults.filter(r => r.correct).length} з {MAX_ROUNDS} правильно</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4">
              <div className="text-gordemy-green font-black text-2xl">{roundResults.filter(r => r.correct).length}</div>
              <div className="text-gordemy-muted text-xs">Правильно</div>
            </div>
            <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4">
              <div className="text-gordemy-blue font-black text-2xl">+{totalXP}</div>
              <div className="text-gordemy-muted text-xs">XP зароблено</div>
            </div>
            <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4">
              <div className="text-gordemy-purple font-black text-2xl">{MAX_ROUNDS}</div>
              <div className="text-gordemy-muted text-xs">Раундів</div>
            </div>
          </div>

          {/* Round breakdown */}
          <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4 text-left">
            {roundResults.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <span className={r.correct ? "text-gordemy-green" : "text-red-400"}>{r.correct ? "✅" : "❌"}</span>
                <span className="text-gordemy-muted text-sm flex-1">Раунд {i + 1} — {r.cardName}</span>
                <span className="text-gordemy-blue font-bold text-sm">+{r.xp} XP</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setRound(0); setRoundResults([]); setTotalXP(0); dealCards(); }}
              className="flex-1 py-3 rounded-xl border border-gordemy-border text-gordemy-muted hover:text-white transition-colors">
              🔄 Знову
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
