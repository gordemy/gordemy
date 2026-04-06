"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  getTodayBoss, getMyBossAttempt, getAllBossAttempts, saveBossAttempt,
  updateTodayGhostSnapshot,
  type BossFight, type BossAttempt,
} from "@/lib/gamification";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const BOSS_HP = 100;
const PLAYER_HP = 100;
const QUESTIONS_COUNT = 7;

const SUBJECT_NAMES: Record<string, string> = {
  ukr: "Українська мова", math: "Математика", hist: "Історія України",
  eng: "Англійська мова", bio: "Біологія", phys: "Фізика", chem: "Хімія",
};

interface Question {
  id: string; subject: string; topic: string; difficulty: string;
  question_text: string; options: string[]; correct_answer: number;
  explanation: string | null;
}

interface FloatingText { id: number; text: string; color: string; x: number; }

type Phase = "intro" | "battle" | "result";

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BossPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [boss, setBoss] = useState<BossFight | null>(null);
  const [myAttempt, setMyAttempt] = useState<BossAttempt | null>(null);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [playerHP, setPlayerHP] = useState(PLAYER_HP);
  const [bossHP, setBossHP] = useState(BOSS_HP);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [combo, setCombo] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [damageDealt, setDamageDealt] = useState(0);
  const [flash, setFlash] = useState<"green" | "red" | null>(null);
  const [shake, setShake] = useState<"player" | "boss" | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [studentData, setStudentData] = useState<any>(null);

  const floatId = useRef(0);
  const totalXPRef = useRef(0);
  const damageRef = useRef(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function init() {
    setLoading(true);
    const [bossData, { data: sd }] = await Promise.all([
      getTodayBoss(),
      supabase.from("students").select("name, xp, total_tasks_completed").eq("id", user!.id).single(),
    ]);
    if (!bossData) { setLoading(false); return; }
    setBoss(bossData);
    setStudentData(sd);

    const [attempt, top] = await Promise.all([
      getMyBossAttempt(user!.id, bossData.id),
      getAllBossAttempts(bossData.id),
    ]);
    setMyAttempt(attempt);
    setTopPlayers(top);
    setLoading(false);
  }

  const addFloat = (text: string, color: string, x?: number) => {
    const id = floatId.current++;
    const rx = x ?? (20 + Math.random() * 60);
    setFloatingTexts(p => [...p, { id, text, color, x: rx }]);
    setTimeout(() => setFloatingTexts(p => p.filter(f => f.id !== id)), 1500);
  };

  async function startFight() {
    if (!boss) return;
    setLoading(true);
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("subject", boss.subject)
      .eq("difficulty", "hard")
      .limit(50);
    const shuffled = (data || []).sort(() => Math.random() - 0.5).slice(0, QUESTIONS_COUNT) as Question[];

    // Fallback: if not enough hard questions, get any
    if (shuffled.length < QUESTIONS_COUNT) {
      const { data: extra } = await supabase.from("questions").select("*").eq("subject", boss.subject).limit(20);
      const all = [...shuffled, ...(extra || [])].sort(() => Math.random() - 0.5);
      setQuestions(all.slice(0, QUESTIONS_COUNT));
    } else {
      setQuestions(shuffled);
    }

    setPlayerHP(PLAYER_HP);
    setBossHP(BOSS_HP);
    setCurrentQ(0);
    setCombo(0);
    setTotalXP(0);
    setDamageDealt(0);
    totalXPRef.current = 0;
    damageRef.current = 0;
    setPhase("battle");
    setLoading(false);
  }

  async function handleAnswer(idx: number) {
    if (submitted || selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    setSubmitted(true);

    const q = questions[currentQ];
    const correct = idx === q.correct_answer;

    setFlash(correct ? "green" : "red");
    setTimeout(() => setFlash(null), 400);

    if (correct) {
      // Player hits boss
      const dmg = combo >= 3 ? 20 : 15;
      const xp = combo >= 3 ? 50 : 35;
      const newBossHP = Math.max(0, bossHP - dmg);
      const newCombo = combo + 1;
      setBossHP(newBossHP);
      setCombo(newCombo);
      totalXPRef.current += xp;
      damageRef.current += dmg;
      setTotalXP(totalXPRef.current);
      setDamageDealt(damageRef.current);
      setShake("boss");
      if (newCombo >= 3) addFloat(`🔥 COMBO x${newCombo}!`, "text-gordemy-orange", 50);
      addFloat(`-${dmg} HP`, "text-gordemy-green", 65 + Math.random() * 20);
      addFloat(`+${xp} XP`, "text-gordemy-blue", 30 + Math.random() * 20);
      setTimeout(() => setShake(null), 400);

      if (newBossHP <= 0) {
        await endFight(true);
        return;
      }
    } else {
      // Boss hits player
      const dmg = 18;
      const newPlayerHP = Math.max(0, playerHP - dmg);
      setPlayerHP(newPlayerHP);
      setCombo(0);
      setShake("player");
      addFloat(`-${dmg} HP`, "text-red-400", 25 + Math.random() * 20);
      setTimeout(() => setShake(null), 400);

      if (newPlayerHP <= 0) {
        await endFight(false);
        return;
      }
    }

    // Next question after delay
    setTimeout(() => {
      setSelectedAnswer(null);
      setSubmitted(false);
      if (currentQ + 1 >= questions.length) {
        // All questions answered — decide by HP
        endFight(bossHP > 0 ? playerHP > bossHP : true);
      } else {
        setCurrentQ(p => p + 1);
      }
    }, 1200);
  }

  async function endFight(won: boolean) {
    if (!boss || !user) return;
    const finalXP = won ? totalXPRef.current + boss.xp_reward : Math.floor(totalXPRef.current / 2);

    await saveBossAttempt(user.id, boss.id, won, finalXP, damageRef.current, finalXP);

    // Update ghost snapshot
    const { data: todayTasks } = await supabase
      .from("tasks")
      .select("is_correct")
      .eq("student_id", user.id)
      .eq("date", new Date().toISOString().split("T")[0])
      .eq("completed", true);
    const correct = (todayTasks || []).filter((t: any) => t.is_correct).length;
    const total = (todayTasks || []).length;
    await updateTodayGhostSnapshot(user.id, (studentData?.xp || 0) + finalXP, total, correct);

    setResult(won ? "win" : "lose");
    setPhase("result");

    // Refresh attempt
    const attempt = await getMyBossAttempt(user.id, boss.id);
    setMyAttempt(attempt);
    const top = await getAllBossAttempts(boss.id);
    setTopPlayers(top);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gordemy-dark flex items-center justify-center">
      <div className="text-4xl animate-bounce">{boss?.boss_emoji || "⚔️"}</div>
    </div>
  );

  if (!boss) return (
    <div className="min-h-screen bg-gordemy-dark flex flex-col items-center justify-center gap-4">
      <p className="text-gordemy-muted text-xl">Бос сьогодні не прийшов 🤷</p>
      <Link href="/dashboard" className="text-gordemy-blue underline">← Дашборд</Link>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gordemy-dark transition-colors duration-200 ${
      flash === "green" ? "bg-gordemy-green/10" : flash === "red" ? "bg-red-900/20" : ""
    }`}>
      {/* Floating texts */}
      <AnimatePresence>
        {floatingTexts.map(f => (
          <motion.div
            key={f.id}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -60 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
            className={`fixed top-32 z-50 font-black text-lg pointer-events-none ${f.color}`}
            style={{ left: `${f.x}%` }}
          >
            {f.text}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ── INTRO ─────────────────────────────────────────── */}
        {phase === "intro" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-gordemy-muted hover:text-white transition-colors text-sm">← Назад</Link>
              <span className="text-gordemy-muted text-sm">•</span>
              <span className="text-gordemy-orange font-bold text-sm uppercase tracking-wide">⚔️ Boss Fight Day</span>
            </div>

            {/* Boss Card */}
            <div className="relative border border-gordemy-orange/30 rounded-2xl bg-gradient-to-br from-gordemy-orange/10 to-red-900/10 p-8 text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gordemy-dark/50 pointer-events-none" />

              {/* Pulsing boss */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-8xl mb-4"
              >
                {boss.boss_emoji}
              </motion.div>

              <h1 className="text-3xl font-black text-white mb-2">{boss.boss_name}</h1>
              <p className="text-gordemy-muted mb-4">{boss.description}</p>

              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <div className="text-gordemy-orange font-bold text-xl">💎 {boss.xp_reward}</div>
                  <div className="text-gordemy-muted text-xs">XP за перемогу</div>
                </div>
                <div className="w-px h-10 bg-gordemy-border" />
                <div className="text-center">
                  <div className="text-gordemy-purple font-bold text-xl">⚡ {QUESTIONS_COUNT}</div>
                  <div className="text-gordemy-muted text-xs">Питань</div>
                </div>
                <div className="w-px h-10 bg-gordemy-border" />
                <div className="text-center">
                  <div className="text-gordemy-red font-bold text-xl">💀 Важко</div>
                  <div className="text-gordemy-muted text-xs">Складність</div>
                </div>
              </div>

              <div className="text-gordemy-muted text-sm mb-6">
                📚 Предмет: <span className="text-white">{SUBJECT_NAMES[boss.subject] || boss.subject}</span>
              </div>

              {myAttempt ? (
                <div className={`rounded-xl p-4 border ${myAttempt.won ? "border-gordemy-green/30 bg-gordemy-green/10" : "border-red-500/30 bg-red-900/10"}`}>
                  <div className="text-2xl mb-1">{myAttempt.won ? "🏆" : "💀"}</div>
                  <div className={`font-bold ${myAttempt.won ? "text-gordemy-green" : "text-red-400"}`}>
                    {myAttempt.won ? "Ти переміг боса сьогодні!" : "Бос тебе переміг. Повернись завтра!"}
                  </div>
                  <div className="text-gordemy-muted text-sm mt-1">
                    Нанесено шкоди: {myAttempt.damage_dealt} HP • XP: {myAttempt.score}
                  </div>
                </div>
              ) : (
                <button
                  onClick={startFight}
                  className="w-full py-4 rounded-xl font-black text-lg text-white bg-gradient-to-r from-gordemy-orange to-red-600 hover:from-gordemy-orange/80 hover:to-red-600/80 transition-all shadow-lg shadow-gordemy-orange/20 active:scale-95"
                >
                  ⚔️ БИТИСЯ З БОСОМ
                </button>
              )}
            </div>

            {/* Leaderboard */}
            {topPlayers.length > 0 && (
              <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4">
                <h3 className="text-white font-bold mb-3">🏆 Топ Воїни сьогодні</h3>
                <div className="space-y-2">
                  {topPlayers.slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-gordemy-muted w-6 text-sm">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                      <span className="text-white flex-1 text-sm">{p.student_name}</span>
                      <span className={`text-sm font-bold ${p.won ? "text-gordemy-green" : "text-gordemy-muted"}`}>
                        {p.won ? "✅" : "❌"} {p.damage_dealt} dmg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── BATTLE ────────────────────────────────────────── */}
        {phase === "battle" && questions.length > 0 && (
          <div className="space-y-4">
            {/* HP Bars */}
            <div className="grid grid-cols-2 gap-3">
              {/* Player HP */}
              <motion.div animate={shake === "player" ? { x: [-5, 5, -5, 5, 0] } : {}} className="border border-gordemy-border rounded-xl bg-gordemy-card p-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gordemy-blue font-bold">🧙 Ти</span>
                  <span className="text-white font-bold">{playerHP}/{PLAYER_HP} HP</span>
                </div>
                <div className="w-full bg-gordemy-border rounded-full h-3">
                  <motion.div
                    className="h-3 rounded-full bg-gradient-to-r from-gordemy-blue to-gordemy-purple"
                    animate={{ width: `${(playerHP / PLAYER_HP) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </motion.div>

              {/* Boss HP */}
              <motion.div animate={shake === "boss" ? { x: [-5, 5, -5, 5, 0] } : {}} className="border border-gordemy-orange/30 rounded-xl bg-gordemy-card p-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gordemy-orange font-bold">{boss.boss_emoji} {boss.boss_name}</span>
                  <span className="text-white font-bold">{bossHP}/{BOSS_HP} HP</span>
                </div>
                <div className="w-full bg-gordemy-border rounded-full h-3">
                  <motion.div
                    className="h-3 rounded-full bg-gradient-to-r from-gordemy-orange to-red-600"
                    animate={{ width: `${(bossHP / BOSS_HP) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </motion.div>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-gordemy-muted">Питання {currentQ + 1}/{questions.length}</span>
              {combo >= 2 && (
                <motion.span
                  key={combo}
                  initial={{ scale: 1.4 }}
                  animate={{ scale: 1 }}
                  className="text-gordemy-orange font-black"
                >
                  🔥 Combo x{combo}
                </motion.span>
              )}
              <span className="text-gordemy-blue font-bold">+{totalXP} XP</span>
            </div>

            {/* Question */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="border border-gordemy-border rounded-xl bg-gordemy-card p-5"
              >
                <div className="text-xs text-gordemy-muted mb-3 uppercase tracking-wide">
                  {questions[currentQ].topic} • {questions[currentQ].difficulty}
                </div>
                <p className="text-white font-semibold text-base mb-5 leading-relaxed">
                  {questions[currentQ].question_text}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {questions[currentQ].options.map((opt, idx) => {
                    const isSelected = selectedAnswer === idx;
                    const isCorrect = idx === questions[currentQ].correct_answer;
                    let style = "border-gordemy-border bg-gordemy-dark hover:border-gordemy-blue/50 hover:bg-gordemy-blue/5";
                    if (submitted) {
                      if (isCorrect) style = "border-gordemy-green/60 bg-gordemy-green/15 text-gordemy-green";
                      else if (isSelected) style = "border-red-500/60 bg-red-900/20 text-red-400";
                    }
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        disabled={submitted}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${style}`}
                      >
                        <span className="text-gordemy-muted mr-2">{["А", "Б", "В", "Г"][idx]}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {submitted && questions[currentQ].explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 rounded-lg bg-gordemy-blue/10 border border-gordemy-blue/20 text-gordemy-blue text-xs"
                  >
                    💡 {questions[currentQ].explanation}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* ── RESULT ────────────────────────────────────────── */}
        {phase === "result" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="text-8xl">
              {result === "win" ? "🏆" : "💀"}
            </div>
            <div>
              <h2 className="text-3xl font-black text-white mb-2">
                {result === "win" ? "ПЕРЕМОГА!" : "ПОРАЗКА"}
              </h2>
              <p className="text-gordemy-muted">
                {result === "win"
                  ? `Ти переміг ${boss.boss_name}! +${boss.xp_reward} XP та 💎 10 гемів!`
                  : "Бос виявився сильнішим. Але ти стаєш краще щоразу!"}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4">
                <div className="text-gordemy-blue font-black text-2xl">+{totalXP}</div>
                <div className="text-gordemy-muted text-xs">XP зароблено</div>
              </div>
              <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4">
                <div className="text-gordemy-orange font-black text-2xl">{damageDealt}</div>
                <div className="text-gordemy-muted text-xs">Шкода босу</div>
              </div>
              <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4">
                <div className={`font-black text-2xl ${result === "win" ? "text-gordemy-green" : "text-red-400"}`}>
                  {result === "win" ? "WIN" : "LOSS"}
                </div>
                <div className="text-gordemy-muted text-xs">Результат</div>
              </div>
            </div>

            {/* Top warriors */}
            {topPlayers.length > 0 && (
              <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4 text-left">
                <h3 className="text-white font-bold mb-3 text-sm">🏆 Рейтинг воїнів сьогодні</h3>
                {topPlayers.slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 py-1">
                    <span className="text-gordemy-muted w-5 text-sm">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                    <span className="text-white flex-1 text-sm">{p.student_name}</span>
                    <span className={`text-sm ${p.won ? "text-gordemy-green" : "text-gordemy-muted"}`}>{p.won ? "✅" : "❌"}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Link href="/dashboard" className="flex-1 py-3 rounded-xl border border-gordemy-border text-gordemy-muted hover:text-white text-center transition-colors">
                🏠 Дашборд
              </Link>
              <Link href="/game" className="flex-1 py-3 rounded-xl bg-gordemy-blue/20 border border-gordemy-blue/30 text-gordemy-blue hover:bg-gordemy-blue/30 text-center transition-colors font-bold">
                ⚔️ Тренування
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
