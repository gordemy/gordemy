"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getStudent } from "@/lib/student";
import { getXPMultiplier, getSpeedBonus } from "@/lib/gamification";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopicStat {
  topic: string;
  subject: string;
  total: number;
  correct: number;
  accuracy: number;
  avgTime: number;
}

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

const SUBJECT_NAMES: Record<string, string> = {
  ukr: "🇺🇦 Українська", math: "📐 Математика", hist: "📜 Історія",
  eng: "🌍 Англійська", bio: "🧬 Біологія", phys: "⚡ Фізика", chem: "🧪 Хімія",
};

const SUBJECT_COLORS: Record<string, string> = {
  ukr: "text-gordemy-orange border-gordemy-orange/40 bg-gordemy-orange/10",
  math: "text-gordemy-blue border-gordemy-blue/40 bg-gordemy-blue/10",
  hist: "text-gordemy-purple border-gordemy-purple/40 bg-gordemy-purple/10",
  eng: "text-gordemy-green border-gordemy-green/40 bg-gordemy-green/10",
  bio: "text-gordemy-green border-gordemy-green/30 bg-gordemy-green/5",
  phys: "text-gordemy-blue border-gordemy-blue/30 bg-gordemy-blue/5",
  chem: "text-gordemy-orange border-gordemy-orange/30 bg-gordemy-orange/5",
};

const TIME_PER_Q = 30;
const TRAINING_QUESTIONS = 5;

type Phase = "analysis" | "training" | "result";

function AccuracyRing({ value }: { value: number }) {
  const color = value >= 80 ? "#22c55e" : value >= 50 ? "#3b82f6" : "#f97316";
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#2a2a3e" strokeWidth="5" />
      <circle
        cx="28" cy="28" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        transform="rotate(-90 28 28)"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x="28" y="33" textAnchor="middle" fill={color} fontSize="11" fontWeight="800">{value}%</text>
    </svg>
  );
}

export default function WeakSpotPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("analysis");
  const [mySubjects, setMySubjects] = useState<string[]>([]);
  const [stats, setStats] = useState<TopicStat[]>([]);
  const [weakSpots, setWeakSpots] = useState<TopicStat[]>([]);
  const [selectedWeakSpot, setSelectedWeakSpot] = useState<TopicStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // Training
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [answers, setAnswers] = useState<{ correct: boolean; xp: number }[]>([]);
  const [totalXP, setTotalXP] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function init() {
    const s = await getStudent(user!.id);
    const subjects = s?.subjects?.length ? s.subjects : ["math", "ukr", "hist"];
    setMySubjects(subjects);
    await analyzeWeakSpots(subjects);
    setLoading(false);
  }

  async function analyzeWeakSpots(subjects: string[]) {
    setAnalyzing(true);
    // Get last 200 task answers for the student
    const { data: tasks } = await supabase
      .from("tasks")
      .select("subject, is_correct, question:questions(topic)")
      .eq("student_id", user!.id)
      .not("is_correct", "is", null)
      .in("subject", subjects)
      .order("date", { ascending: false })
      .limit(200);

    if (!tasks || tasks.length === 0) {
      setStats([]);
      setWeakSpots([]);
      setAnalyzing(false);
      return;
    }

    // Group by subject+topic
    const map: Record<string, { total: number; correct: number; subject: string }> = {};
    for (const t of tasks as any[]) {
      const topic = t.question?.topic || "Загальна тема";
      const key = `${t.subject}::${topic}`;
      if (!map[key]) map[key] = { total: 0, correct: 0, subject: t.subject };
      map[key].total++;
      if (t.is_correct) map[key].correct++;
    }

    const allStats: TopicStat[] = Object.entries(map)
      .filter(([, v]) => v.total >= 2) // at least 2 attempts
      .map(([key, v]) => {
        const [subject, topic] = key.split("::");
        return {
          topic,
          subject,
          total: v.total,
          correct: v.correct,
          accuracy: Math.round((v.correct / v.total) * 100),
          avgTime: 0,
        };
      })
      .sort((a, b) => a.accuracy - b.accuracy);

    setStats(allStats);
    // Weak = accuracy < 65%
    setWeakSpots(allStats.filter(s => s.accuracy < 65).slice(0, 6));
    setAnalyzing(false);
  }

  async function startTraining(spot: TopicStat) {
    setSelectedWeakSpot(spot);
    setLoading(true);

    const { data: qs } = await supabase
      .from("questions")
      .select("*")
      .eq("subject", spot.subject)
      .eq("topic", spot.topic)
      .limit(20);

    let pool = (qs || []) as Question[];
    if (pool.length < TRAINING_QUESTIONS) {
      // Fallback to same subject
      const { data: more } = await supabase
        .from("questions")
        .select("*")
        .eq("subject", spot.subject)
        .limit(20);
      pool = (more || []) as Question[];
    }

    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, TRAINING_QUESTIONS);
    setQuestions(shuffled);
    setCurrentQ(0);
    setAnswers([]);
    setSelected(null);
    setSubmitted(false);
    setTotalXP(0);
    setPhase("training");
    setLoading(false);
    startTimer();
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = Date.now();
    setTimeLeft(TIME_PER_Q);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); handleAnswer(-1); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleAnswer(idx: number) {
    if (submitted && idx !== -1) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);
    setSelected(idx);

    const q = questions[currentQ];
    const correct = idx === q.correct_answer;
    const timeTaken = (Date.now() - startTimeRef.current) / 1000;
    const speedBonus = getSpeedBonus(timeTaken);
    const mult = getXPMultiplier();
    const baseXP = correct ? 20 : 0;
    const xp = Math.round((baseXP + (correct ? speedBonus.bonusXP : 0)) * mult.multiplier);

    const newAnswers = [...answers, { correct, xp }];
    setAnswers(newAnswers);
    setTotalXP(prev => prev + xp);

    setTimeout(async () => {
      if (currentQ + 1 < questions.length) {
        setCurrentQ(prev => prev + 1);
        setSelected(null);
        setSubmitted(false);
        startTimer();
      } else {
        // Save XP + update task history
        const totalXPEarned = newAnswers.reduce((sum, a) => sum + a.xp, 0);
        const { data: stu } = await supabase.from("students").select("xp, level").eq("id", user!.id).single();
        if (stu) {
          const newXp = (stu.xp || 0) + totalXPEarned;
          await supabase.from("students").update({ xp: newXp, level: Math.floor(newXp / 100) + 1 }).eq("id", user!.id);
        }
        setPhase("result");
      }
    }, 1400);
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="max-w-[600px] mx-auto px-6 py-12 text-center">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-6xl mb-4 inline-block"
        >
          🎯
        </motion.div>
        <p className="text-gordemy-muted text-lg">
          {analyzing ? "AI аналізує твої слабкі місця..." : "Завантаження..."}
        </p>
      </div>
    );
  }

  // ─── Training Phase ───────────────────────────────────────────────────────

  if (phase === "training" && questions.length > 0) {
    const q = questions[currentQ];
    const timePercent = (timeLeft / TIME_PER_Q) * 100;
    const timeColor = timePercent > 50 ? "bg-gordemy-green" : timePercent > 25 ? "bg-gordemy-orange" : "bg-red-500";

    return (
      <div className="max-w-[600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="text-2xl">🎯</div>
          <div>
            <div className="text-sm text-gordemy-muted">Тренування слабкого місця</div>
            <div className="font-bold text-white">{selectedWeakSpot?.topic}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="font-black text-xl text-white">{currentQ + 1}/{questions.length}</div>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`text-2xl font-black ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-white"}`}>{timeLeft}s</div>
          <div className="flex-1 h-2 bg-gordemy-border rounded-full overflow-hidden">
            <motion.div className={`h-full ${timeColor} rounded-full`} animate={{ width: `${timePercent}%` }} transition={{ duration: 0.9, ease: "linear" }} />
          </div>
          <div className="text-gordemy-blue font-bold text-sm">+{totalXP} XP</div>
        </div>

        {/* Question */}
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gordemy-card border border-gordemy-border rounded-2xl p-6 mb-4"
        >
          <div className="flex gap-2 mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${SUBJECT_COLORS[q.subject] || ""}`}>
              {SUBJECT_NAMES[q.subject] || q.subject}
            </span>
            <span className="text-xs text-gordemy-muted">{q.topic}</span>
          </div>
          <p className="text-white font-semibold text-lg leading-relaxed">{q.question_text}</p>
        </motion.div>

        {/* Options */}
        <div className="grid gap-3 mb-4">
          {q.options.map((opt, i) => {
            let cls = "border-gordemy-border bg-gordemy-card text-gordemy-muted hover:border-gordemy-blue/50 hover:text-white cursor-pointer";
            if (submitted) {
              if (i === q.correct_answer) cls = "border-gordemy-green/60 bg-gordemy-green/15 text-gordemy-green cursor-default";
              else if (i === selected) cls = "border-red-500/60 bg-red-500/10 text-red-400 cursor-default";
              else cls = "border-gordemy-border bg-gordemy-card text-gordemy-muted/50 cursor-default";
            }
            return (
              <motion.button
                key={i}
                onClick={() => !submitted && handleAnswer(i)}
                className={`w-full text-left p-4 rounded-xl border font-medium transition-all ${cls}`}
                whileHover={!submitted ? { scale: 1.01 } : {}}
              >
                <span className="text-gordemy-muted/60 mr-2">{["A","B","C","D"][i]}.</span>{opt}
              </motion.button>
            );
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {submitted && q.explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-gordemy-blue/5 border border-gordemy-blue/20 rounded-xl p-4"
            >
              <div className="text-xs text-gordemy-blue font-bold mb-1">💡 Пояснення:</div>
              <p className="text-gordemy-muted text-sm">{q.explanation}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Result Phase ─────────────────────────────────────────────────────────

  if (phase === "result") {
    const correct = answers.filter(a => a.correct).length;
    const accuracy = Math.round((correct / answers.length) * 100);
    const improved = selectedWeakSpot ? accuracy > selectedWeakSpot.accuracy : false;

    return (
      <div className="max-w-[500px] mx-auto px-6 py-12 text-center">
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
          <div className="text-7xl mb-4">{accuracy >= 80 ? "🎯" : accuracy >= 60 ? "📈" : "💪"}</div>
          <h1 className="text-3xl font-black text-white mb-2">
            {accuracy >= 80 ? "Відмінно!" : accuracy >= 60 ? "Покращення!" : "Тренуйся ще!"}
          </h1>
          <p className="text-gordemy-muted mb-6">
            {selectedWeakSpot?.topic} · {SUBJECT_NAMES[selectedWeakSpot?.subject || ""]}
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-4">
            <div className="text-3xl font-black text-gordemy-green">{correct}/{answers.length}</div>
            <div className="text-xs text-gordemy-muted">Правильно</div>
          </div>
          <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-4">
            <div className="text-3xl font-black text-gordemy-blue">{accuracy}%</div>
            <div className="text-xs text-gordemy-muted">Точність</div>
          </div>
          <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-4">
            <div className="text-3xl font-black text-gordemy-orange">{totalXP}</div>
            <div className="text-xs text-gordemy-muted">XP зароблено</div>
          </div>
        </div>

        {improved && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-gordemy-green/10 border border-gordemy-green/30 rounded-2xl p-4 mb-6">
            <div className="text-gordemy-green font-bold">📈 Прогрес зафіксовано!</div>
            <div className="text-gordemy-muted text-sm">Твій результат покращився з {selectedWeakSpot?.accuracy}% до {accuracy}%</div>
          </motion.div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { setPhase("analysis"); }}
            className="flex-1 py-3 rounded-xl border border-gordemy-border text-gordemy-muted font-bold hover:text-white transition-all"
          >
            ← Всі слабкі місця
          </button>
          <button
            onClick={() => selectedWeakSpot && startTraining(selectedWeakSpot)}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gordemy-blue to-gordemy-purple text-white font-black hover:opacity-90 transition-all"
          >
            🔄 Ще раз
          </button>
        </div>
      </div>
    );
  }

  // ─── Analysis Phase ───────────────────────────────────────────────────────

  const strongSpots = stats.filter(s => s.accuracy >= 80).slice(0, 4);

  return (
    <div className="max-w-[600px] mx-auto px-6 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-black text-white flex items-center gap-2">🎯 Слабкі місця</h1>
        <p className="text-gordemy-muted text-sm mt-1">
          AI аналізує твої відповіді і знаходить теми, які потребують уваги
        </p>
      </motion.div>

      {/* No data */}
      {stats.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-white mb-2">Поки що замало даних</h2>
          <p className="text-gordemy-muted mb-6">Пройди хоча б кілька завдань, щоб AI зміг зробити аналіз!</p>
          <a href="/dashboard" className="px-6 py-3 rounded-xl bg-gordemy-blue/20 border border-gordemy-blue/40 text-gordemy-blue font-bold hover:bg-gordemy-blue/30 transition-all">
            ← Дашборд
          </a>
        </div>
      )}

      {/* Weak spots */}
      {weakSpots.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-gordemy-orange font-bold">⚠️ Слабкі місця ({weakSpots.length})</span>
            <span className="text-xs text-gordemy-muted">— точність менше 65%</span>
          </div>
          <div className="space-y-3">
            {weakSpots.map((spot, i) => (
              <motion.div
                key={`${spot.subject}-${spot.topic}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-gordemy-card border border-gordemy-orange/20 rounded-2xl p-5 hover:border-gordemy-orange/40 transition-all"
              >
                <div className="flex items-center gap-4">
                  <AccuracyRing value={spot.accuracy} />
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm mb-0.5">{spot.topic}</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${SUBJECT_COLORS[spot.subject] || ""}`}>
                        {SUBJECT_NAMES[spot.subject] || spot.subject}
                      </span>
                      <span className="text-xs text-gordemy-muted">{spot.total} спроб</span>
                    </div>
                  </div>
                  <button
                    onClick={() => startTraining(spot)}
                    className="shrink-0 px-4 py-2 rounded-xl bg-gordemy-orange/20 border border-gordemy-orange/40 text-gordemy-orange font-bold text-sm hover:bg-gordemy-orange/30 transition-all"
                  >
                    🎯 Тренувати
                  </button>
                </div>
                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gordemy-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gordemy-orange rounded-full"
                      style={{ width: `${spot.accuracy}%` }}
                    />
                  </div>
                  <span className="text-xs text-gordemy-muted">{spot.correct}/{spot.total}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Strong spots */}
      {strongSpots.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-gordemy-green font-bold">✅ Твої сильні сторони</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {strongSpots.map(spot => (
              <div
                key={`${spot.subject}-${spot.topic}`}
                className="bg-gordemy-card border border-gordemy-green/20 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <AccuracyRing value={spot.accuracy} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm truncate">{spot.topic}</div>
                    <div className="text-xs text-gordemy-muted">{SUBJECT_NAMES[spot.subject]}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
