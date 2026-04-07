"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getStudent, type Student, type Question } from "@/lib/student";
import { CHARACTERS, AURA_STYLES, FRAME_STYLES, DEFAULT_AVATAR } from "@/lib/avatar";
import { getComboState } from "@/lib/gamification";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GhostAnswer { questionId: string; correct: boolean; subject: string; }
interface AvatarData { character: string; hat: string; accessory: string; aura: string; frame: string; }

type Phase =
  | "loading"
  | "intro"
  | "battle"
  | "hit-player"
  | "hit-ghost"
  | "win"
  | "lose"
  | "no-ghost";

interface FighterState {
  hp: number;
  maxHp: number;
  combo: number;
  score: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const QUESTIONS_PER_BATTLE = 7;
const BASE_DAMAGE = 20;
const BASE_HP = 100;

// ─── Hit Flash Component ─────────────────────────────────────────────────────

function HitFlash({ color }: { color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0.7 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={`fixed inset-0 pointer-events-none z-50 ${color}`}
    />
  );
}

// ─── Fighter Card ─────────────────────────────────────────────────────────────

function FighterCard({
  label, emoji, hp, maxHp, combo, score, isPlayer, shaking, color,
}: {
  label: string; emoji: string; hp: number; maxHp: number;
  combo: number; score: number; isPlayer: boolean;
  shaking: boolean; color: string;
}) {
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const hpColor = hpPct > 60 ? "from-green-500 to-green-400"
    : hpPct > 30 ? "from-yellow-500 to-orange-400"
    : "from-red-600 to-red-400";

  return (
    <motion.div
      animate={shaking ? { x: [-6, 6, -4, 4, 0] } : {}}
      transition={{ duration: 0.3 }}
      className={`flex-1 rounded-2xl border ${color} bg-gordemy-card p-3 flex flex-col items-center gap-2`}
    >
      {/* Label */}
      <div className="text-[10px] font-bold text-gordemy-muted uppercase tracking-widest">{label}</div>

      {/* Character */}
      <motion.div
        animate={!isPlayer ? { scaleX: -1 } : {}}
        className="text-5xl select-none"
      >
        {emoji}
      </motion.div>

      {/* HP Bar */}
      <div className="w-full">
        <div className="flex justify-between text-[9px] text-gordemy-muted mb-0.5">
          <span>HP</span>
          <span>{Math.max(0, hp)}/{maxHp}</span>
        </div>
        <div className="h-2 rounded-full bg-black/40 overflow-hidden border border-white/10">
          <motion.div
            animate={{ width: `${hpPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`h-full rounded-full bg-gradient-to-r ${hpColor}`}
          />
        </div>
      </div>

      {/* Combo + Score */}
      <div className="flex gap-2 text-[10px]">
        {combo > 1 && (
          <span className="font-black text-yellow-400">×{combo} COMBO</span>
        )}
        <span className="text-gordemy-muted">⚡{score}</span>
      </div>
    </motion.div>
  );
}

// ─── Battle Animation Overlay ─────────────────────────────────────────────────

function BattleEffect({ type }: { type: "punch" | "win" | "lose" | null }) {
  if (!type) return null;
  return (
    <AnimatePresence>
      {type === "punch" && (
        <motion.div
          key="punch"
          initial={{ scale: 0.3, opacity: 1 }}
          animate={{ scale: 1.8, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-40"
        >
          <span className="text-7xl">💥</span>
        </motion.div>
      )}
      {type === "win" && (
        <motion.div
          key="win"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-40 bg-black/30"
        >
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [-5, 5, 0] }}
              transition={{ duration: 0.6 }}
              className="text-8xl mb-2"
            >
              🏆
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-black text-yellow-300 tracking-widest"
            >
              VICTORY
            </motion.p>
          </div>
        </motion.div>
      )}
      {type === "lose" && (
        <motion.div
          key="lose"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-40 bg-black/50"
        >
          <motion.p
            animate={{ scale: [1.3, 1], opacity: [0, 1] }}
            transition={{ duration: 0.4 }}
            className="text-4xl font-black text-red-400 tracking-widest"
          >
            DEFEAT
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GhostBattlePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [student, setStudent] = useState<Student & { avatar_data?: AvatarData; gems?: number; xp?: number } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [ghostAnswers, setGhostAnswers] = useState<GhostAnswer[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [player, setPlayer] = useState<FighterState>({ hp: BASE_HP, maxHp: BASE_HP, combo: 0, score: 0 });
  const [ghost, setGhost]   = useState<FighterState>({ hp: BASE_HP, maxHp: BASE_HP, combo: 0, score: 0 });
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeGhost, setShakeGhost]   = useState(false);
  const [flashColor, setFlashColor]   = useState("");
  const [battleEffect, setBattleEffect] = useState<"punch" | "win" | "lose" | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load data
  useEffect(() => {
    if (!user) return;
    (async () => {
      const st = await getStudent(user.id);
      if (!st) { router.replace("/dashboard"); return; }
      setStudent(st as any);

      // Load yesterday ghost answers
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split("T")[0];

      const { data: ghostData } = await supabase
        .from("task_answers")
        .select("question_id, correct, subject")
        .eq("student_id", user.id)
        .gte("answered_at", `${yStr}T00:00:00`)
        .lte("answered_at", `${yStr}T23:59:59`)
        .limit(QUESTIONS_PER_BATTLE);

      if (!ghostData || ghostData.length < 3) {
        setPhase("no-ghost");
        return;
      }

      const ghostIds = ghostData.map((g: any) => g.question_id);
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .in("id", ghostIds)
        .limit(QUESTIONS_PER_BATTLE);

      setGhostAnswers(ghostData.map((g: any) => ({
        questionId: g.question_id,
        correct: g.correct,
        subject: g.subject,
      })));
      setQuestions((qs || []).slice(0, QUESTIONS_PER_BATTLE));
      setPhase("intro");
    })();
  }, [user, router]);

  // Timer for each question
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(15);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAnswer(null); // timeout = wrong
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (phase === "battle" && qIndex < questions.length) {
      setSelected(null);
      startTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, qIndex, questions.length, startTimer]);

  // Handle answer
  const handleAnswer = useCallback((choice: string | null) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (selected !== null) return;
    const q = questions[qIndex];
    if (!q) return;

    setSelected(choice || "");
    const playerCorrect = choice !== null && parseInt(choice) === q.correct_answer;
    const ghostGa = ghostAnswers.find(g => g.questionId === q.id);
    const ghostCorrect = ghostGa?.correct ?? false;

    // Calculate damage
    const playerCombo = playerCorrect ? player.combo + 1 : 0;
    const ghostCombo  = ghostCorrect  ? ghost.combo  + 1 : 0;
    const playerDmg   = playerCorrect ? Math.round(BASE_DAMAGE * (1 + playerCombo * 0.25)) : 0;
    const ghostDmg    = ghostCorrect  ? Math.round(BASE_DAMAGE * (1 + ghostCombo  * 0.25)) : 0;

    if (playerCorrect) {
      // Player hits ghost
      setBattleEffect("punch");
      setTimeout(() => setBattleEffect(null), 400);
      setFlashColor("bg-blue-500/20");
      setTimeout(() => setFlashColor(""), 300);
      setShakeGhost(true);
      setTimeout(() => setShakeGhost(false), 350);
      setGhost(prev => ({ ...prev, hp: prev.hp - playerDmg, combo: ghostCombo, score: prev.score + (ghostCorrect ? 1 : 0) }));
      setPlayer(prev => ({ ...prev, combo: playerCombo, score: prev.score + 1 }));
    } else {
      // Ghost hits player
      setFlashColor("bg-red-500/20");
      setTimeout(() => setFlashColor(""), 300);
      setShakePlayer(true);
      setTimeout(() => setShakePlayer(false), 350);
      setPlayer(prev => ({ ...prev, combo: 0 }));
    }

    if (ghostCorrect) {
      setPlayer(prev => ({ ...prev, hp: prev.hp - ghostDmg }));
    }

    // Next question after delay
    setTimeout(() => {
      const nextIdx = qIndex + 1;
      if (nextIdx >= questions.length) {
        endBattle(playerCorrect ? player.score + 1 : player.score, ghost.score);
      } else {
        setQIndex(nextIdx);
        setPhase("battle");
      }
    }, 1200);
  }, [qIndex, questions, ghostAnswers, player, ghost, selected]); // eslint-disable-line

  const endBattle = useCallback(async (finalPlayerScore: number, finalGhostScore: number) => {
    const playerWon = finalPlayerScore >= finalGhostScore;
    setBattleEffect(playerWon ? "win" : "lose");

    if (!user || !student) return;

    // Grant rewards + chest
    const xpGain = playerWon ? 80 : 20;
    const gemsGain = playerWon ? 10 : 2;

    // Add chest to inventory
    const tier = playerWon
      ? (finalPlayerScore >= questions.length - 1 ? "epic" : "rare")
      : "common";

    const now = new Date();
    const hours = { common: 1, rare: 4, epic: 12, legendary: 24 }[tier];
    const newChest = {
      id: `ghost-${Date.now()}`,
      tier,
      earnedAt: now.toISOString(),
      unlockAt: new Date(now.getTime() + hours * 3600000).toISOString(),
      opened: false,
    };

    const { data: fresh } = await supabase.from("students").select("chest_inventory, xp, gems").eq("id", user.id).single();
    const inv = Array.isArray(fresh?.chest_inventory) ? fresh.chest_inventory : [];

    await supabase.from("students").update({
      xp:   (fresh?.xp   || 0) + xpGain,
      gems: (fresh?.gems || 0) + gemsGain,
      chest_inventory: [...inv, newChest],
    }).eq("id", user.id);

    setTimeout(() => {
      setBattleEffect(null);
      setPhase(playerWon ? "win" : "lose");
    }, 2000);
  }, [user, student, questions.length]);

  if (authLoading || phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-full border-4 border-gordemy-purple border-t-transparent" />
      </div>
    );
  }

  // Avatar
  const avatarData: AvatarData = { ...DEFAULT_AVATAR, ...(student?.avatar_data || {}) };
  const char = CHARACTERS.find(c => c.id === avatarData.character) || CHARACTERS[0];
  const aura = AURA_STYLES[avatarData.aura as keyof typeof AURA_STYLES] ?? "";

  const q = questions[qIndex];
  const ghostGa = q ? ghostAnswers.find(g => g.questionId === q.id) : null;

  // ── NO GHOST ──
  if (phase === "no-ghost") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">👻</div>
        <h1 className="text-2xl font-black text-white mb-3">Привид не знайдений</h1>
        <p className="text-gordemy-muted mb-8">Зіграй хоча б 3 завдання сьогодні, щоб завтра можна було битися зі своїм привидом!</p>
        <button onClick={() => router.push("/dashboard")}
          className="px-6 py-3 rounded-2xl bg-gordemy-purple text-white font-bold">
          На головну
        </button>
      </div>
    );
  }

  // ── INTRO ──
  if (phase === "intro") {
    return (
      <div className="max-w-md mx-auto px-4 py-12 flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
          className="text-7xl mb-6">👻</motion.div>
        <h1 className="text-3xl font-black text-white mb-2">БИТВА З СОБОЮ</h1>
        <p className="text-gordemy-muted mb-2">Ти проти <span className="text-cyan-400 font-bold">вчорашнього себе</span></p>
        <p className="text-gordemy-muted text-sm mb-8">{questions.length} питань · Відповідай швидко · Комбо множить урон</p>

        <div className="flex gap-6 mb-10 w-full justify-center">
          <div className="text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 border-gordemy-blue ${aura} mx-auto`}>
              <span className="text-4xl">{char.emoji}</span>
            </div>
            <div className="text-white font-bold mt-2 text-sm">Ти</div>
            <div className="text-gordemy-blue text-xs">Сьогодні</div>
          </div>
          <div className="flex items-center text-3xl font-black text-gordemy-orange">VS</div>
          <div className="text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center border-4 border-gray-500 bg-gray-800/50 mx-auto">
              <span className="text-4xl opacity-60">{char.emoji}</span>
            </div>
            <div className="text-gray-400 font-bold mt-2 text-sm">Привид</div>
            <div className="text-gray-500 text-xs">Вчора</div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setPhase("battle")}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-black text-xl shadow-lg shadow-cyan-500/30 relative overflow-hidden"
        >
          <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          ⚔️ БИТИСЯ!
        </motion.button>
      </div>
    );
  }

  // ── BATTLE ──
  if (phase === "battle" && q) {
    const comboState = getComboState(player.combo);
    const timerPct = (timeLeft / 15) * 100;
    const timerColor = timeLeft > 8 ? "from-green-500 to-green-400"
      : timeLeft > 4 ? "from-yellow-500 to-orange-400"
      : "from-red-600 to-red-400";

    return (
      <div className="max-w-md mx-auto px-4 py-6 flex flex-col min-h-screen">
        {/* Flash overlay */}
        {flashColor && <HitFlash color={flashColor} />}

        {/* Battle effect overlay */}
        <BattleEffect type={battleEffect} />

        {/* Progress */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-1 flex-1">
            {questions.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full ${i < qIndex ? "bg-gordemy-green" : i === qIndex ? "bg-gordemy-blue" : "bg-gordemy-border"}`} />
            ))}
          </div>
          <span className="text-xs text-gordemy-muted">{qIndex + 1}/{questions.length}</span>
        </div>

        {/* Fighters */}
        <div className="flex gap-3 mb-4">
          <FighterCard label="ТИ" emoji={char.emoji} hp={player.hp} maxHp={BASE_HP}
            combo={player.combo} score={player.score} isPlayer color="border-gordemy-blue/40" shaking={shakePlayer} />
          <FighterCard label="ПРИВИД" emoji={char.emoji} hp={ghost.hp} maxHp={BASE_HP}
            combo={ghost.combo} score={ghost.score} isPlayer={false} color="border-gray-500/40" shaking={shakeGhost} />
        </div>

        {/* Timer bar */}
        <div className="h-2 rounded-full bg-gordemy-card border border-gordemy-border mb-4 overflow-hidden">
          <motion.div animate={{ width: `${timerPct}%` }} transition={{ duration: 0.3 }}
            className={`h-full rounded-full bg-gradient-to-r ${timerColor}`} />
        </div>

        {/* Combo badge */}
        <AnimatePresence>
          {player.combo >= 2 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="text-center mb-3">
              <span className={`text-sm font-black px-3 py-1 rounded-full ${comboState.color} bg-white/10`}>
                {comboState.emoji} {comboState.label} ×{comboState.multiplier}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ghost hint */}
        {ghostGa && (
          <div className="text-center text-[10px] text-gordemy-muted mb-2">
            👻 Вчора ти відповів {ghostGa.correct ? "✅ правильно" : "❌ неправильно"}
          </div>
        )}

        {/* Question */}
        <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-4 mb-4 flex-1 flex flex-col justify-center">
          <p className="text-white font-semibold text-sm leading-relaxed text-center">{q.question_text}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-2">
          {(q.options || []).map((opt, i) => {
            const idxStr = String(i);
            const isSelected = selected === idxStr;
            const isCorrect = i === q.correct_answer;
            const showResult = selected !== null;
            const letters = ["A", "B", "C", "D"];

            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.97 }}
                onClick={() => !selected && handleAnswer(idxStr)}
                disabled={!!selected}
                className={`w-full text-left px-4 py-3 rounded-2xl border font-semibold text-sm transition-all ${
                  !showResult
                    ? "bg-gordemy-card border-gordemy-border text-white hover:border-gordemy-blue/50"
                    : isCorrect
                    ? "bg-gordemy-green/20 border-gordemy-green text-gordemy-green"
                    : isSelected
                    ? "bg-red-500/20 border-red-500 text-red-400"
                    : "bg-gordemy-card border-gordemy-border text-gordemy-muted opacity-50"
                }`}
              >
                <span className="font-black mr-2">{letters[i]}.</span>{opt}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── WIN ──
  if (phase === "win") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <span className="text-8xl">🏆</span>
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="text-3xl font-black text-yellow-300 mt-4 mb-2">ПЕРЕМОГА!</motion.h1>
        <p className="text-gordemy-muted mb-2">Ти краще ніж вчора!</p>
        <div className="flex gap-4 mt-4 mb-8">
          <div className="text-center"><div className="text-2xl font-black text-white">{player.score}</div><div className="text-xs text-gordemy-muted">твоїх очок</div></div>
          <div className="text-gordemy-muted text-xl">vs</div>
          <div className="text-center"><div className="text-2xl font-black text-gray-400">{ghost.score}</div><div className="text-xs text-gordemy-muted">привид</div></div>
        </div>
        <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-4 mb-8 w-full">
          <div className="text-gordemy-green font-bold">+80 XP</div>
          <div className="text-yellow-300 font-bold">+10 💎</div>
          <div className="text-gordemy-blue text-sm mt-2">🎁 Сундук додано в інвентар!</div>
        </div>
        <button onClick={() => router.push("/dashboard")}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-gordemy-green to-gordemy-blue text-white font-black text-lg">
          На головну
        </button>
      </div>
    );
  }

  // ── LOSE ──
  return (
    <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
        <span className="text-8xl">💀</span>
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="text-3xl font-black text-red-400 mt-4 mb-2">ПОРАЗКА</motion.h1>
      <p className="text-gordemy-muted mb-2">Вчорашній ти був сильніший. Зміни це!</p>
      <div className="flex gap-4 mt-4 mb-8">
        <div className="text-center"><div className="text-2xl font-black text-white">{player.score}</div><div className="text-xs text-gordemy-muted">твоїх очок</div></div>
        <div className="text-gordemy-muted text-xl">vs</div>
        <div className="text-center"><div className="text-2xl font-black text-gray-400">{ghost.score}</div><div className="text-xs text-gordemy-muted">привид</div></div>
      </div>
      <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-4 mb-8 w-full">
        <div className="text-gordemy-muted font-bold">+20 XP (за участь)</div>
        <div className="text-gordemy-blue text-sm mt-2">🎁 Звичайний сундук додано!</div>
      </div>
      <div className="flex gap-3 w-full">
        <button onClick={() => { setPhase("intro"); setQIndex(0); setSelected(null); setPlayer({ hp: BASE_HP, maxHp: BASE_HP, combo: 0, score: 0 }); setGhost({ hp: BASE_HP, maxHp: BASE_HP, combo: 0, score: 0 }); }}
          className="flex-1 py-4 rounded-2xl bg-gordemy-card border border-gordemy-border text-white font-bold">
          Реванш
        </button>
        <button onClick={() => router.push("/dashboard")}
          className="flex-1 py-4 rounded-2xl bg-gordemy-purple text-white font-bold">
          На головну
        </button>
      </div>
    </div>
  );
}
