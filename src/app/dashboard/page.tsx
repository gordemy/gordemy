"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import {
  getStudent, getTodayTasks, generateDailyTasks,
  type Student, type Task, type Question,
} from "@/lib/student";
import { getLeague } from "@/lib/achievements";
import { getPlayerTitle, getXPMultiplier } from "@/lib/gamification";
import {
  CHARACTERS, HATS, ACCESSORIES, AURAS, FRAMES,
  AURA_STYLES, FRAME_STYLES, DEFAULT_AVATAR,
} from "@/lib/avatar";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AvatarData {
  character: string;
  hat: string;
  accessory: string;
  aura: string;
  frame: string;
}

interface ChestItem {
  id: string;
  tier: "common" | "rare" | "epic" | "legendary";
  earnedAt: string;
  unlockAt: string;
  opened: boolean;
}

type TaskWithQuestion = Task & { question: Question | null };

// ─── Constants ──────────────────────────────────────────────────────────────

const CHEST_CFG = {
  common:    { emoji: "📦", label: "Звичайний",   color: "from-slate-600 to-slate-800",   border: "border-slate-500/60",  glow: "shadow-slate-500/20",  hours: 1  },
  rare:      { emoji: "💠", label: "Рідкісний",   color: "from-blue-600 to-blue-900",     border: "border-blue-400/60",   glow: "shadow-blue-400/30",   hours: 4  },
  epic:      { emoji: "🔮", label: "Епічний",     color: "from-purple-600 to-purple-900", border: "border-purple-400/60", glow: "shadow-purple-400/40", hours: 12 },
  legendary: { emoji: "🌟", label: "Легендарний", color: "from-yellow-500 to-orange-700", border: "border-yellow-400/70", glow: "shadow-yellow-400/50", hours: 24 },
} as const;

const GAME_MODES = [
  {
    id: "boss-daily", emoji: "👹", label: "Денний Бос",
    sub: "Битва кожного дня", href: "/boss",
    grad: "from-red-900/40 to-red-950/60", border: "border-red-500/40",
    badge: "DAILY", badgeColor: "bg-red-500",
  },
  {
    id: "boss-weekly", emoji: "🐉", label: "Тижневий Бос",
    sub: "Епічна битва тижня", href: "/boss?mode=weekly",
    grad: "from-orange-900/40 to-amber-950/60", border: "border-orange-400/40",
    badge: "WEEKLY", badgeColor: "bg-orange-500",
  },
  {
    id: "ghost", emoji: "👻", label: "Битва з Собою",
    sub: "Переможи вчорашнього себе", href: "/ghost",
    grad: "from-cyan-900/40 to-sky-950/60", border: "border-cyan-400/40",
    badge: "NEW", badgeColor: "bg-cyan-500",
  },
  {
    id: "duel", emoji: "⚔️", label: "Дуель",
    sub: "1v1 з живим гравцем", href: "/duel",
    grad: "from-violet-900/40 to-purple-950/60", border: "border-violet-400/40",
    badge: null, badgeColor: "",
  },
  {
    id: "card", emoji: "🃏", label: "Карти",
    sub: "Швидка карткова гра", href: "/card-battle",
    grad: "from-green-900/40 to-emerald-950/60", border: "border-green-400/40",
    badge: null, badgeColor: "",
  },
  {
    id: "weakspot", emoji: "🎯", label: "Слабкі місця",
    sub: "AI знаходить прогалини", href: "/weakspot",
    grad: "from-pink-900/40 to-rose-950/60", border: "border-pink-400/40",
    badge: "AI", badgeColor: "bg-pink-500",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimer(unlockAt: string): string {
  const diff = new Date(unlockAt).getTime() - Date.now();
  if (diff <= 0) return "ГОТОВО";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}г ${m}хв`;
  if (m > 0) return `${m}хв ${s}с`;
  return `${s}с`;
}

function isReady(unlockAt: string) {
  return new Date(unlockAt).getTime() <= Date.now();
}

function isWeeklyBossDay() {
  return new Date().getDay() === 1; // Monday
}

function getStreakMultiplier(streak: number) {
  if (streak >= 14) return { label: "×3 XP", color: "text-red-400" };
  if (streak >= 7)  return { label: "×2 XP", color: "text-orange-400" };
  if (streak >= 3)  return { label: "×1.5 XP", color: "text-yellow-400" };
  return { label: "×1 XP", color: "text-gordemy-muted" };
}

// ─── CharacterStage ──────────────────────────────────────────────────────────

function CharacterStage({ avatar, student, title }: {
  avatar: AvatarData;
  student: Student & { gems?: number; streak?: number; level?: number; xp?: number };
  title: { title: string; color: string };
}) {
  const char  = CHARACTERS.find(c => c.id === avatar.character) || CHARACTERS[0];
  const hat   = HATS.find(h => h.id === avatar.hat);
  const acc   = ACCESSORIES.find(a => a.id === avatar.accessory);
  const auraStyle  = AURA_STYLES[avatar.aura as keyof typeof AURA_STYLES]  ?? "";
  const frameStyle = FRAME_STYLES[avatar.frame as keyof typeof FRAME_STYLES] ?? "border-gordemy-border";

  const xpProgress = Math.min(100, (student.xp || 0) % 100);
  const streak = student.streak || 0;
  const mult = getStreakMultiplier(streak);
  const league = getLeague(student.xp || 0);

  return (
    <div className="relative flex flex-col items-center pt-6 pb-4">
      {/* Radial glow */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-30 bg-gordemy-purple pointer-events-none" />

      {/* Top row: streak | gems | league */}
      <div className="w-full flex items-center justify-between px-2 mb-6 z-10">
        {/* Streak */}
        <motion.div
          whileTap={{ scale: 0.9 }}
          className="flex items-center gap-1.5 bg-gordemy-card border border-gordemy-border rounded-2xl px-3 py-2"
        >
          <motion.span
            animate={{ scale: streak > 0 ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xl"
          >
            🔥
          </motion.span>
          <div>
            <div className="text-white font-extrabold text-sm leading-none">{streak}</div>
            <div className={`text-[10px] font-bold ${mult.color}`}>{mult.label}</div>
          </div>
        </motion.div>

        {/* Gems */}
        <motion.div
          whileTap={{ scale: 0.9 }}
          className="flex items-center gap-1.5 bg-gordemy-card border border-gordemy-border rounded-2xl px-3 py-2"
        >
          <span className="text-xl">💎</span>
          <span className="text-white font-extrabold text-sm">{student.gems || 0}</span>
        </motion.div>

        {/* League */}
        <Link href="/leaderboard">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className={`flex items-center gap-1.5 rounded-2xl px-3 py-2 border ${league.bg}`}
          >
            <span className="text-xl">{league.icon}</span>
            <span className={`font-extrabold text-sm ${league.color}`}>{league.name}</span>
          </motion.div>
        </Link>
      </div>

      {/* Character */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 mb-4"
      >
        <div className={`relative w-36 h-36 rounded-full flex items-center justify-center border-4 ${frameStyle} ${auraStyle} shadow-2xl`}>
          <span className="text-8xl select-none">{char.emoji}</span>
          {hat && hat.id !== "none" && (
            <span className="absolute -top-5 right-0 text-4xl drop-shadow-lg">{hat.emoji}</span>
          )}
          {acc && acc.id !== "none" && (
            <span className="absolute -bottom-2 -right-3 text-3xl drop-shadow-lg">{acc.emoji}</span>
          )}
          {/* Level ring */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gordemy-purple to-gordemy-blue text-white text-xs font-black px-4 py-1 rounded-full shadow-lg border border-purple-400/40">
            LVL {student.level || 1}
          </div>
        </div>
      </motion.div>

      {/* Name + Title */}
      <div className="text-center z-10 mt-2">
        <h1 className="text-lg font-extrabold text-white tracking-wide">{student.name || "Учень"}</h1>
        <div className={`text-xs font-bold mt-0.5 ${title.color}`}>{title.title}</div>
      </div>

      {/* XP Bar */}
      <div className="w-full max-w-xs mt-4 z-10">
        <div className="flex justify-between text-[10px] text-gordemy-muted mb-1">
          <span>XP до {student.level || 1 + 1} рівня</span>
          <span>{xpProgress}/100</span>
        </div>
        <div className="h-2 rounded-full bg-gordemy-card border border-gordemy-border overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-gordemy-purple to-gordemy-blue"
          />
        </div>
      </div>

      {/* ── 3 Equipment Slots ── */}
      <div className="w-full max-w-xs mt-4 z-10">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gordemy-muted mb-2 text-center">
          ⚔️ Екіпіровка
        </div>
        <div className="grid grid-cols-3 gap-2">
          {/* Weapon slot */}
          <Link href="/avatar">
            <motion.div
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className="flex flex-col items-center gap-1 rounded-2xl border border-gordemy-border bg-gordemy-card p-2.5 cursor-pointer hover:border-gordemy-blue/50 transition-colors"
            >
              <motion.span
                className="text-2xl"
                animate={{ rotate: [-8, 8, -8] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              >
                {acc && acc.id !== "none" ? acc.emoji : "⚔️"}
              </motion.span>
              <span className="text-[9px] font-bold text-gordemy-muted uppercase tracking-wide">Зброя</span>
            </motion.div>
          </Link>

          {/* Aura slot */}
          <Link href="/avatar">
            <motion.div
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className="flex flex-col items-center gap-1 rounded-2xl border border-gordemy-border bg-gordemy-card p-2.5 cursor-pointer hover:border-gordemy-purple/50 transition-colors"
            >
              <motion.span
                className="text-2xl"
                animate={{ scale: [1, 1.18, 1], opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              >
                {avatar.aura && avatar.aura !== "none" ? "✨" : "🌀"}
              </motion.span>
              <span className="text-[9px] font-bold text-gordemy-muted uppercase tracking-wide">Аура</span>
            </motion.div>
          </Link>

          {/* Title slot */}
          <Link href="/avatar">
            <motion.div
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className="flex flex-col items-center gap-1 rounded-2xl border border-gordemy-border bg-gordemy-card p-2.5 cursor-pointer hover:border-yellow-500/50 transition-colors"
            >
              <motion.span
                className="text-2xl"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                {hat && hat.id !== "none" ? hat.emoji : "👑"}
              </motion.span>
              <span className="text-[9px] font-bold text-gordemy-muted uppercase tracking-wide">Титул</span>
            </motion.div>
          </Link>
        </div>
      </div>

      {/* Avatar link */}
      <Link href="/avatar" className="mt-3 z-10">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-xs text-gordemy-muted hover:text-gordemy-blue border border-gordemy-border hover:border-gordemy-blue/50 px-3 py-1 rounded-xl transition-all"
        >
          🎨 Змінити екіпіровку
        </motion.button>
      </Link>
    </div>
  );
}

// ─── ChestInventory ──────────────────────────────────────────────────────────

function ChestInventory({ chests, onOpen }: {
  chests: ChestItem[];
  onOpen: (id: string) => void;
}) {
  const [timers, setTimers] = useState<Record<string, string>>({});
  const [opening, setOpening] = useState<string | null>(null);
  const [reward, setReward] = useState<{ xp: number; gems: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const t: Record<string, string> = {};
      chests.forEach(c => { t[c.id] = formatTimer(c.unlockAt); });
      setTimers(t);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [chests]);

  const handleOpen = async (chest: ChestItem) => {
    if (!isReady(chest.unlockAt) || opening) return;
    setOpening(chest.id);
    const cfg = CHEST_CFG[chest.tier];
    const xp   = Math.floor(Math.random() * (cfg.hours * 25 - cfg.hours * 10 + 1)) + cfg.hours * 10;
    const gems = Math.floor(Math.random() * (cfg.hours * 6)) ;
    setTimeout(() => {
      setReward({ xp, gems });
      onOpen(chest.id);
      setTimeout(() => { setOpening(null); setReward(null); }, 2000);
    }, 800);
  };

  const displayChests = [...chests, null, null, null].slice(0, Math.max(chests.length + 1, 3));

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gordemy-muted uppercase tracking-widest">🎁 Інвентар сундуків</h2>
        <span className="text-xs text-gordemy-muted">{chests.length} шт</span>
      </div>

      {/* Reward popup */}
      <AnimatePresence>
        {reward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -20 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-gordemy-card border-2 border-yellow-400/60 rounded-3xl px-8 py-6 text-center shadow-2xl shadow-yellow-400/20">
              <div className="text-5xl mb-3">🎉</div>
              <div className="text-white font-black text-xl">+{reward.xp} XP</div>
              {reward.gems > 0 && (
                <div className="text-yellow-300 font-bold text-lg">+{reward.gems} 💎</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {displayChests.map((chest, i) => {
          if (!chest) {
            return (
              <div
                key={`empty-${i}`}
                className="flex-shrink-0 w-20 h-28 rounded-2xl border-2 border-dashed border-gordemy-border/40 flex flex-col items-center justify-center text-gordemy-muted/30 gap-1"
              >
                <span className="text-2xl">➕</span>
                <span className="text-[9px]">Вільно</span>
              </div>
            );
          }

          const cfg = CHEST_CFG[chest.tier];
          const ready = isReady(chest.unlockAt);
          const isOpening = opening === chest.id;

          return (
            <motion.div
              key={chest.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleOpen(chest)}
              className={`flex-shrink-0 w-20 h-28 rounded-2xl border-2 ${cfg.border} bg-gradient-to-b ${cfg.color} flex flex-col items-center justify-center gap-1 relative overflow-hidden cursor-pointer shadow-lg ${cfg.glow}`}
            >
              {ready && !isOpening && (
                <motion.div
                  animate={{ opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="absolute inset-0 bg-white/15 rounded-2xl"
                />
              )}
              <AnimatePresence mode="wait">
                {isOpening ? (
                  <motion.span
                    key="opening"
                    animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.6 }}
                    className="text-4xl"
                  >
                    {cfg.emoji}
                  </motion.span>
                ) : (
                  <motion.span key="idle" className="text-4xl">{cfg.emoji}</motion.span>
                )}
              </AnimatePresence>
              <span className="text-[9px] font-bold text-white/80 text-center leading-tight px-1">{cfg.label}</span>
              <span className={`text-[9px] font-mono font-black ${ready ? "text-yellow-300" : "text-white/50"}`}>
                {ready ? "ВІДКРИТИ!" : timers[chest.id] || "..."}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DailyQuests ─────────────────────────────────────────────────────────────

function DailyQuests({ tasks, onStart }: {
  tasks: TaskWithQuestion[];
  onStart: () => void;
}) {
  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const allDone = completed === total && total > 0;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gordemy-muted uppercase tracking-widest">📋 Денні квести</h2>
        <span className={`text-xs font-bold ${allDone ? "text-gordemy-green" : "text-gordemy-muted"}`}>
          {completed}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-gordemy-card border border-gordemy-border mb-3 overflow-hidden">
        <motion.div
          animate={{ width: total > 0 ? `${(completed / total) * 100}%` : "0%" }}
          transition={{ duration: 0.5 }}
          className="h-full bg-gradient-to-r from-gordemy-green to-gordemy-blue rounded-full"
        />
      </div>

      <div className="space-y-2">
        {tasks.length === 0 && (
          <div className="text-center py-6 text-gordemy-muted text-sm">
            Завдань ще немає. Зачекай трохи...
          </div>
        )}
        {tasks.map((task, i) => {
          const subjectEmojis: Record<string, string> = {
            ukr: "🇺🇦", math: "📐", hist: "📜", eng: "🌍",
            bio: "🧬", phys: "⚡", chem: "🧪", geo: "🗺️",
          };
          const emoji = subjectEmojis[task.subject] || "📚";
          const diffColors: Record<string, string> = {
            easy:   "text-gordemy-green  bg-gordemy-green/10  border-gordemy-green/30",
            medium: "text-gordemy-blue   bg-gordemy-blue/10   border-gordemy-blue/30",
            hard:   "text-gordemy-orange bg-gordemy-orange/10 border-gordemy-orange/30",
          };
          const diffLabels: Record<string, string> = { easy: "Легко", medium: "Середньо", hard: "Важко" };

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                task.completed
                  ? "bg-gordemy-green/5 border-gordemy-green/20 opacity-60"
                  : "bg-gordemy-card border-gordemy-border"
              }`}
            >
              {/* Checkbox */}
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                task.completed ? "bg-gordemy-green border-gordemy-green" : "border-gordemy-border"
              }`}>
                {task.completed && <span className="text-xs">✓</span>}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">{emoji}</span>
                  <span className="text-white text-sm font-semibold truncate">
                    {task.question?.question_text?.slice(0, 45) || "Завдання"}...
                  </span>
                </div>
                <div className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${diffColors[task.difficulty] || diffColors.medium}`}>
                  {diffLabels[task.difficulty] || task.difficulty}
                </div>
              </div>

              {/* XP reward */}
              {!task.completed && (
                <div className="text-xs font-bold text-gordemy-purple flex-shrink-0">+{task.xp_reward || 10} XP</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Play button */}
      {!allDone && tasks.length > 0 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="w-full mt-4 py-4 rounded-2xl bg-gradient-to-r from-gordemy-purple to-gordemy-blue text-white font-black text-base tracking-wide shadow-lg shadow-purple-500/30 relative overflow-hidden"
        >
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
          ▶ ПОЧАТИ КВЕСТИ
        </motion.button>
      )}

      {allDone && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full mt-4 py-4 rounded-2xl bg-gordemy-green/10 border border-gordemy-green/30 text-gordemy-green font-black text-base text-center"
        >
          🏆 Всі квести виконано!
        </motion.div>
      )}
    </div>
  );
}

// ─── GameModeGrid ────────────────────────────────────────────────────────────

function GameModeGrid({ bossDaily, bossWeekly }: { bossDaily: boolean; bossWeekly: boolean }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-bold text-gordemy-muted uppercase tracking-widest mb-3">⚔️ Режими гри</h2>
      <div className="grid grid-cols-2 gap-3">
        {GAME_MODES.map((mode, i) => {
          const isDailyBoss   = mode.id === "boss-daily"   && bossDaily;
          const isWeeklyBoss  = mode.id === "boss-weekly"  && bossWeekly;
          const done = isDailyBoss || isWeeklyBoss;

          return (
            <Link key={mode.id} href={mode.href}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className={`relative p-4 rounded-2xl border bg-gradient-to-br ${mode.grad} ${mode.border} shadow-md overflow-hidden ${done ? "opacity-50" : ""}`}
              >
                {/* Shimmer */}
                {!done && (
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.5, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
                  />
                )}

                {/* Badge */}
                {mode.badge && !done && (
                  <span className={`absolute top-2 right-2 text-[9px] font-black text-white px-1.5 py-0.5 rounded-full ${mode.badgeColor}`}>
                    {mode.badge}
                  </span>
                )}
                {done && (
                  <span className="absolute top-2 right-2 text-[9px] font-black text-gordemy-green border border-gordemy-green/40 px-1.5 py-0.5 rounded-full bg-gordemy-green/10">
                    ✓ DONE
                  </span>
                )}

                <div className="text-3xl mb-2">{mode.emoji}</div>
                <div className="text-white font-extrabold text-sm leading-tight">{mode.label}</div>
                <div className="text-gordemy-muted text-[11px] mt-0.5">{mode.sub}</div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [student, setStudent] = useState<(Student & {
    gems?: number; streak?: number; level?: number; xp?: number;
    avatar_data?: AvatarData;
    chest_inventory?: ChestItem[];
    boss_daily_done?: boolean; boss_daily_reset?: string;
    boss_weekly_done?: boolean; boss_weekly_reset?: string;
  }) | null>(null);
  const [tasks, setTasks]   = useState<TaskWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Load everything
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [st, allTasks] = await Promise.all([
        getStudent(user.id),
        getTodayTasks(user.id),
      ]);
      if (!st) { router.replace("/onboarding"); return; }

      // Generate if empty
      let finalTasks = allTasks;
      if (allTasks.length === 0) {
        await generateDailyTasks(user.id, (st as any).subjects || ["ukr", "math"]);
        finalTasks = await getTodayTasks(user.id);
      }

      // Limit to 3 quests
      finalTasks = finalTasks.slice(0, 3);

      const s = st as any;

      setStudent(s);
      setTasks(finalTasks);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
    else if (user) load();
  }, [user, authLoading, load, router]);

  // Open chest
  const handleOpenChest = useCallback(async (chestId: string) => {
    if (!user || !student) return;
    const chest = (student.chest_inventory || []).find(c => c.id === chestId);
    if (!chest) return;

    const cfg = CHEST_CFG[chest.tier];
    const xpGain   = Math.floor(Math.random() * cfg.hours * 15) + cfg.hours * 8;
    const gemsGain  = Math.floor(Math.random() * cfg.hours * 4);

    // Mark as opened + grant rewards
    const newInventory = (student.chest_inventory || []).filter(c => c.id !== chestId);
    await supabase.from("students")
      .update({
        chest_inventory: newInventory,
        xp:   (student.xp   || 0) + xpGain,
        gems: (student.gems || 0) + gemsGain,
      })
      .eq("id", user.id);

    setStudent(prev => prev ? {
      ...prev,
      chest_inventory: newInventory,
      xp:   (prev.xp   || 0) + xpGain,
      gems: (prev.gems || 0) + gemsGain,
    } : prev);
  }, [user, student]);

  // Start quests from the first incomplete daily task
  const handleStart = () => {
    const nextTask = tasks.find(t => !t.completed);
    if (!nextTask) return;
    router.push(`/learn?task=${nextTask.id}`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-full border-4 border-gordemy-purple border-t-transparent"
        />
      </div>
    );
  }

  if (!student) return null;

  const avatar: AvatarData = {
    ...DEFAULT_AVATAR,
    ...(student.avatar_data || {}),
  };

  const chests = (student.chest_inventory || []).filter(c => !c.opened);
  const playerTitle = getPlayerTitle(student.level || 1, (student as any).total_tasks_completed || 0, student.streak || 0);
  const today = new Date().toISOString().split("T")[0];
  const bossDaily  = student.boss_daily_reset === today;
  const bossWeekly = student.boss_weekly_reset === today;

  return (
    <div className="max-w-[480px] mx-auto px-4 py-6 pb-24">
      {/* Character Stage */}
      <CharacterStage avatar={avatar} student={student} title={playerTitle} />

      <div className="mt-6">
        {/* Chest Inventory */}
        <ChestInventory chests={chests} onOpen={handleOpenChest} />

        {/* Daily Quests */}
        <DailyQuests tasks={tasks} onStart={handleStart} />

        {/* Game Mode Grid */}
        <GameModeGrid bossDaily={bossDaily} bossWeekly={bossWeekly} />

        {/* Quick links */}
        <div className="flex gap-3 flex-wrap">
          <Link href="/leaderboard" className="flex-1">
            <motion.div whileTap={{ scale: 0.95 }} className="p-3 rounded-2xl border border-gordemy-border bg-gordemy-card text-center">
              <div className="text-xl">🏆</div>
              <div className="text-xs text-gordemy-muted mt-1">Рейтинг</div>
            </motion.div>
          </Link>
          <Link href="/achievements" className="flex-1">
            <motion.div whileTap={{ scale: 0.95 }} className="p-3 rounded-2xl border border-gordemy-border bg-gordemy-card text-center">
              <div className="text-xl">🎖️</div>
              <div className="text-xs text-gordemy-muted mt-1">Досягнення</div>
            </motion.div>
          </Link>
          <Link href="/avatar" className="flex-1">
            <motion.div whileTap={{ scale: 0.95 }} className="p-3 rounded-2xl border border-gordemy-border bg-gordemy-card text-center">
              <div className="text-xl">🎨</div>
              <div className="text-xs text-gordemy-muted mt-1">Аватар</div>
            </motion.div>
          </Link>
          <Link href="/clan" className="flex-1">
            <motion.div whileTap={{ scale: 0.95 }} className="p-3 rounded-2xl border border-gordemy-border bg-gordemy-card text-center">
              <div className="text-xl">🏘️</div>
              <div className="text-xs text-gordemy-muted mt-1">Клан</div>
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
}
