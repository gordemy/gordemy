"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  getTodayBoss, getMyBossAttempt, getAllBossAttempts, saveBossAttempt,
  updateTodayGhostSnapshot, getComboState,
  type BossFight, type BossAttempt,
} from "@/lib/gamification";
import { ChestPopup, rollChest, type ChestTier } from "@/components/chest-popup";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const BOSS_HP        = 120;
const PLAYER_HP      = 100;
const QUESTIONS_COUNT = 7;
const TIME_PER_Q     = 15;   // seconds per question

const SUBJECT_NAMES: Record<string, string> = {
  ukr: "Українська мова", math: "Математика", hist: "Історія України",
  eng: "Англійська мова", bio: "Біологія",    phys: "Фізика",         chem: "Хімія",
};

interface Question {
  id: string; subject: string; topic: string; difficulty: string;
  question_text: string; options: string[]; correct_answer: number;
  explanation: string | null;
}

interface FloatingText { id: number; text: string; color: string; x: number }

type Phase = "intro" | "countdown" | "battle" | "result";

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BossPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [boss,          setBoss]          = useState<BossFight | null>(null);
  const [myAttempt,     setMyAttempt]     = useState<BossAttempt | null>(null);
  const [topPlayers,    setTopPlayers]    = useState<any[]>([]);
  const [phase,         setPhase]         = useState<Phase>("intro");
  const [questions,     setQuestions]     = useState<Question[]>([]);
  const [currentQ,      setCurrentQ]      = useState(0);
  const [playerHP,      setPlayerHP]      = useState(PLAYER_HP);
  const [bossHP,        setBossHP]        = useState(BOSS_HP);
  const [selectedAnswer,setSelectedAnswer]= useState<number | null>(null);
  const [submitted,     setSubmitted]     = useState(false);
  const [combo,         setCombo]         = useState(0);
  const [totalXP,       setTotalXP]       = useState(0);
  const [damageDealt,   setDamageDealt]   = useState(0);
  const [flash,         setFlash]         = useState<"green" | "red" | null>(null);
  const [shake,         setShake]         = useState<"player" | "boss" | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [result,        setResult]        = useState<"win" | "lose" | null>(null);
  const [studentData,   setStudentData]   = useState<any>(null);
  const [timeLeft,      setTimeLeft]      = useState(TIME_PER_Q);
  const [countdown,     setCountdown]     = useState(3);
  const [chest,         setChest]         = useState<ChestTier | null>(null);
  const [correctCount,  setCorrectCount]  = useState(0);

  const floatId       = useRef(0);
  const totalXPRef    = useRef(0);
  const damageRef     = useRef(0);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef  = useRef(0);
  const correctRef    = useRef(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    init();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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

    let { data } = await supabase
      .from("questions").select("*").eq("subject", boss.subject).eq("difficulty", "hard").limit(50);

    let shuffled = ((data || []) as Question[]).sort(() => Math.random() - 0.5).slice(0, QUESTIONS_COUNT);
    if (shuffled.length < QUESTIONS_COUNT) {
      const { data: extra } = await supabase.from("questions").select("*").eq("subject", boss.subject).limit(20);
      const all = [...shuffled, ...(extra || []) as Question[]].sort(() => Math.random() - 0.5);
      shuffled = all.slice(0, QUESTIONS_COUNT);
    }
    setQuestions(shuffled);
    setPlayerHP(PLAYER_HP);
    setBossHP(BOSS_HP);
    setCurrentQ(0);
    setCombo(0);
    setTotalXP(0);
    setDamageDealt(0);
    correctRef.current = 0;
    totalXPRef.current = 0;
    damageRef.current  = 0;
    setLoading(false);

    // Countdown 3-2-1
    setPhase("countdown");
    setCountdown(3);
    let c = 3;
    const cTimer = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(cTimer);
        setPhase("battle");
        beginQuestionTimer();
      }
    }, 800);
  }

  function beginQuestionTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = Date.now();
    setTimeLeft(TIME_PER_Q);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAnswer(-1); // timeout = wrong
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleAnswer(idx: number) {
    if (submitted && idx !== -1) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedAnswer(idx);
    setSubmitted(true);

    const q = questions[currentQ];
    const correct = idx === q.correct_answer;
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const speedBonus = elapsed <= 5 ? 1.5 : elapsed <= 10 ? 1.2 : 1.0;

    setFlash(correct ? "green" : "red");
    setTimeout(() => setFlash(null), 300);

    if (correct) {
      correctRef.current++;
      const newCombo = combo + 1;
      const comboState = getComboState(newCombo);
      const baseDmg = 15;
      const dmg = Math.round(baseDmg * comboState.multiplier * speedBonus);
      const xp  = Math.round(40  * comboState.multiplier * speedBonus);
      const newBossHP = Math.max(0, bossHP - dmg);

      setBossHP(newBossHP);
      setCombo(newCombo);
      setCorrectCount(correctRef.current);
      totalXPRef.current += xp;
      damageRef.current  += dmg;
      setTotalXP(totalXPRef.current);
      setDamageDealt(damageRef.current);
      setShake("boss");

      if (newCombo >= 3) addFloat(`${comboState.emoji} ${comboState.label}!`, comboState.color, 50);
      addFloat(`-${dmg} HP`, "text-gordemy-green", 65 + Math.random() * 20);
      addFloat(`+${xp} XP`, "text-gordemy-blue",  30 + Math.random() * 20);
      if (speedBonus > 1) addFloat("⚡ Fast!", "text-gordemy-orange", 50);
      setTimeout(() => setShake(null), 400);

      if (newBossHP <= 0) { await endFight(true); return; }
    } else {
      const dmg = 20;
      const newPlayerHP = Math.max(0, playerHP - dmg);
      setPlayerHP(newPlayerHP);
      setCombo(0);
      setShake("player");
      addFloat(`-${dmg} HP`, "text-red-400", 25 + Math.random() * 20);
      addFloat("✗ Промах", "text-gordemy-muted", 50);
      setTimeout(() => setShake(null), 400);
      if (newPlayerHP <= 0) { await endFight(false); return; }
    }

    setTimeout(() => {
      setSelectedAnswer(null);
      setSubmitted(false);
      if (currentQ + 1 >= questions.length) {
        endFight(bossHP > 0 ? playerHP > bossHP : true);
      } else {
        setCurrentQ(p => p + 1);
        beginQuestionTimer();
      }
    }, 1200);
  }

  async function endFight(won: boolean) {
    if (!boss || !user) return;
    const finalXP = won
      ? totalXPRef.current + boss.xp_reward
      : Math.floor(totalXPRef.current / 2);

    await saveBossAttempt(user.id, boss.id, won, finalXP, damageRef.current, finalXP);

    const { data: todayTasks } = await supabase
      .from("tasks").select("is_correct")
      .eq("student_id", user.id)
      .eq("date", new Date().toISOString().split("T")[0])
      .eq("completed", true);
    const correct = (todayTasks || []).filter((t: any) => t.is_correct).length;
    const total   = (todayTasks || []).length;
    await updateTodayGhostSnapshot(user.id, (studentData?.xp || 0) + finalXP, total, correct);

    setResult(won ? "win" : "lose");
    setPhase("result");

    // Roll for chest (better chance if won)
    const chestTier = rollChest(correctRef.current, questions.length);
    if (chestTier) setChest(chestTier);

    const attempt = await getMyBossAttempt(user.id, boss.id);
    setMyAttempt(attempt);
    const top = await getAllBossAttempts(boss.id);
    setTopPlayers(top);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-6xl animate-bounce">{boss?.boss_emoji || "⚔️"}</div>
    </div>
  );

  if (!boss) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gordemy-muted text-xl">Бос сьогодні не прийшов 🤷</p>
      <Link href="/dashboard" className="text-gordemy-blue underline">← Дашборд</Link>
    </div>
  );

  const comboState   = getComboState(combo);
  const timePercent  = (timeLeft / TIME_PER_Q) * 100;
  const timerColor   = timePercent > 50 ? "bg-gordemy-green" : timePercent > 25 ? "bg-gordemy-orange" : "bg-red-500";

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      flash === "green" ? "bg-gordemy-green/5" : flash === "red" ? "bg-red-900/10" : ""
    }`}>

      {/* Chest popup */}
      <AnimatePresence>
        {chest && phase === "result" && user && (
          <ChestPopup tier={chest} userId={user.id} onClose={() => setChest(null)} />
        )}
      </AnimatePresence>

      {/* Floating texts */}
      <AnimatePresence>
        {floatingTexts.map(f => (
          <motion.div
            key={f.id}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -70 }}
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

        {/* ── INTRO ──────────────────────────────────────────── */}
        {phase === "intro" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-gordemy-muted hover:text-white transition-colors text-sm">← Назад</Link>
              <span className="text-gordemy-muted">•</span>
              <span className="text-gordemy-orange font-bold text-sm uppercase tracking-wide">⚔️ Boss Fight Day</span>
            </div>

            {/* Boss card */}
            <div className="relative border border-gordemy-orange/30 rounded-2xl bg-gradient-to-br from-gordemy-orange/10 to-red-900/10 p-8 text-center overflow-hidden">
              {/* Animated rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {[1,2,3].map(i => (
                  <motion.div key={i} className="absolute rounded-full border border-gordemy-orange/20"
                    animate={{ scale: [1, 1.5 + i * 0.3], opacity: [0.4, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.6, ease: "easeOut" }}
                    style={{ width: 80, height: 80 }}
                  />
                ))}
              </div>

              <motion.div
                animate={{ scale: [1, 1.07, 1], rotate: [0, -2, 2, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="text-8xl mb-4 relative z-10"
              >
                {boss.boss_emoji}
              </motion.div>
              <h1 className="text-3xl font-black text-white mb-2">{boss.boss_name}</h1>
              <p className="text-gordemy-muted mb-5">{boss.description}</p>

              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <div className="text-gordemy-orange font-black text-xl">+{boss.xp_reward}</div>
                  <div className="text-gordemy-muted text-xs">XP за WIN</div>
                </div>
                <div className="w-px h-10 bg-gordemy-border" />
                <div className="text-center">
                  <div className="text-gordemy-purple font-black text-xl">+10 💎</div>
                  <div className="text-gordemy-muted text-xs">Геми за WIN</div>
                </div>
                <div className="w-px h-10 bg-gordemy-border" />
                <div className="text-center">
                  <div className="text-gordemy-blue font-black text-xl">{TIME_PER_Q}s</div>
                  <div className="text-gordemy-muted text-xs">На питання</div>
                </div>
              </div>

              {/* Combo info */}
              <div className="bg-gordemy-bg/60 rounded-xl p-3 mb-5 text-xs text-gordemy-muted">
                🔥 <span className="text-white font-bold">Combo система:</span> відповідай правильно підряд — урон і XP збільшуються до <span className="text-gordemy-orange font-bold">x3.0</span>!
              </div>

              <div className="text-gordemy-muted text-sm mb-6">
                📚 Предмет: <span className="text-white font-semibold">{SUBJECT_NAMES[boss.subject] || boss.subject}</span>
              </div>

              {myAttempt ? (
                <div className={`rounded-xl p-4 border ${myAttempt.won ? "border-gordemy-green/30 bg-gordemy-green/10" : "border-red-500/30 bg-red-900/10"}`}>
                  <div className="text-3xl mb-2">{myAttempt.won ? "🏆" : "💀"}</div>
                  <div className={`font-bold ${myAttempt.won ? "text-gordemy-green" : "text-red-400"}`}>
                    {myAttempt.won ? "Ти вже переміг боса сьогодні!" : "Бос переміг тебе. Наступного разу!"}
                  </div>
                  <div className="text-gordemy-muted text-sm mt-1">
                    Нанесено: {myAttempt.damage_dealt} HP • XP: {myAttempt.score}
                  </div>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startFight}
                  className="w-full py-4 rounded-xl font-black text-xl text-white bg-gradient-to-r from-gordemy-orange to-red-600 shadow-lg shadow-gordemy-orange/20"
                >
                  ⚔️ БИТИСЯ З БОСОМ!
                </motion.button>
              )}
            </div>

            {topPlayers.length > 0 && (
              <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4">
                <h3 className="text-white font-bold mb-3">🏆 Топ воїни сьогодні</h3>
                {topPlayers.slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 py-1.5">
                    <span className="text-gordemy-muted w-6 text-sm">{["🥇","🥈","🥉"][i] || `${i+1}.`}</span>
                    <span className="text-white flex-1 text-sm">{p.student_name}</span>
                    <span className="text-gordemy-orange text-sm font-bold">{p.damage_dealt} dmg</span>
                    <span className={`text-sm ${p.won ? "text-gordemy-green" : "text-gordemy-muted"}`}>{p.won ? "✅" : "❌"}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── COUNTDOWN ────────────────────────────────────────── */}
        {phase === "countdown" && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-40">
            <AnimatePresence mode="wait">
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div className="text-[120px] font-black text-gordemy-orange leading-none">
                  {countdown > 0 ? countdown : "⚔️"}
                </div>
                <div className="text-gordemy-muted text-xl mt-2">
                  {countdown > 0 ? "Готуйся..." : "БІЙСЯ!"}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* ── BATTLE ───────────────────────────────────────────── */}
        {phase === "battle" && questions.length > 0 && (
          <div className="space-y-4">
            {/* HP Bars */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div animate={shake === "player" ? { x: [-6, 6, -6, 6, 0] } : {}} className="border border-gordemy-border rounded-xl bg-gordemy-card p-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gordemy-blue font-bold">🧙 Ти</span>
                  <span className="text-white font-bold">{playerHP}/{PLAYER_HP}</span>
                </div>
                <div className="w-full bg-gordemy-border rounded-full h-3 overflow-hidden">
                  <motion.div className="h-3 rounded-full bg-gradient-to-r from-gordemy-blue to-gordemy-purple"
                    animate={{ width: `${(playerHP / PLAYER_HP) * 100}%` }} transition={{ duration: 0.4 }} />
                </div>
              </motion.div>

              <motion.div animate={shake === "boss" ? { x: [-6, 6, -6, 6, 0] } : {}} className="border border-gordemy-orange/30 rounded-xl bg-gordemy-card p-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gordemy-orange font-bold">{boss.boss_emoji} {boss.boss_name}</span>
                  <span className="text-white font-bold">{bossHP}/{BOSS_HP}</span>
                </div>
                <div className="w-full bg-gordemy-border rounded-full h-3 overflow-hidden">
                  <motion.div className="h-3 rounded-full bg-gradient-to-r from-gordemy-orange to-red-600"
                    animate={{ width: `${(bossHP / BOSS_HP) * 100}%` }} transition={{ duration: 0.4 }} />
                </div>
              </motion.div>
            </div>

            {/* Timer + Combo + XP row */}
            <div className="flex items-center gap-3">
              {/* Timer */}
              <div className={`text-2xl font-black tabular-nums w-10 ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-white"}`}>
                {timeLeft}s
              </div>
              <div className="flex-1 h-2.5 bg-gordemy-border rounded-full overflow-hidden">
                <motion.div className={`h-full ${timerColor} rounded-full transition-colors`}
                  animate={{ width: `${timePercent}%` }} transition={{ duration: 0.9, ease: "linear" }} />
              </div>

              {/* Combo badge */}
              {combo >= 2 ? (
                <motion.div
                  key={combo}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  className={`px-3 py-1 rounded-full text-xs font-black border ${
                    combo >= 7 ? "border-gordemy-orange/70 bg-gordemy-orange/20 text-gordemy-orange" :
                    combo >= 5 ? "border-gordemy-purple/60 bg-gordemy-purple/20 text-gordemy-purple" :
                    combo >= 3 ? "border-gordemy-blue/50 bg-gordemy-blue/10 text-gordemy-blue" :
                    "border-gordemy-green/40 bg-gordemy-green/10 text-gordemy-green"
                  }`}
                >
                  {comboState.emoji} x{combo}
                </motion.div>
              ) : (
                <div className="text-gordemy-blue font-bold text-sm">+{totalXP} XP</div>
              )}
            </div>

            {/* Question number */}
            <div className="flex items-center justify-between text-xs text-gordemy-muted px-1">
              <span>Питання {currentQ + 1} / {questions.length}</span>
              <span>✅ {correctCount} правильно</span>
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
                  {questions[currentQ].topic} • 💀 hard
                </div>
                <p className="text-white font-semibold text-base mb-5 leading-relaxed">
                  {questions[currentQ].question_text}
                </p>
                <div className="grid gap-2">
                  {questions[currentQ].options.map((opt, idx) => {
                    const isCorrect  = idx === questions[currentQ].correct_answer;
                    const isSelected = selectedAnswer === idx;
                    let style = "border-gordemy-border bg-gordemy-bg hover:border-gordemy-blue/50 hover:bg-gordemy-blue/5 cursor-pointer";
                    if (submitted) {
                      if (isCorrect)            style = "border-gordemy-green/60 bg-gordemy-green/15 text-gordemy-green cursor-default";
                      else if (isSelected)      style = "border-red-500/60 bg-red-900/20 text-red-400 cursor-default";
                      else                      style = "border-gordemy-border/40 text-gordemy-muted/50 cursor-default";
                    }
                    return (
                      <motion.button
                        key={idx}
                        onClick={() => !submitted && handleAnswer(idx)}
                        whileHover={!submitted ? { scale: 1.01 } : {}}
                        whileTap={!submitted ? { scale: 0.99 } : {}}
                        className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${style}`}
                      >
                        <span className="text-gordemy-muted mr-2">{["А","Б","В","Г"][idx]}.</span>
                        {opt}
                      </motion.button>
                    );
                  })}
                </div>
                {submitted && questions[currentQ].explanation && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 rounded-lg bg-gordemy-blue/10 border border-gordemy-blue/20 text-gordemy-blue text-xs">
                    💡 {questions[currentQ].explanation}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* HP dots */}
            <div className="flex items-center justify-center gap-1.5 mt-1">
              {questions.map((_, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full ${
                  i < currentQ ? "bg-gordemy-green/60" : i === currentQ ? "bg-gordemy-blue animate-pulse" : "bg-gordemy-border"
                }`} />
              ))}
            </div>
          </div>
        )}

        {/* ── RESULT ──────────────────────────────────────────── */}
        {phase === "result" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10 }}
              className="text-8xl"
            >
              {result === "win" ? "🏆" : "💀"}
            </motion.div>

            <div>
              <h2 className="text-3xl font-black text-white mb-2">
                {result === "win" ? "ПЕРЕМОГА!" : "ПОРАЗКА"}
              </h2>
              <p className="text-gordemy-muted">
                {result === "win"
                  ? `${boss.boss_name} переможений! Ти отримуєш ${boss.xp_reward} XP + 10 💎`
                  : "Бос виявився сильнішим. Але наступного разу буде інакше!"}
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
                  {correctCount}/{questions.length}
                </div>
                <div className="text-gordemy-muted text-xs">Правильно</div>
              </div>
            </div>

            {topPlayers.length > 0 && (
              <div className="border border-gordemy-border rounded-xl bg-gordemy-card p-4 text-left">
                <h3 className="text-white font-bold mb-3 text-sm">🏆 Рейтинг воїнів сьогодні</h3>
                {topPlayers.slice(0, 5).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 py-1.5">
                    <span className="text-gordemy-muted w-5 text-sm">{["🥇","🥈","🥉"][i] || `${i+1}.`}</span>
                    <span className="text-white flex-1 text-sm">{p.student_name}</span>
                    <span className="text-gordemy-orange text-sm">{p.damage_dealt} dmg</span>
                    <span className={`text-sm ${p.won ? "text-gordemy-green" : "text-gordemy-muted"}`}>{p.won ? "✅" : "❌"}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Link href="/dashboard"
                className="flex-1 py-3 rounded-xl border border-gordemy-border text-gordemy-muted hover:text-white text-center transition-colors font-semibold">
                🏠 Дашборд
              </Link>
              <Link href="/duel"
                className="flex-1 py-3 rounded-xl bg-gordemy-orange/20 border border-gordemy-orange/30 text-gordemy-orange hover:bg-gordemy-orange/30 text-center transition-colors font-bold">
                ⚔️ Дуель
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
