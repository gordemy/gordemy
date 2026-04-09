"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getStudent, saveQuestionHistory } from "@/lib/student";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const SKINS = [
  { id: "wizard",  emoji: "🧙‍♂️", name: "Маг",      color: "text-gordemy-purple", bg: "bg-gordemy-purple/20", border: "border-gordemy-purple/50" },
  { id: "ninja",   emoji: "🥷",   name: "Ніндзя",   color: "text-gordemy-muted",  bg: "bg-gordemy-muted/20",  border: "border-gordemy-muted/50"  },
  { id: "hero",    emoji: "🦸",   name: "Герой",    color: "text-gordemy-blue",   bg: "bg-gordemy-blue/20",   border: "border-gordemy-blue/50"   },
  { id: "elf",     emoji: "🧝‍♀️", name: "Ельфійка", color: "text-gordemy-green",  bg: "bg-gordemy-green/20",  border: "border-gordemy-green/50"  },
  { id: "robot",   emoji: "🤖",   name: "Кіборг",   color: "text-gordemy-orange", bg: "bg-gordemy-orange/20", border: "border-gordemy-orange/50" },
  { id: "fox",     emoji: "🦊",   name: "Лисичка",  color: "text-gordemy-orange", bg: "bg-gordemy-orange/15", border: "border-gordemy-orange/40" },
];

const DIFF_DAMAGE: Record<string, number> = { easy: 20, medium: 30, hard: 40 };
const XP_BASE = 15;
const MAX_HP = 100;
const TOTAL_QUESTIONS = 10;

type Skin = typeof SKINS[0];
type Phase = "select" | "battle" | "result";

interface Question {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string | null;
}

interface FloatingText {
  id: number;
  text: string;
  color: string;
  x: number;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GamePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("select");
  const [skin, setSkin] = useState<Skin | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);

  const [playerHP, setPlayerHP] = useState(MAX_HP);
  const [botHP, setBotHP] = useState(MAX_HP);

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [combo, setCombo] = useState(0);
  const [totalXP, setTotalXP] = useState(0);

  const [flash, setFlash] = useState<"green" | "red" | null>(null);
  const [shaking, setShaking] = useState<"player" | "bot" | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);

  const floatCounter = useRef(0);
  const totalXPRef = useRef(0); // ref to avoid stale closure

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    getStudent(user.id).then(s => {
      if (s) setStudentSubjects(s.subjects || []);
    });
  }, [user, authLoading, router]);

  // ── Floating text helper ──────────────────────────────────────────────────
  const addFloating = (text: string, color: string) => {
    const id = floatCounter.current++;
    const x = 15 + Math.random() * 60;
    setFloatingTexts(prev => [...prev, { id, text, color, x }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1600);
  };

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = async (chosen: Skin) => {
    setSkin(chosen);
    setLoading(true);
    const subjects = studentSubjects.length > 0 ? studentSubjects : ["ukr", "math", "hist"];
    const { data } = await supabase.from("questions").select("*").in("subject", subjects).limit(60);
    const shuffled = (data || []).sort(() => Math.random() - 0.5).slice(0, TOTAL_QUESTIONS) as Question[];
    setQuestions(shuffled);
    setCurrentQ(0);
    setPlayerHP(MAX_HP);
    setBotHP(MAX_HP);
    setCombo(0);
    setTotalXP(0);
    totalXPRef.current = 0;
    setSelectedAnswer(null);
    setSubmitted(false);
    setLoading(false);
    setPhase("battle");
  };

  // ── End game ──────────────────────────────────────────────────────────────
  const endGame = async (result: "win" | "lose", finalXP: number) => {
    setGameResult(result);
    setPhase("result");
    if (user && finalXP > 0) {
      const { data: s } = await supabase.from("students").select("xp, level").eq("id", user.id).single();
      if (s) {
        const newXP = (s.xp || 0) + finalXP;
        const newLevel = Math.floor(newXP / 100) + 1;
        await supabase.from("students").update({ xp: newXP, level: newLevel }).eq("id", user.id);
      }
    }
  };

  // ── Handle answer submit ──────────────────────────────────────────────────
  const handleSubmit = () => {
    if (selectedAnswer === null || submitted) return;
    setSubmitted(true);

    const q = questions[currentQ];
    const isCorrect = selectedAnswer === q.correct_answer;
    if (user) {
      void saveQuestionHistory({
        userId: user.id,
        questionId: q.id,
        wasCorrect: isCorrect,
        mode: "game",
      });
    }
    const damage = DIFF_DAMAGE[q.difficulty] || 20;

    if (isCorrect) {
      const newCombo = combo + 1;
      const multiplier = Math.min(newCombo, 3);
      const earned = XP_BASE * multiplier;
      const newBotHP = Math.max(0, botHP - damage);

      setCombo(newCombo);
      setBotHP(newBotHP);
      totalXPRef.current += earned;
      setTotalXP(totalXPRef.current);
      setFlash("green");
      setShaking("bot");
      addFloating(`+${earned} XP`, "#22c55e");
      if (newCombo > 1) addFloating(`🔥 x${multiplier} COMBO!`, "#a855f7");
      setTimeout(() => { setFlash(null); setShaking(null); }, 500);

      if (newBotHP <= 0) {
        setTimeout(() => endGame("win", totalXPRef.current), 900);
        return;
      }

      setTimeout(() => advanceQuestion(currentQ, newBotHP, playerHP), 1300);
    } else {
      const newPlayerHP = Math.max(0, playerHP - damage);

      setCombo(0);
      setPlayerHP(newPlayerHP);
      setFlash("red");
      setShaking("player");
      addFloating(`-${damage} HP`, "#ef4444");
      addFloating("✗", "#ef4444");
      setTimeout(() => { setFlash(null); setShaking(null); }, 500);

      if (newPlayerHP <= 0) {
        setTimeout(() => endGame("lose", totalXPRef.current), 900);
        return;
      }

      setTimeout(() => advanceQuestion(currentQ, botHP, newPlayerHP), 1300);
    }
  };

  const advanceQuestion = (qIndex: number, currentBotHP: number, currentPlayerHP: number) => {
    const next = qIndex + 1;
    if (next >= questions.length) {
      const result = currentBotHP < currentPlayerHP ? "win" : "lose";
      endGame(result, totalXPRef.current);
    } else {
      setCurrentQ(next);
      setSelectedAnswer(null);
      setSubmitted(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (authLoading) return null;

  return (
    <div className="max-w-[640px] mx-auto px-4 py-6 min-h-screen">
      <AnimatePresence mode="wait">
        {phase === "select" && (
          <SelectScreen
            key="select"
            skins={SKINS}
            loading={loading}
            onSelect={startGame}
          />
        )}

        {phase === "battle" && questions.length > 0 && skin && (
          <BattleScreen
            key="battle"
            skin={skin}
            question={questions[currentQ]}
            currentQ={currentQ}
            totalQ={questions.length}
            playerHP={playerHP}
            botHP={botHP}
            combo={combo}
            selectedAnswer={selectedAnswer}
            submitted={submitted}
            flash={flash}
            shaking={shaking}
            floatingTexts={floatingTexts}
            onSelectAnswer={setSelectedAnswer}
            onSubmit={handleSubmit}
          />
        )}

        {phase === "result" && (
          <ResultScreen
            key="result"
            result={gameResult!}
            totalXP={totalXPRef.current}
            playerHP={playerHP}
            botHP={botHP}
            onPlayAgain={() => { setPhase("select"); setGameResult(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Select Screen ────────────────────────────────────────────────────────────

function SelectScreen({ skins, loading, onSelect }: {
  skins: Skin[];
  loading: boolean;
  onSelect: (s: Skin) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-gordemy-muted text-sm mb-6 hover:text-white transition-colors">
        ← Назад
      </Link>

      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-5xl mb-3"
        >⚔️</motion.div>
        <h1 className="text-3xl font-extrabold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-gordemy-blue to-gordemy-purple">
          Game Mode
        </h1>
        <p className="text-gordemy-muted text-sm">Обери персонажа і йди в бій проти НМТ-бота!</p>
      </div>

      {loading ? (
        <div className="text-gordemy-muted animate-pulse text-center py-20 text-lg">
          Завантаження питань...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {skins.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.94 }}
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(s)}
              className={`bg-gordemy-card border-2 rounded-2xl p-5 flex flex-col items-center gap-3 transition-all duration-200 ${
                hovered === s.id ? `${s.border} ${s.bg}` : "border-gordemy-border"
              }`}
            >
              <span className="text-5xl leading-none">{s.emoji}</span>
              <span className={`text-sm font-bold ${s.color}`}>{s.name}</span>
            </motion.button>
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-gordemy-card border border-gordemy-border rounded-2xl p-4"
      >
        <p className="text-xs font-bold text-gordemy-muted mb-3 tracking-wider">ЯК ГРАТИ</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-gordemy-muted">
          <div className="flex items-center gap-2"><span className="text-gordemy-green">✅</span> Правильна → ти атакуєш бота</div>
          <div className="flex items-center gap-2"><span className="text-red-400">❌</span> Неправильна → бот атакує тебе</div>
          <div className="flex items-center gap-2"><span className="text-gordemy-purple">🔥</span> Combo → x2, x3 XP</div>
          <div className="flex items-center gap-2"><span className="text-gordemy-orange">🏆</span> Знищи бота або виживи</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Battle Screen ────────────────────────────────────────────────────────────

function BattleScreen({
  skin, question, currentQ, totalQ,
  playerHP, botHP, combo,
  selectedAnswer, submitted, flash, shaking,
  floatingTexts, onSelectAnswer, onSubmit,
}: {
  skin: Skin;
  question: Question;
  currentQ: number;
  totalQ: number;
  playerHP: number;
  botHP: number;
  combo: number;
  selectedAnswer: number | null;
  submitted: boolean;
  flash: "green" | "red" | null;
  shaking: "player" | "bot" | null;
  floatingTexts: FloatingText[];
  onSelectAnswer: (i: number) => void;
  onSubmit: () => void;
}) {
  const DIFF_COLORS: Record<string, string> = {
    easy:   "text-gordemy-green  border-gordemy-green/30  bg-gordemy-green/10",
    medium: "text-gordemy-blue   border-gordemy-blue/30   bg-gordemy-blue/10",
    hard:   "text-gordemy-orange border-gordemy-orange/30 bg-gordemy-orange/10",
  };
  const DIFF_LABELS: Record<string, string> = { easy: "Легко", medium: "Середнє", hard: "Складно" };
  const LETTERS = ["А", "Б", "В", "Г"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative"
    >
      {/* Screen flash */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash}
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed inset-0 pointer-events-none z-50 ${flash === "green" ? "bg-gordemy-green" : "bg-red-500"}`}
          />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/dashboard" className="text-gordemy-muted text-sm hover:text-white transition-colors">
          ← Вийти
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-gordemy-muted text-sm font-semibold">{currentQ + 1} / {totalQ}</span>
          <AnimatePresence>
            {combo >= 2 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="text-xs font-bold text-gordemy-purple bg-gordemy-purple/20 border border-gordemy-purple/30 px-2 py-0.5 rounded-full"
              >
                🔥 x{Math.min(combo, 3)} COMBO
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Arena */}
      <div className="relative bg-gordemy-card border border-gordemy-border rounded-2xl p-5 mb-4 overflow-hidden">
        {/* Floating texts */}
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          <AnimatePresence>
            {floatingTexts.map(ft => (
              <motion.div
                key={ft.id}
                initial={{ opacity: 1, y: "70%", x: `${ft.x}%` }}
                animate={{ opacity: 0, y: "10%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.4, ease: "easeOut" }}
                className="absolute text-sm font-extrabold drop-shadow-lg"
                style={{ color: ft.color }}
              >
                {ft.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex items-end justify-between px-2">
          {/* Player */}
          <div className="flex flex-col items-center gap-2 w-28">
            <motion.div
              animate={shaking === "player" ? { x: [0, -10, 10, -10, 0] } : {}}
              transition={{ duration: 0.35 }}
            >
              <span className="text-6xl leading-none block text-center">{skin.emoji}</span>
            </motion.div>
            <p className={`text-xs font-bold ${skin.color}`}>{skin.name}</p>
            <div className="w-full">
              <div className="flex justify-between text-[10px] text-gordemy-muted mb-1">
                <span>HP</span><span>{playerHP}/{MAX_HP}</span>
              </div>
              <div className="h-3 bg-gordemy-bg rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full transition-colors ${
                    playerHP > 50 ? "bg-gordemy-green" : playerHP > 25 ? "bg-gordemy-orange" : "bg-red-500"
                  }`}
                  animate={{ width: `${playerHP}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* VS */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-2xl text-gordemy-muted font-bold"
          >
            ⚔️
          </motion.div>

          {/* Bot */}
          <div className="flex flex-col items-center gap-2 w-28">
            <motion.div
              animate={shaking === "bot" ? { x: [0, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.35 }}
            >
              <span className="text-6xl leading-none block text-center">🤖</span>
            </motion.div>
            <p className="text-xs font-bold text-red-400">НМТ Бот</p>
            <div className="w-full">
              <div className="flex justify-between text-[10px] text-gordemy-muted mb-1">
                <span>HP</span><span>{botHP}/{MAX_HP}</span>
              </div>
              <div className="h-3 bg-gordemy-bg rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    botHP > 50 ? "bg-red-400" : botHP > 25 ? "bg-gordemy-orange" : "bg-gordemy-orange"
                  }`}
                  animate={{ width: `${botHP}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question */}
      <motion.div
        key={currentQ}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gordemy-card border border-gordemy-border rounded-2xl p-5 mb-3"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-md border font-semibold ${DIFF_COLORS[question.difficulty]}`}>
            {DIFF_LABELS[question.difficulty]}
          </span>
          <span className="text-xs text-gordemy-muted">{question.topic}</span>
        </div>
        <p className="text-sm font-semibold leading-relaxed">{question.question_text}</p>
      </motion.div>

      {/* Answers */}
      <div className="flex flex-col gap-2 mb-4">
        {question.options.map((opt, i) => {
          let cls = "bg-gordemy-card border border-gordemy-border hover:border-gordemy-blue/50 cursor-pointer";
          if (submitted) {
            if (i === question.correct_answer)
              cls = "bg-gordemy-green/15 border-gordemy-green text-gordemy-green cursor-default";
            else if (i === selectedAnswer)
              cls = "bg-red-500/15 border-red-500 text-red-400 cursor-default";
            else
              cls = "bg-gordemy-card border border-gordemy-border opacity-40 cursor-default";
          } else if (selectedAnswer === i) {
            cls = "bg-gordemy-blue/20 border-gordemy-blue cursor-pointer";
          }

          return (
            <motion.button
              key={i}
              whileTap={{ scale: submitted ? 1 : 0.98 }}
              onClick={() => !submitted && onSelectAnswer(i)}
              disabled={submitted}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${cls}`}
            >
              <span className="font-extrabold mr-2 text-gordemy-muted">{LETTERS[i]}.</span>
              {opt}
            </motion.button>
          );
        })}
      </div>

      {/* Submit */}
      <AnimatePresence>
        {!submitted && (
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            whileTap={{ scale: 0.97 }}
            onClick={onSubmit}
            disabled={selectedAnswer === null}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
              selectedAnswer !== null
                ? "bg-gordemy-blue text-white hover:opacity-90 shadow-glow-blue"
                : "bg-gordemy-border text-gordemy-muted cursor-not-allowed"
            }`}
          >
            ⚔️ Атакувати!
          </motion.button>
        )}
      </AnimatePresence>

      {/* Explanation */}
      <AnimatePresence>
        {submitted && question.explanation && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 bg-gordemy-blue/10 border border-gordemy-blue/20 rounded-xl p-3"
          >
            <p className="text-xs font-bold text-gordemy-blue mb-1">💡 Пояснення</p>
            <p className="text-xs text-gordemy-muted leading-relaxed">{question.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Result Screen ────────────────────────────────────────────────────────────

function ResultScreen({ result, totalXP, playerHP, botHP, onPlayAgain }: {
  result: "win" | "lose";
  totalXP: number;
  playerHP: number;
  botHP: number;
  onPlayAgain: () => void;
}) {
  const isWin = result === "win";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="text-center py-10"
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        className="text-8xl mb-5"
      >
        {isWin ? "🏆" : "💀"}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className={`text-3xl font-extrabold mb-2 ${isWin ? "text-gordemy-green" : "text-red-400"}`}
      >
        {isWin ? "Перемога!" : "Поразка!"}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-gordemy-muted text-sm mb-8"
      >
        {isWin
          ? "Ти розніс НМТ-бота! Так тримати! 🎉"
          : "Бот переміг цього разу. Ще трохи тренування!"}
      </motion.p>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="grid grid-cols-3 gap-3 mb-8"
      >
        <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-4">
          <p className="text-2xl font-extrabold text-gordemy-blue">+{totalXP}</p>
          <p className="text-xs text-gordemy-muted mt-1">XP зароблено</p>
        </div>
        <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-4">
          <p className={`text-2xl font-extrabold ${playerHP > 0 ? "text-gordemy-green" : "text-red-400"}`}>{playerHP}</p>
          <p className="text-xs text-gordemy-muted mt-1">Твій HP</p>
        </div>
        <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-4">
          <p className="text-2xl font-extrabold text-red-400">{botHP}</p>
          <p className="text-xs text-gordemy-muted mt-1">HP бота</p>
        </div>
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="flex flex-col gap-3"
      >
        <button
          onClick={onPlayAgain}
          className="w-full py-3.5 bg-gordemy-blue text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all"
        >
          ⚔️ Грати знову
        </button>
        <Link
          href="/dashboard"
          className="w-full py-3.5 bg-gordemy-card border border-gordemy-border text-gordemy-muted rounded-xl font-bold text-sm hover:border-gordemy-muted/40 transition-all text-center block"
        >
          🏠 На головну
        </Link>
      </motion.div>
    </motion.div>
  );
}
