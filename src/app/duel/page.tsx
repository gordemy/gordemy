"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getStudent } from "@/lib/student";
import { getXPMultiplier, getSpeedBonus, getComboState } from "@/lib/gamification";
import { ChestPopup, rollChest, type ChestTier } from "@/components/chest-popup";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// Uses the existing `duels` table schema:
// creator_id, opponent_id, subject, questions(jsonb), creator_score, opponent_score,
// creator_done, opponent_done, status, xp_reward, expires_at
// + new columns: challenger_name, opponent_name, difficulty, question_ids, challenger_score,
//   challenger_time, opponent_time, winner_id
interface Duel {
  id: string;
  creator_id: string;
  challenger_name: string | null;
  opponent_id: string | null;
  opponent_name: string | null;
  subject: string;
  difficulty: string;
  question_ids: string[] | null;
  questions: any;
  creator_score: number;   // challenger's score (from original schema)
  opponent_score: number;
  challenger_score: number; // new alias column — we use this for new duels
  challenger_time: number;
  opponent_time: number;
  creator_done: boolean;
  opponent_done: boolean;
  status: string;
  xp_reward: number;
  winner_id: string | null;
  created_at: string;
  expires_at: string;
}

interface PlayerEntry {
  id: string;
  name: string;
  level: number;
  xp: number;
  streak: number;
}

const SUBJECT_NAMES: Record<string, string> = {
  ukr: "🇺🇦 Українська", math: "📐 Математика", hist: "📜 Історія",
  eng: "🌍 Англійська",  bio: "🧬 Біологія",   phys: "⚡ Фізика", chem: "🧪 Хімія",
};

const SUBJECT_LIST = [
  { id: "ukr",  label: "🇺🇦 Українська" }, { id: "math", label: "📐 Математика" },
  { id: "hist", label: "📜 Історія" },     { id: "eng",  label: "🌍 Англійська" },
  { id: "bio",  label: "🧬 Біологія" },    { id: "phys", label: "⚡ Фізика" },
  { id: "chem", label: "🧪 Хімія" },
];

const DUEL_QUESTIONS = 5;
const TIME_PER_Q    = 20;
const DUEL_XP_WIN   = 120;
const DUEL_XP_LOSS  = 30;

type Tab   = "lobby" | "history";
type Phase = "lobby" | "create" | "battle" | "result";

// ─── Floating text ─────────────────────────────────────────────────────────

interface FloatText { id: number; text: string; color: string }

// ─── Main ──────────────────────────────────────────────────────────────────

export default function DuelPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [phase, setPhase]   = useState<Phase>("lobby");
  const [tab,   setTab]     = useState<Tab>("lobby");

  const [players,    setPlayers]    = useState<PlayerEntry[]>([]);
  const [myDuels,    setMyDuels]    = useState<Duel[]>([]);
  const [history,    setHistory]    = useState<Duel[]>([]);
  const [myStudent,  setMyStudent]  = useState<{ id: string; name: string; subjects: string[]; level: number } | null>(null);
  const [loading,    setLoading]    = useState(true);

  // Create
  const [opponent,     setOpponent]     = useState<PlayerEntry | null>(null);
  const [subject,      setSubject]      = useState("math");
  const [difficulty,   setDifficulty]   = useState<"easy"|"medium"|"hard">("medium");
  const [creating,     setCreating]     = useState(false);

  // Battle
  const [activeDuel,   setActiveDuel]   = useState<Duel | null>(null);
  const [questions,    setQuestions]    = useState<Question[]>([]);
  const [currentQ,     setCurrentQ]     = useState(0);
  const [selected,     setSelected]     = useState<number | null>(null);
  const [submitted,    setSubmitted]    = useState(false);
  const [timeLeft,     setTimeLeft]     = useState(TIME_PER_Q);
  const [answers,      setAnswers]      = useState<{ correct: boolean; time: number }[]>([]);
  const [combo,        setCombo]        = useState(0);
  const [floats,       setFloats]       = useState<FloatText[]>([]);

  // Result
  const [duelResult, setDuelResult] = useState<{ won: boolean; myScore: number; oppScore: number; xpEarned: number; waiting: boolean } | null>(null);
  const [chest,      setChest]      = useState<ChestTier | null>(null);

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const floatCtr     = useRef(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function loadAll() {
    setLoading(true);
    const s = await getStudent(user!.id);
    if (s) setMyStudent({ id: s.id, name: s.name, subjects: s.subjects || ["math"], level: s.level });

    const { data: allPlayers } = await supabase
      .from("students")
      .select("id, name, level, xp, streak")
      .neq("id", user!.id)
      .order("xp", { ascending: false })
      .limit(50);
    setPlayers((allPlayers || []) as PlayerEntry[]);

    await loadDuels();
    setLoading(false);
  }

  async function loadDuels() {
    const { data: pending } = await supabase
      .from("duels")
      .select("*")
      .or(`creator_id.eq.${user!.id},opponent_id.eq.${user!.id}`)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false });
    setMyDuels((pending || []) as Duel[]);

    const { data: done } = await supabase
      .from("duels")
      .select("*")
      .or(`creator_id.eq.${user!.id},opponent_id.eq.${user!.id}`)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((done || []) as Duel[]);
  }

  async function createDuel() {
    if (!opponent || !myStudent) return;
    setCreating(true);
    try {
      const { data: qs } = await supabase
        .from("questions")
        .select("id, question_text, options, correct_answer, explanation, topic, subject")
        .eq("subject", subject)
        .eq("difficulty", difficulty)
        .limit(30);

      const pool = ((qs || []) as Question[]).sort(() => Math.random() - 0.5).slice(0, DUEL_QUESTIONS);
      if (pool.length < DUEL_QUESTIONS) {
        alert("Не вистачає питань для цього предмету. Спробуй інший!");
        setCreating(false);
        return;
      }

      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data: duel, error } = await supabase
        .from("duels")
        .insert({
          creator_id:      user!.id,
          challenger_name: myStudent.name,
          opponent_id:     opponent.id,
          opponent_name:   opponent.name,
          subject,
          difficulty,
          question_ids:    pool.map(q => q.id),
          questions:       pool,                  // store full questions in jsonb field too
          creator_score:   -1,
          challenger_score:-1,
          opponent_score:  -1,
          creator_done:    false,
          opponent_done:   false,
          status:          "pending",
          xp_reward:       DUEL_XP_WIN,
          expires_at:      expires,
        })
        .select()
        .single();

      if (error) throw error;
      await startBattle(duel as Duel);
    } catch (e: any) {
      console.error(e);
      alert("Помилка: " + e.message);
    }
    setCreating(false);
  }

  async function startBattle(duel: Duel) {
    setLoading(true);
    // Load questions from stored jsonb or from question_ids
    let qs: Question[] = [];
    if (duel.questions && Array.isArray(duel.questions)) {
      qs = duel.questions as Question[];
    } else if (duel.question_ids?.length) {
      const { data } = await supabase.from("questions").select("*").in("id", duel.question_ids);
      const ordered = duel.question_ids.map(id => (data || []).find((q: any) => q.id === id)).filter(Boolean) as Question[];
      qs = ordered;
    }
    if (!qs.length) { setLoading(false); return; }

    setActiveDuel(duel);
    setQuestions(qs);
    setCurrentQ(0);
    setAnswers([]);
    setCombo(0);
    setSelected(null);
    setSubmitted(false);
    setPhase("battle");
    setLoading(false);
    startTimer();
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = Date.now();
    setTimeLeft(TIME_PER_Q);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); handleSubmit(-1); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function addFloat(text: string, color: string) {
    const id = floatCtr.current++;
    setFloats(prev => [...prev, { id, text, color }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1400);
  }

  async function handleSubmit(idx: number) {
    if (submitted && idx !== -1) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);
    setSelected(idx);

    const q = questions[currentQ];
    const correct = idx === q.correct_answer;
    const timeTaken = (Date.now() - startTimeRef.current) / 1000;
    const newCombo = correct ? combo + 1 : 0;
    setCombo(newCombo);

    if (correct) {
      const cs = getComboState(newCombo);
      addFloat(`✓ ${newCombo >= 2 ? cs.emoji + " x" + newCombo : ""}`, "text-gordemy-green");
    } else {
      addFloat("✗", "text-gordemy-orange");
    }

    const newAnswers = [...answers, { correct, time: timeTaken }];
    setAnswers(newAnswers);

    setTimeout(async () => {
      if (currentQ + 1 < questions.length) {
        setCurrentQ(p => p + 1);
        setSelected(null);
        setSubmitted(false);
        startTimer();
      } else {
        await finishBattle(newAnswers);
      }
    }, 1100);
  }

  async function finishBattle(finalAnswers: { correct: boolean; time: number }[]) {
    if (!activeDuel || !myStudent) return;
    setLoading(true);

    const score     = finalAnswers.filter(a => a.correct).length;
    const totalTime = Math.round(finalAnswers.reduce((s, a) => s + a.time, 0));
    const isCreator = activeDuel.creator_id === user!.id;

    // Save my results using correct column names
    const updateData = isCreator
      ? { creator_score: score, challenger_score: score, challenger_time: totalTime, creator_done: true }
      : { opponent_score: score, opponent_time: totalTime, opponent_done: true };

    const { data: updated } = await supabase
      .from("duels").update(updateData).eq("id", activeDuel.id).select().single();

    const duel = updated as Duel;
    const myScore   = score;
    const oppScore  = isCreator ? duel.opponent_score : (duel.challenger_score ?? duel.creator_score);
    const bothDone  = isCreator ? duel.opponent_done  : duel.creator_done;

    let xpEarned = DUEL_XP_LOSS;
    let won = false;

    if (bothDone || oppScore >= 0) {
      // Determine winner
      let winnerId: string | null = null;
      if (myScore > oppScore) winnerId = user!.id;
      else if (oppScore > myScore) winnerId = isCreator ? activeDuel.opponent_id : activeDuel.creator_id;
      else {
        const myTime = totalTime;
        const oppTime = isCreator ? duel.opponent_time : duel.challenger_time;
        winnerId = myTime <= oppTime ? user!.id : (isCreator ? activeDuel.opponent_id : activeDuel.creator_id);
      }
      won = winnerId === user!.id;
      xpEarned = won ? DUEL_XP_WIN : DUEL_XP_LOSS;

      await supabase.from("duels").update({ status: "completed", winner_id: winnerId }).eq("id", activeDuel.id);

      // Award XP + gems
      const { data: stu } = await supabase.from("students").select("xp, level, gems").eq("id", user!.id).single();
      if (stu) {
        const newXp  = (stu.xp || 0) + xpEarned;
        const newGems = (stu.gems || 0) + (won ? 15 : 3);
        await supabase.from("students").update({ xp: newXp, level: Math.floor(newXp / 100) + 1, gems: newGems }).eq("id", user!.id);
      }

      // Chest roll
      const chestTier = rollChest(score, DUEL_QUESTIONS);
      if (chestTier) setChest(chestTier);

      setDuelResult({ won, myScore, oppScore, xpEarned, waiting: false });
    } else {
      // Waiting for opponent
      setDuelResult({ won: false, myScore, oppScore: -1, xpEarned: 0, waiting: true });
    }

    setPhase("result");
    setLoading(false);
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="max-w-[600px] mx-auto px-6 py-12 text-center">
        <div className="text-5xl mb-4 animate-bounce">⚔️</div>
        <p className="text-gordemy-muted text-lg">Завантаження арени...</p>
      </div>
    );
  }

  // ─── Battle Phase ──────────────────────────────────────────────────────────

  if (phase === "battle" && questions.length > 0) {
    const q = questions[currentQ];
    const timePercent = (timeLeft / TIME_PER_Q) * 100;
    const timerColor  = timePercent > 50 ? "bg-gordemy-green" : timePercent > 25 ? "bg-gordemy-orange" : "bg-red-500";
    const comboState  = getComboState(combo);
    const oppName = activeDuel?.creator_id === user?.id ? activeDuel?.opponent_name : activeDuel?.challenger_name;

    return (
      <div className="max-w-[600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <div>
              <div className="text-xs text-gordemy-muted">1v1 Дуель</div>
              <div className="font-bold text-white text-sm">{oppName || "Суперник"} vs Ти</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gordemy-muted">Питання</div>
            <div className="font-black text-xl text-white">{currentQ + 1}/{questions.length}</div>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full h-1.5 bg-gordemy-border rounded-full mb-3 overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-gordemy-blue to-gordemy-purple rounded-full"
            animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} transition={{ duration: 0.4 }} />
        </div>

        {/* Timer + combo */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`text-2xl font-black tabular-nums w-9 ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-white"}`}>{timeLeft}s</div>
          <div className="flex-1 h-2 bg-gordemy-border rounded-full overflow-hidden">
            <motion.div className={`h-full ${timerColor} rounded-full`}
              animate={{ width: `${timePercent}%` }} transition={{ duration: 0.9, ease: "linear" }} />
          </div>
          {combo >= 2 && (
            <motion.div key={combo} initial={{ scale: 1.4 }} animate={{ scale: 1 }}
              className={`text-sm font-black ${comboState.color}`}>
              {comboState.emoji} x{combo}
            </motion.div>
          )}
        </div>

        {/* Floats */}
        <div className="relative h-0">
          <AnimatePresence>
            {floats.map(f => (
              <motion.div key={f.id}
                className={`absolute -top-8 left-1/2 font-black text-2xl pointer-events-none ${f.color}`}
                initial={{ opacity: 1, y: 0, x: "-50%" }}
                animate={{ opacity: 0, y: -50 }}
                transition={{ duration: 1.2 }}
              >{f.text}</motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Question */}
        <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
          className="bg-gordemy-card border border-gordemy-border rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs bg-gordemy-blue/20 text-gordemy-blue px-2 py-0.5 rounded-full font-semibold">
              {SUBJECT_NAMES[q.subject] || q.subject}
            </span>
            <span className="text-xs text-gordemy-muted">{q.topic}</span>
          </div>
          <p className="text-white font-semibold text-lg leading-relaxed">{q.question_text}</p>
        </motion.div>

        {/* Options */}
        <div className="grid gap-3">
          {q.options.map((opt, i) => {
            let cls = "border-gordemy-border bg-gordemy-card text-gordemy-muted hover:border-gordemy-blue/50 hover:text-white cursor-pointer";
            if (submitted) {
              if (i === q.correct_answer)     cls = "border-gordemy-green/60 bg-gordemy-green/15 text-gordemy-green cursor-default";
              else if (i === selected)        cls = "border-red-500/60 bg-red-500/10 text-red-400 cursor-default";
              else                            cls = "border-gordemy-border/40 text-gordemy-muted/50 cursor-default";
            }
            return (
              <motion.button key={i} onClick={() => !submitted && handleSubmit(i)}
                className={`w-full text-left p-4 rounded-xl border font-medium transition-all ${cls}`}
                whileHover={!submitted ? { scale: 1.01 } : {}} whileTap={!submitted ? { scale: 0.99 } : {}}>
                <span className="text-gordemy-muted/60 mr-2">{["A","B","C","D"][i]}.</span>{opt}
              </motion.button>
            );
          })}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {questions.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all ${
              i < answers.length ? (answers[i].correct ? "bg-gordemy-green" : "bg-red-500")
              : i === currentQ ? "bg-gordemy-blue animate-pulse" : "bg-gordemy-border"
            }`} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Result Phase ──────────────────────────────────────────────────────────

  if (phase === "result" && duelResult) {
    return (
      <div className="max-w-[500px] mx-auto px-6 py-12 text-center">
        {/* Chest popup */}
        <AnimatePresence>
          {chest && user && <ChestPopup tier={chest} userId={user.id} onClose={() => setChest(null)} />}
        </AnimatePresence>

        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 12 }}>
          <div className="text-8xl mb-4">
            {duelResult.waiting ? "⏳" : duelResult.won ? "🏆" : "💀"}
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            {duelResult.waiting ? "Чекаємо суперника!" : duelResult.won ? "ПЕРЕМОГА!" : "ПОРАЗКА"}
          </h1>
          <p className="text-gordemy-muted mb-8">
            {duelResult.waiting ? "Твій результат збережено. Переможець буде відомий пізніше."
              : duelResult.won ? "Ти довів хто тут кращий! 💪" : "Суперник виявився сильнішим. Реванш?"}
          </p>
        </motion.div>

        {!duelResult.waiting && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gordemy-card border border-gordemy-green/30 rounded-2xl p-5">
              <div className="text-gordemy-muted text-sm mb-1">Твій рахунок</div>
              <div className="text-4xl font-black text-gordemy-green">{duelResult.myScore}/{DUEL_QUESTIONS}</div>
            </div>
            <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-5">
              <div className="text-gordemy-muted text-sm mb-1">Суперник</div>
              <div className="text-4xl font-black text-gordemy-orange">{duelResult.oppScore}/{DUEL_QUESTIONS}</div>
            </div>
          </div>
        )}

        {duelResult.xpEarned > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gordemy-blue/10 border border-gordemy-blue/30 rounded-2xl p-4 mb-6">
            <div className="text-gordemy-blue font-black text-2xl">+{duelResult.xpEarned} XP</div>
            <div className="text-gordemy-muted text-sm">+{duelResult.won ? "15" : "3"} 💎 Гемів</div>
          </motion.div>
        )}

        <div className="flex gap-3">
          <button onClick={() => { setPhase("lobby"); loadDuels(); }}
            className="flex-1 py-3 rounded-xl font-bold border border-gordemy-border text-gordemy-muted hover:text-white transition-all">
            ← Арена
          </button>
          <button onClick={() => { setOpponent(null); setPhase("create"); }}
            className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-gordemy-blue to-gordemy-purple text-white hover:opacity-90">
            Нова дуель ⚔️
          </button>
        </div>
      </div>
    );
  }

  // ─── Create Phase ──────────────────────────────────────────────────────────

  if (phase === "create") {
    return (
      <div className="max-w-[600px] mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setPhase("lobby")} className="text-gordemy-muted hover:text-white transition-colors">← Назад</button>
          <h1 className="text-2xl font-black text-white">Нова дуель ⚔️</h1>
        </div>

        {/* Opponent selector */}
        <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-5 mb-4">
          <h3 className="text-gordemy-muted text-xs font-bold mb-3 uppercase tracking-wider">Суперник</h3>
          {opponent ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gordemy-purple/20 flex items-center justify-center font-black text-gordemy-purple">
                  {opponent.name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-white">{opponent.name}</div>
                  <div className="text-xs text-gordemy-muted">Рівень {opponent.level} · {opponent.xp} XP</div>
                </div>
              </div>
              <button onClick={() => setOpponent(null)} className="text-gordemy-muted hover:text-red-400 text-sm">✕</button>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {players.map(p => (
                <button key={p.id} onClick={() => setOpponent(p)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gordemy-border hover:border-gordemy-blue/50 hover:bg-gordemy-blue/5 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gordemy-purple/20 flex items-center justify-center text-sm font-bold text-gordemy-purple">
                      {p.name[0]?.toUpperCase()}
                    </div>
                    <span className="text-white font-medium text-sm">{p.name}</span>
                  </div>
                  <span className="text-gordemy-muted text-sm">Lvl {p.level}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subject */}
        <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-5 mb-4">
          <h3 className="text-gordemy-muted text-xs font-bold mb-3 uppercase tracking-wider">Предмет</h3>
          <div className="grid grid-cols-2 gap-2">
            {SUBJECT_LIST.map(s => (
              <button key={s.id} onClick={() => setSubject(s.id)}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${subject === s.id ? "border-gordemy-blue/60 bg-gordemy-blue/10 text-gordemy-blue" : "border-gordemy-border text-gordemy-muted hover:border-gordemy-blue/30"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-5 mb-6">
          <h3 className="text-gordemy-muted text-xs font-bold mb-3 uppercase tracking-wider">Складність</h3>
          <div className="grid grid-cols-3 gap-2">
            {[{ id: "easy", label: "🟢 Легко", xp: "30 XP" }, { id: "medium", label: "🔵 Середнє", xp: "80 XP" }, { id: "hard", label: "🔴 Важко", xp: "120 XP" }].map(d => (
              <button key={d.id} onClick={() => setDifficulty(d.id as any)}
                className={`p-3 rounded-xl border text-center transition-all ${difficulty === d.id ? "border-gordemy-orange/60 bg-gordemy-orange/10 text-gordemy-orange" : "border-gordemy-border text-gordemy-muted hover:border-gordemy-orange/30"}`}>
                <div className="font-semibold text-sm">{d.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{d.xp}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={createDuel} disabled={!opponent || creating}
          className="w-full py-4 rounded-2xl font-black text-lg bg-gradient-to-r from-gordemy-blue to-gordemy-purple text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          {creating ? "Створення..." : "⚔️ Кинути виклик!"}
        </button>
      </div>
    );
  }

  // ─── Lobby Phase ───────────────────────────────────────────────────────────

  const pendingForMe   = myDuels.filter(d => d.opponent_id === user?.id && !d.opponent_done);
  const waitingForOpp  = myDuels.filter(d => d.creator_id  === user?.id && d.creator_done && !d.opponent_done);

  return (
    <div className="max-w-[600px] mx-auto px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">⚔️ Дуелі</h1>
          <p className="text-gordemy-muted text-sm mt-1">1v1 Quiz — хто кращий?</p>
        </div>
        <button onClick={() => { setOpponent(null); setPhase("create"); }}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-gordemy-blue to-gordemy-purple text-white font-bold text-sm hover:opacity-90 transition-all">
          + Дуель
        </button>
      </motion.div>

      {/* Incoming challenges */}
      {pendingForMe.length > 0 && (
        <div className="mb-6">
          <h2 className="text-gordemy-orange font-bold mb-3">🔥 Виклики для тебе ({pendingForMe.length})</h2>
          {pendingForMe.map(duel => (
            <div key={duel.id} className="bg-gordemy-card border border-gordemy-orange/30 rounded-2xl p-5 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gordemy-orange/20 flex items-center justify-center font-black text-gordemy-orange">
                    {(duel.challenger_name || "?")[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-white">{duel.challenger_name || "Суперник"} кидає виклик!</div>
                    <div className="text-xs text-gordemy-muted">{SUBJECT_NAMES[duel.subject]} · {duel.difficulty} · {DUEL_QUESTIONS} питань</div>
                  </div>
                </div>
                <span className="text-xs text-gordemy-orange bg-gordemy-orange/10 px-2 py-1 rounded-full">+{DUEL_XP_WIN} XP</span>
              </div>
              <button onClick={() => startBattle(duel)}
                className="w-full py-2.5 rounded-xl bg-gordemy-orange/20 border border-gordemy-orange/40 text-gordemy-orange font-bold hover:bg-gordemy-orange/30 transition-all">
                ⚔️ Прийняти виклик!
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Waiting */}
      {waitingForOpp.length > 0 && (
        <div className="mb-6">
          <h2 className="text-gordemy-muted font-bold mb-3">⏳ Чекаємо відповіді</h2>
          {waitingForOpp.map(duel => (
            <div key={duel.id} className="bg-gordemy-card border border-gordemy-border rounded-xl p-4 flex items-center justify-between mb-2">
              <div>
                <div className="font-semibold text-white text-sm">{duel.opponent_name}</div>
                <div className="text-xs text-gordemy-muted">{SUBJECT_NAMES[duel.subject]} · Твій рахунок: {duel.creator_score}/{DUEL_QUESTIONS}</div>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-gordemy-muted border-t-transparent animate-spin" />
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[{ id: "lobby", label: "🏟️ Гравці" }, { id: "history", label: "📜 Історія" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? "bg-gordemy-blue/20 border border-gordemy-blue/40 text-gordemy-blue" : "border border-gordemy-border text-gordemy-muted hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "lobby" && (
        <div className="space-y-2">
          {players.slice(0, 20).map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between p-4 bg-gordemy-card border border-gordemy-border rounded-xl hover:border-gordemy-blue/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gordemy-purple/20 flex items-center justify-center text-sm font-bold text-gordemy-purple">
                  {p.name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{p.name}</div>
                  <div className="text-xs text-gordemy-muted">Lvl {p.level} · 🔥 {p.streak}</div>
                </div>
              </div>
              <button onClick={() => { setOpponent(p); setPhase("create"); }}
                className="px-3 py-1.5 rounded-lg border border-gordemy-blue/30 text-gordemy-blue text-xs font-semibold hover:bg-gordemy-blue/10 transition-all">
                ⚔️ Виклик
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {history.length === 0 && (
            <div className="text-center py-12 text-gordemy-muted">
              <div className="text-5xl mb-3">📜</div><p>Немає завершених дуелей</p>
            </div>
          )}
          {history.map(duel => {
            const isCreator = duel.creator_id === user?.id;
            const myScore   = isCreator ? duel.creator_score : duel.opponent_score;
            const oppScore  = isCreator ? duel.opponent_score : duel.creator_score;
            const oppName   = isCreator ? duel.opponent_name : duel.challenger_name;
            const won = duel.winner_id === user?.id;
            return (
              <div key={duel.id} className={`p-4 rounded-xl border ${won ? "border-gordemy-green/30 bg-gordemy-green/5" : "border-gordemy-border bg-gordemy-card"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{won ? "🏆" : "💀"}</span>
                    <span className="font-semibold text-white text-sm">{oppName || "Суперник"}</span>
                    <span className="text-xs text-gordemy-muted">{SUBJECT_NAMES[duel.subject]}</span>
                  </div>
                  <div className="text-sm font-bold">
                    <span className={won ? "text-gordemy-green" : "text-gordemy-orange"}>{myScore}</span>
                    <span className="text-gordemy-muted mx-1">:</span>
                    <span className="text-gordemy-muted">{oppScore}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
